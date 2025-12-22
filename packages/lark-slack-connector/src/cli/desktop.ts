#!/usr/bin/env node
/**
 * Desktop App Bridge Server
 *
 * This CLI is designed to be spawned by the Tauri desktop app.
 * It reads config from stdin and outputs status updates to stdout.
 *
 * Protocol:
 * - Input (stdin): JSON config object
 * - Output (stdout): JSON status updates prefixed with "STATUS:" or "LOG:"
 */

import { BridgeServer } from '../server';
import { BridgeConfig, BridgeStatus } from '../types';

interface MuteTimeRange {
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface NotificationSettings {
  soundEnabled: boolean;
  desktopEnabled: boolean;
}

interface DesktopConfig {
  slackBotToken: string;
  slackAppToken: string;
  slackSigningSecret?: string;
  slackUserToken?: string; // For sending as user (松井大樹)
  larkWebhookUrl: string;
  larkAppId?: string;
  larkAppSecret?: string;
  serverPort?: number;
  // Bidirectional settings
  sendAsUser?: boolean; // Send messages as user instead of bot
  defaultSlackChannel?: string; // Default channel for Lark→Slack
  // Channel filter settings (Slack → Lark)
  watchChannelIds?: string[]; // Only forward messages from these channels
  // Notification filter settings
  muteTimeRange?: MuteTimeRange;
  excludeKeywords?: string[];
  excludeUserIds?: string[];
  notificationSettings?: NotificationSettings;
}

function sendStatus(status: BridgeStatus): void {
  const output = {
    type: 'status',
    data: {
      isRunning: status.isRunning,
      slackConnected: status.slackConnected,
      larkConnected: status.larkConnected,
      messageStats: status.messageStats,
    },
  };
  console.log(`STATUS:${JSON.stringify(output)}`);
}

function sendLog(level: string, message: string): void {
  console.log(`LOG:${JSON.stringify({ level, message, timestamp: new Date().toISOString() })}`);
}

function sendError(error: string): void {
  console.log(`ERROR:${JSON.stringify({ error, timestamp: new Date().toISOString() })}`);
}

function sendReady(port: number): void {
  console.log(`READY:${JSON.stringify({ port })}`);
}

async function readConfig(): Promise<DesktopConfig> {
  // Check for config in command line args
  const configArg = process.argv.find(arg => arg.startsWith('--config='));
  if (configArg) {
    const configJson = configArg.slice('--config='.length);
    return JSON.parse(configJson);
  }

  // Check for config file path
  const configFileArg = process.argv.find(arg => arg.startsWith('--config-file='));
  if (configFileArg) {
    const configPath = configFileArg.slice('--config-file='.length);
    const fs = await import('fs');
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  }

  // Read from stdin
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error(`Invalid JSON config: ${e}`));
      }
    });
    process.stdin.on('error', reject);

    // Timeout if no stdin data
    setTimeout(() => {
      if (!data) {
        reject(new Error('No config provided. Use --config=JSON or --config-file=PATH'));
      }
    }, 5000);
  });
}

function createBridgeConfig(desktop: DesktopConfig): BridgeConfig {
  return {
    slack: {
      workspaces: [
        {
          id: 'default',
          name: 'Default Workspace',
          botToken: desktop.slackBotToken,
          signingSecret: desktop.slackSigningSecret || 'dummy-signing-secret',
          appToken: desktop.slackAppToken,
          userToken: desktop.slackUserToken,
        },
      ],
      socketMode: true,
    },
    lark: {
      webhookUrl: desktop.larkWebhookUrl,
      appId: desktop.larkAppId,
      appSecret: desktop.larkAppSecret,
    },
    // Sender configuration for bidirectional messaging
    sender: {
      sendAsUser: desktop.sendAsUser ?? true, // Default to sending as user
      slackUserToken: desktop.slackUserToken,
    },
    // Channel filters (Slack → Lark)
    filters: {
      includeChannels: desktop.watchChannelIds && desktop.watchChannelIds.length > 0 ? desktop.watchChannelIds : undefined,
      excludeKeywords: desktop.excludeKeywords,
      excludeUserIds: desktop.excludeUserIds,
      muteTimeRange: desktop.muteTimeRange,
    },
    // Notification settings
    notificationSettings: desktop.notificationSettings,
    options: {
      includeChannelName: true,
      includeUserName: true,
      includeTimestamp: true,
      timezone: 'Asia/Tokyo',
      includeThreadReplies: true,
      slackConnectPolling: false,
      pollingIntervalMs: 5000,
      defaultSlackChannel: desktop.defaultSlackChannel,
      maxRetries: 3,
      retryDelayMs: 1000,
      logLevel: 'info',
    },
  };
}

async function main(): Promise<void> {
  sendLog('info', 'デスクトップブリッジサーバー起動中...');

  let config: DesktopConfig;
  try {
    config = await readConfig();
  } catch (error) {
    sendError(`設定読み込みエラー: ${error}`);
    process.exit(1);
  }

  // Validate config
  if (!config.slackBotToken || !config.slackAppToken) {
    sendError('Slackトークンが設定されていません');
    process.exit(1);
  }
  if (!config.larkWebhookUrl) {
    sendError('Lark Webhook URLが設定されていません');
    process.exit(1);
  }

  const bridgeConfig = createBridgeConfig(config);
  const port = config.serverPort || 3456;

  try {
    const server = new BridgeServer(bridgeConfig, { port }, {
      onStatusChange: sendStatus,
      onLog: sendLog,
      onError: (err) => sendError(err.message),
    });

    // Handle shutdown signals
    const shutdown = async () => {
      sendLog('info', 'シャットダウン中...');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGHUP', shutdown);

    // Start the server
    await server.start();

    sendReady(port);
    sendLog('info', `ブリッジサーバー起動完了 (port: ${port})`);

    // Keep process running
    await new Promise(() => {});
  } catch (error) {
    sendError(`起動エラー: ${error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  sendError(`致命的エラー: ${error}`);
  process.exit(1);
});
