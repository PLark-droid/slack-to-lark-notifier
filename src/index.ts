import 'dotenv/config';
import { loadConfig, validateConfig } from './config.js';
import { MultiWorkspaceApp } from './multi-workspace-app.js';

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

  // Multi-Workspace Appを初期化
  const app = new MultiWorkspaceApp(config);
  await app.initialize();

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
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
