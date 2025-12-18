import 'dotenv/config';
import { loadConfig, validateConfig } from './config.js';
import { MultiWorkspaceApp } from './multi-workspace-app.js';
import { LarkReceiver } from './lark-receiver.js';
import { SlackSender } from './slack-sender.js';

async function main(): Promise<void> {
  console.log('🚀 Starting Slack to Lark Notifier...');

  // 設定を読み込み
  const config = loadConfig();

  // 設定を検証
  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error('❌ 設定エラー:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`📋 設定読み込み完了:`);
  console.log(`   - Workspace数: ${config.workspaces.length}`);
  console.log(`   - 共有チャンネル監視: ${config.channelFilter.includeSharedChannels ? '有効' : '無効'}`);
  console.log(`   - Lark→Slack双方向: ${config.larkApp.enabled ? '有効' : '無効'}`);

  // Multi-Workspace Appを初期化
  const app = new MultiWorkspaceApp(config);
  await app.initialize();

  // Lark Receiver初期化（有効な場合）
  let larkReceiver: LarkReceiver | undefined;
  if (config.larkApp.enabled && config.workspaces.length > 0) {
    const primaryWorkspace = app.getWorkspaceApps()[0];
    const slackSender = new SlackSender(primaryWorkspace.app.client);

    larkReceiver = new LarkReceiver(
      {
        appId: config.larkApp.appId,
        appSecret: config.larkApp.appSecret,
        verificationToken: config.larkApp.verificationToken,
        encryptKey: config.larkApp.encryptKey,
        defaultSlackChannel: config.larkApp.defaultSlackChannel,
        channelMapping: config.larkApp.channelMapping,
      },
      slackSender
    );
  }

  // シャットダウンハンドラ
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n📴 ${signal} received. Shutting down...`);
    await app.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // 起動
  await app.start();

  // Lark Receiver起動（有効な場合）
  if (larkReceiver) {
    await larkReceiver.start(config.larkReceiverPort);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
