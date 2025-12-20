import { BridgeConfig, BridgeConfigSchema } from '../types';

/**
 * Parse and validate bridge configuration
 */
export function parseConfig(config: unknown): BridgeConfig {
  return BridgeConfigSchema.parse(config);
}

/**
 * Create configuration from environment variables
 */
export function configFromEnv(): BridgeConfig {
  const workspaces = [];

  // Primary workspace
  if (process.env.SLACK_BOT_TOKEN) {
    workspaces.push({
      id: process.env.SLACK_WORKSPACE_ID,
      name: process.env.SLACK_WORKSPACE_NAME,
      botToken: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      appToken: process.env.SLACK_APP_TOKEN,
      userToken: process.env.SLACK_USER_TOKEN,
    });
  }

  // Additional workspaces (2-10)
  for (let i = 2; i <= 10; i++) {
    const botToken = process.env[`SLACK_WORKSPACE_${i}_BOT_TOKEN`];
    if (botToken) {
      workspaces.push({
        id: process.env[`SLACK_WORKSPACE_${i}_ID`],
        name: process.env[`SLACK_WORKSPACE_${i}_NAME`],
        botToken,
        signingSecret: process.env[`SLACK_WORKSPACE_${i}_SIGNING_SECRET`] || '',
        appToken: process.env[`SLACK_WORKSPACE_${i}_APP_TOKEN`],
        userToken: process.env[`SLACK_WORKSPACE_${i}_USER_TOKEN`],
      });
    }
  }

  const config: BridgeConfig = {
    slack: {
      workspaces,
      socketMode: process.env.SLACK_SOCKET_MODE !== 'false',
    },
    lark: {
      webhookUrl: process.env.LARK_WEBHOOK_URL,
      appId: process.env.LARK_APP_ID,
      appSecret: process.env.LARK_APP_SECRET,
      verificationToken: process.env.LARK_VERIFICATION_TOKEN,
      encryptKey: process.env.LARK_ENCRYPT_KEY,
    },
    options: {
      includeChannelName: process.env.INCLUDE_CHANNEL_NAME !== 'false',
      includeUserName: process.env.INCLUDE_USER_NAME !== 'false',
      includeTimestamp: process.env.INCLUDE_TIMESTAMP !== 'false',
      timezone: process.env.TIMEZONE || 'Asia/Tokyo',
      includeThreadReplies: process.env.INCLUDE_THREAD_REPLIES !== 'false',
      slackConnectPolling: process.env.SLACK_CONNECT_POLLING === 'true',
      pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '5000', 10),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
      retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
      logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    },
  };

  // Parse channel mappings from JSON
  if (process.env.CHANNEL_MAPPINGS) {
    try {
      config.channelMappings = JSON.parse(process.env.CHANNEL_MAPPINGS);
    } catch {
      // Ignore parse errors
    }
  }

  // Parse filters from environment
  if (process.env.INCLUDE_CHANNELS) {
    config.filters = {
      ...config.filters,
      includeChannels: process.env.INCLUDE_CHANNELS.split(',').map(s => s.trim()),
    };
  }
  if (process.env.EXCLUDE_CHANNELS) {
    config.filters = {
      ...config.filters,
      excludeChannels: process.env.EXCLUDE_CHANNELS.split(',').map(s => s.trim()),
    };
  }

  return parseConfig(config);
}

/**
 * Validate configuration
 */
export function validateConfig(config: BridgeConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check Slack configuration
  if (!config.slack.workspaces.length) {
    errors.push('At least one Slack workspace is required');
  }

  for (const ws of config.slack.workspaces) {
    if (!ws.botToken) {
      errors.push(`Slack workspace ${ws.name || ws.id || 'unknown'}: Bot token is required`);
    }
    if (config.slack.socketMode && !ws.appToken) {
      errors.push(`Slack workspace ${ws.name || ws.id || 'unknown'}: App token is required for Socket Mode`);
    }
  }

  // Check Lark configuration
  if (!config.lark.webhookUrl && !config.lark.appId) {
    errors.push('Lark webhook URL or App ID is required');
  }

  if (config.lark.appId && !config.lark.appSecret) {
    errors.push('Lark App Secret is required when using App ID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
