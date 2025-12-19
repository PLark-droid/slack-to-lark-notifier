#!/usr/bin/env node
import { startSetupServer } from './setup-ui/index.js';

const port = parseInt(process.env.SETUP_PORT || '3002', 10);

startSetupServer(port).catch((error) => {
  console.error('セットアップサーバーの起動に失敗しました:', error);
  process.exit(1);
});
