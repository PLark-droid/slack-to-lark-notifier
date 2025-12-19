import express, { Request, Response, Router } from 'express';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SetupConfig {
  slack: {
    botToken: string;
    signingSecret: string;
    appToken: string;
    workspaceName: string;
    userToken?: string;
    connectChannelIds?: string;
  };
  lark: {
    webhookUrl: string;
    receiverEnabled: boolean;
    appId?: string;
    appSecret?: string;
    verificationToken?: string;
    encryptKey?: string;
    defaultSlackChannel?: string;
  };
  server: {
    port: number;
    larkReceiverPort: number;
  };
}

export function createSetupRouter(): Router {
  const router = Router();

  // 静的ファイル配信
  router.use('/static', express.static(path.join(__dirname, 'public')));

  // セットアップウィザードHTML
  router.get('/', (_req: Request, res: Response) => {
    res.send(getSetupWizardHTML());
  });

  // ダッシュボード
  router.get('/dashboard', (_req: Request, res: Response) => {
    res.send(getDashboardHTML());
  });

  // 現在の設定を取得
  router.get('/api/config', async (_req: Request, res: Response) => {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (existsSync(envPath)) {
        const envContent = await readFile(envPath, 'utf-8');
        const config = parseEnvToConfig(envContent);
        res.json({ success: true, config, exists: true });
      } else {
        res.json({ success: true, config: null, exists: false });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // 設定を保存
  router.post('/api/config', express.json(), async (req: Request, res: Response) => {
    try {
      const config: SetupConfig = req.body;
      const envContent = configToEnv(config);
      const envPath = path.join(process.cwd(), '.env');

      await writeFile(envPath, envContent, 'utf-8');
      res.json({ success: true, message: '.env ファイルを保存しました' });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // 設定の検証
  router.post('/api/validate', express.json(), async (req: Request, res: Response) => {
    try {
      const config: SetupConfig = req.body;
      const errors = validateSetupConfig(config);

      if (errors.length > 0) {
        res.json({ success: false, errors });
      } else {
        res.json({ success: true, message: '設定は有効です' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Slack接続テスト
  router.post('/api/test/slack', express.json(), async (req: Request, res: Response) => {
    try {
      const { botToken } = req.body;
      if (!botToken) {
        res.json({ success: false, error: 'Bot Token が必要です' });
        return;
      }

      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = (await response.json()) as { ok: boolean; team?: string; user?: string; error?: string };
      if (data.ok) {
        res.json({
          success: true,
          message: `Slack接続成功: ${data.team} (${data.user})`,
          team: data.team,
          user: data.user,
        });
      } else {
        res.json({ success: false, error: `Slack接続エラー: ${data.error}` });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Lark Webhook テスト
  router.post('/api/test/lark', express.json(), async (req: Request, res: Response) => {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl) {
        res.json({ success: false, error: 'Webhook URL が必要です' });
        return;
      }

      // URL形式の検証
      if (!webhookUrl.includes('larksuite.com') && !webhookUrl.includes('feishu.cn')) {
        res.json({ success: false, error: 'Webhook URLは有効なLark/FeishuのURLである必要があります' });
        return;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: { text: '🎉 slack-to-lark-notifier セットアップテスト成功!' },
        }),
      });

      // レスポンスのContent-Typeを確認
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        res.json({ success: false, error: `Lark Webhook エラー: 無効なレスポンス (${response.status}): ${text.slice(0, 200)}` });
        return;
      }

      const data = (await response.json()) as { code?: number; StatusCode?: number; msg?: string };
      if (data.code === 0 || data.StatusCode === 0) {
        res.json({ success: true, message: 'Lark Webhook テスト成功！メッセージを確認してください' });
      } else {
        res.json({ success: false, error: `Lark Webhook エラー: ${data.msg || JSON.stringify(data)}` });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: `接続エラー: ${String(error)}` });
    }
  });

  // ステータス取得（ダッシュボード用）
  router.get('/api/status', async (_req: Request, res: Response) => {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const configured = existsSync(envPath);

      let slackConnected = false;
      let larkConnected = false;
      let config: Partial<SetupConfig> | null = null;

      if (configured) {
        const envContent = await readFile(envPath, 'utf-8');
        config = parseEnvToConfig(envContent);

        // Slack接続チェック
        if (config.slack?.botToken) {
          try {
            const slackRes = await fetch('https://slack.com/api/auth.test', {
              method: 'POST',
              headers: { Authorization: `Bearer ${config.slack.botToken}` },
            });
            const slackData = (await slackRes.json()) as { ok: boolean };
            slackConnected = slackData.ok;
          } catch {
            slackConnected = false;
          }
        }

        // Lark接続は設定があれば接続済みとみなす
        larkConnected = !!config.lark?.webhookUrl;
      }

      res.json({
        success: true,
        status: {
          configured,
          slackConnected,
          larkConnected,
          workspaceName: config?.slack?.workspaceName || 'Unknown',
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  return router;
}

function parseEnvToConfig(envContent: string): Partial<SetupConfig> {
  const lines = envContent.split('\n');
  const env: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }

  return {
    slack: {
      botToken: env['SLACK_BOT_TOKEN'] || '',
      signingSecret: env['SLACK_SIGNING_SECRET'] || '',
      appToken: env['SLACK_APP_TOKEN'] || '',
      workspaceName: env['SLACK_WORKSPACE_NAME'] || '',
      userToken: env['SLACK_USER_TOKEN'],
      connectChannelIds: env['SLACK_CONNECT_CHANNEL_IDS'],
    },
    lark: {
      webhookUrl: env['LARK_WEBHOOK_URL'] || '',
      receiverEnabled: env['LARK_RECEIVER_ENABLED'] === 'true',
      appId: env['LARK_APP_ID'],
      appSecret: env['LARK_APP_SECRET'],
      verificationToken: env['LARK_VERIFICATION_TOKEN'],
      encryptKey: env['LARK_ENCRYPT_KEY'],
      defaultSlackChannel: env['LARK_DEFAULT_SLACK_CHANNEL'],
    },
    server: {
      port: parseInt(env['PORT'] || '3000', 10),
      larkReceiverPort: parseInt(env['LARK_RECEIVER_PORT'] || '3001', 10),
    },
  };
}

function configToEnv(config: SetupConfig): string {
  const lines: string[] = [
    '# ============================================',
    '# Slack Workspace設定',
    '# Generated by Setup Wizard',
    '# ============================================',
    `SLACK_BOT_TOKEN=${config.slack.botToken}`,
    `SLACK_SIGNING_SECRET=${config.slack.signingSecret}`,
    `SLACK_APP_TOKEN=${config.slack.appToken}`,
    `SLACK_WORKSPACE_NAME=${config.slack.workspaceName}`,
  ];

  // Slack Connect設定（オプション）
  if (config.slack.userToken) {
    lines.push(`SLACK_USER_TOKEN=${config.slack.userToken}`);
  }
  if (config.slack.connectChannelIds) {
    lines.push('');
    lines.push('# ============================================');
    lines.push('# Slack Connect ポーリング設定');
    lines.push('# ============================================');
    lines.push(`SLACK_CONNECT_CHANNEL_IDS=${config.slack.connectChannelIds}`);
    lines.push('SLACK_CONNECT_POLLING_INTERVAL=5000');
  }

  lines.push('');
  lines.push('# ============================================');
  lines.push('# チャンネルフィルター設定');
  lines.push('# ============================================');
  lines.push('INCLUDE_SHARED_CHANNELS=true');
  lines.push('');
  lines.push('# ============================================');
  lines.push('# Lark設定');
  lines.push('# ============================================');
  lines.push(`LARK_WEBHOOK_URL=${config.lark.webhookUrl}`);
  lines.push('');
  lines.push('# Lark→Slack双方向通信設定');
  lines.push(`LARK_RECEIVER_ENABLED=${config.lark.receiverEnabled}`);

  if (config.lark.receiverEnabled) {
    lines.push(`LARK_APP_ID=${config.lark.appId || ''}`);
    lines.push(`LARK_APP_SECRET=${config.lark.appSecret || ''}`);
    lines.push(`LARK_VERIFICATION_TOKEN=${config.lark.verificationToken || ''}`);
    if (config.lark.encryptKey) {
      lines.push(`LARK_ENCRYPT_KEY=${config.lark.encryptKey}`);
    }
    if (config.lark.defaultSlackChannel) {
      lines.push(`LARK_DEFAULT_SLACK_CHANNEL=${config.lark.defaultSlackChannel}`);
    }
  }

  lines.push('');
  lines.push('# ============================================');
  lines.push('# サーバー設定');
  lines.push('# ============================================');
  lines.push(`PORT=${config.server.port}`);
  lines.push(`LARK_RECEIVER_PORT=${config.server.larkReceiverPort}`);
  lines.push('');

  return lines.join('\n');
}

function validateSetupConfig(config: SetupConfig): string[] {
  const errors: string[] = [];

  // Slack 設定チェック
  if (!config.slack.botToken) {
    errors.push('Slack Bot Token は必須です');
  } else if (!config.slack.botToken.startsWith('xoxb-')) {
    errors.push('Slack Bot Token は "xoxb-" で始まる必要があります');
  }

  if (!config.slack.signingSecret) {
    errors.push('Slack Signing Secret は必須です');
  }

  if (!config.slack.appToken) {
    errors.push('Slack App Token は必須です');
  } else if (!config.slack.appToken.startsWith('xapp-')) {
    errors.push('Slack App Token は "xapp-" で始まる必要があります');
  }

  // Lark 設定チェック
  if (!config.lark.webhookUrl) {
    errors.push('Lark Webhook URL は必須です');
  } else if (!config.lark.webhookUrl.includes('larksuite.com') && !config.lark.webhookUrl.includes('feishu.cn')) {
    errors.push('Lark Webhook URL は有効なLark/Feishu URLである必要があります');
  }

  // 双方向通信が有効な場合
  if (config.lark.receiverEnabled) {
    if (!config.lark.appId) {
      errors.push('Lark App ID は双方向通信時に必須です');
    }
    if (!config.lark.verificationToken) {
      errors.push('Lark Verification Token は双方向通信時に必須です');
    }
  }

  return errors;
}

function getSetupWizardHTML(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slack to Lark Notifier - セットアップ</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Sans', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 80px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4A154B 0%, #611f69 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; font-size: 16px; }
    .header .badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      margin-top: 15px;
    }
    .wizard { padding: 40px; }

    /* Progress Steps */
    .progress-container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      position: relative;
    }
    .progress-container::before {
      content: '';
      position: absolute;
      top: 24px;
      left: 12%;
      right: 12%;
      height: 4px;
      background: #e0e0e0;
      z-index: 0;
    }
    .progress-bar {
      position: absolute;
      top: 24px;
      left: 12%;
      height: 4px;
      background: linear-gradient(90deg, #4A154B, #2eb67d);
      z-index: 1;
      transition: width 0.5s ease;
    }
    .step {
      text-align: center;
      position: relative;
      z-index: 2;
      flex: 1;
    }
    .step-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #e0e0e0;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
      font-size: 20px;
      transition: all 0.3s;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .step.active .step-icon { background: #4A154B; color: white; transform: scale(1.1); }
    .step.completed .step-icon { background: #2eb67d; color: white; }
    .step-label { font-size: 13px; color: #666; font-weight: 500; }
    .step.active .step-label { color: #4A154B; font-weight: 700; }
    .step.completed .step-label { color: #2eb67d; }

    /* Step Content */
    .step-content { display: none; animation: fadeIn 0.3s ease; }
    .step-content.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .step-content h2 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .step-content h2 .emoji { font-size: 30px; }
    .step-content .subtitle { color: #666; margin-bottom: 25px; }

    /* Guide Box */
    .guide-box {
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      border: 2px solid #e0e5ff;
      border-radius: 16px;
      padding: 25px;
      margin-bottom: 25px;
    }
    .guide-box h4 {
      color: #4A154B;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
    }
    .guide-box ol { margin-left: 25px; }
    .guide-box li {
      margin-bottom: 12px;
      color: #444;
      line-height: 1.6;
    }
    .guide-box li strong { color: #4A154B; }
    .guide-box a {
      color: #4A154B;
      text-decoration: none;
      font-weight: 600;
      border-bottom: 2px solid #4A154B;
    }
    .guide-box a:hover { background: #f0e6f0; }
    .guide-box code {
      background: #e8e0e8;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 12px;
    }

    /* Expandable Section */
    .expandable {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .expandable-header {
      background: #f5f5f5;
      padding: 15px 20px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }
    .expandable-header:hover { background: #ececec; }
    .expandable-content {
      padding: 0 20px;
      max-height: 0;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .expandable.open .expandable-content {
      max-height: 1000px;
      padding: 20px;
    }
    .expandable-header .arrow { transition: transform 0.3s; }
    .expandable.open .expandable-header .arrow { transform: rotate(180deg); }

    /* Form */
    .form-group { margin-bottom: 25px; }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }
    .form-group label .required { color: #e74c3c; }
    .form-group input, .form-group select {
      width: 100%;
      padding: 14px 18px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 15px;
      transition: all 0.3s;
      font-family: inherit;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: #4A154B;
      box-shadow: 0 0 0 3px rgba(74, 21, 75, 0.1);
    }
    .form-group input.success { border-color: #2eb67d; background: #f0fff4; }
    .form-group input.error { border-color: #e74c3c; background: #fff5f5; }
    .form-group .help {
      font-size: 12px;
      color: #888;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
    }

    /* Buttons */
    .buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
      padding-top: 25px;
      border-top: 1px solid #eee;
    }
    .btn {
      padding: 14px 35px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4A154B, #611f69);
      color: white;
      box-shadow: 0 4px 15px rgba(74, 21, 75, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(74, 21, 75, 0.4);
    }
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }
    .btn-secondary:hover { background: #e0e0e0; }
    .btn-test {
      background: linear-gradient(135deg, #2eb67d, #27a06d);
      color: white;
      box-shadow: 0 4px 15px rgba(46, 182, 125, 0.3);
    }
    .btn-test:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(46, 182, 125, 0.4);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    /* Alerts */
    .alert {
      padding: 15px 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } }
    .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .alert-info { background: #e7f3ff; color: #0c5460; border: 1px solid #b6d4fe; }
    .alert-icon { font-size: 20px; }

    /* Checkbox */
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 15px;
      background: #f8f8f8;
      border-radius: 10px;
      cursor: pointer;
    }
    .checkbox-group:hover { background: #f0f0f0; }
    .checkbox-group input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
    .checkbox-group label { cursor: pointer; margin: 0; font-weight: 500; }

    /* Success Screen */
    .success-screen {
      text-align: center;
      padding: 50px 30px;
    }
    .success-icon {
      font-size: 100px;
      margin-bottom: 25px;
      animation: bounce 0.5s ease;
    }
    @keyframes bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .success-screen h2 { font-size: 28px; margin-bottom: 15px; color: #2eb67d; }
    .success-screen p { color: #666; font-size: 16px; margin-bottom: 30px; }
    .code-block {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px 25px;
      border-radius: 12px;
      font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
      font-size: 14px;
      overflow-x: auto;
      text-align: left;
      margin: 20px 0;
      line-height: 1.6;
    }
    .code-block .comment { color: #6a9955; }
    .code-block .command { color: #dcdcaa; }

    /* Tips */
    .tip {
      background: #fff8e6;
      border-left: 4px solid #f5a623;
      padding: 15px 20px;
      border-radius: 0 10px 10px 0;
      margin: 20px 0;
    }
    .tip-title { font-weight: 600; color: #b37d00; margin-bottom: 5px; }

    /* Dashboard Button */
    .dashboard-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 25px;
      background: #f0f0f0;
      border-radius: 10px;
      text-decoration: none;
      color: #333;
      font-weight: 600;
      margin-top: 20px;
      transition: all 0.3s;
    }
    .dashboard-link:hover { background: #e0e0e0; transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Slack to Lark Notifier</h1>
      <p>SlackのメッセージをLarkに自動転送 - かんたん3ステップで設定完了</p>
      <span class="badge">⏱️ 所要時間: 約5分</span>
    </div>

    <div class="wizard">
      <div class="progress-container">
        <div class="progress-bar" style="width: 0%;"></div>
        <div class="step active" data-step="1">
          <div class="step-icon">📱</div>
          <div class="step-label">Slack設定</div>
        </div>
        <div class="step" data-step="2">
          <div class="step-icon">🔗</div>
          <div class="step-label">Lark設定</div>
        </div>
        <div class="step" data-step="3">
          <div class="step-icon">✅</div>
          <div class="step-label">確認・完了</div>
        </div>
      </div>

      <div id="alert-container"></div>

      <!-- Step 1: Slack設定 -->
      <div class="step-content active" data-step="1">
        <h2><span class="emoji">📱</span> Slack Appを作成しよう</h2>
        <p class="subtitle">Slackからメッセージを受け取るためのアプリを作成します</p>

        <div class="guide-box">
          <h4>📖 Slack Appの作成手順（初めての方向け）</h4>
          <ol>
            <li><a href="https://api.slack.com/apps" target="_blank">Slack API ページ</a> を開く（別タブで開きます）</li>
            <li><strong>「Create New App」</strong> → <strong>「From scratch」</strong> をクリック</li>
            <li>App名（例: Lark Notifier）を入力し、ワークスペースを選択</li>
            <li>左メニューの <strong>「OAuth & Permissions」</strong> をクリック</li>
            <li><strong>「Bot Token Scopes」</strong> に以下を追加:
              <br><code>channels:history</code> <code>channels:read</code> <code>chat:write</code> <code>users:read</code>
            </li>
            <li><strong>「Install to Workspace」</strong> でインストール</li>
            <li><strong>「Bot User OAuth Token」</strong>（xoxb-...）をコピー</li>
            <li>左メニューの <strong>「Basic Information」</strong> で <strong>「Signing Secret」</strong> をコピー</li>
            <li>左メニューの <strong>「Socket Mode」</strong> を有効化</li>
            <li><strong>「App-Level Token」</strong> を生成（connections:write スコープ）してコピー</li>
          </ol>
        </div>

        <div class="form-group">
          <label>Bot Token <span class="required">*</span></label>
          <input type="text" id="slack-bot-token" placeholder="xoxb-xxxx-xxxx-xxxx">
          <p class="help">📍 OAuth & Permissions → Bot User OAuth Token</p>
        </div>

        <div class="form-group">
          <label>Signing Secret <span class="required">*</span></label>
          <input type="text" id="slack-signing-secret" placeholder="abc123def456ghi789jkl012mno345pq">
          <p class="help">📍 Basic Information → App Credentials → Signing Secret</p>
        </div>

        <div class="form-group">
          <label>App Token <span class="required">*</span></label>
          <input type="text" id="slack-app-token" placeholder="xapp-1-xxxx-xxxx-xxxx">
          <p class="help">📍 Basic Information → App-Level Tokens（connections:write）</p>
        </div>

        <div class="form-group">
          <label>ワークスペース名（任意）</label>
          <input type="text" id="slack-workspace-name" placeholder="My Company" value="My Workspace">
          <p class="help">📍 管理用の名前です（何でもOK）</p>
        </div>

        <button class="btn btn-test" onclick="testSlack()">🔌 Slack接続をテスト</button>

        <div class="expandable" id="advanced-slack">
          <div class="expandable-header" onclick="toggleExpand('advanced-slack')">
            <span>🔧 Slack Connect設定（上級者向け）</span>
            <span class="arrow">▼</span>
          </div>
          <div class="expandable-content">
            <div class="tip">
              <div class="tip-title">💡 Slack Connectとは？</div>
              <p>他社とのSlack共有チャンネルを監視する場合に必要です。通常は設定不要です。</p>
            </div>
            <div class="form-group">
              <label>User Token（Slack Connect用）</label>
              <input type="text" id="slack-user-token" placeholder="xoxp-xxxx-xxxx-xxxx">
              <p class="help">📍 OAuth & Permissions → User OAuth Token</p>
            </div>
            <div class="form-group">
              <label>監視するチャンネルID（カンマ区切り）</label>
              <input type="text" id="slack-connect-channels" placeholder="C01234ABCDE,C56789FGHIJ">
              <p class="help">📍 チャンネル右クリック → チャンネル詳細を表示 → チャンネルID</p>
            </div>
          </div>
        </div>

        <div class="buttons">
          <div></div>
          <button class="btn btn-primary" onclick="nextStep()">次へ進む →</button>
        </div>
      </div>

      <!-- Step 2: Lark設定 -->
      <div class="step-content" data-step="2">
        <h2><span class="emoji">🔗</span> Lark Webhookを設定しよう</h2>
        <p class="subtitle">Larkにメッセージを送信するためのWebhookを作成します</p>

        <div class="guide-box">
          <h4>📖 Lark Webhookの作成手順</h4>
          <ol>
            <li>Larkで通知を受け取りたい<strong>グループチャット</strong>を開く（なければ作成）</li>
            <li>グループ名をクリック → <strong>「設定」</strong></li>
            <li><strong>「ボット」</strong> → <strong>「ボットを追加」</strong></li>
            <li><strong>「カスタムボット」</strong> を選択</li>
            <li>ボット名（例: Slack通知）を入力して作成</li>
            <li>表示される <strong>Webhook URL</strong> をコピー</li>
          </ol>
        </div>

        <div class="form-group">
          <label>Lark Webhook URL <span class="required">*</span></label>
          <input type="text" id="lark-webhook-url" placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
          <p class="help">📍 カスタムボット作成時に表示されるURL</p>
        </div>

        <button class="btn btn-test" onclick="testLark()">🔌 Lark Webhookをテスト</button>

        <div class="expandable" id="advanced-lark">
          <div class="expandable-header" onclick="toggleExpand('advanced-lark')">
            <span>🔧 Lark→Slack双方向通信（上級者向け）</span>
            <span class="arrow">▼</span>
          </div>
          <div class="expandable-content">
            <div class="tip">
              <div class="tip-title">💡 双方向通信とは？</div>
              <p>LarkからSlackにメッセージを送信できる機能です。通常は設定不要です。</p>
            </div>
            <div class="checkbox-group" onclick="event.stopPropagation()">
              <input type="checkbox" id="lark-receiver-enabled">
              <label for="lark-receiver-enabled">双方向通信を有効にする</label>
            </div>
            <div id="lark-advanced-fields" style="display:none; margin-top: 20px;">
              <div class="form-group">
                <label>Lark App ID</label>
                <input type="text" id="lark-app-id" placeholder="cli_...">
              </div>
              <div class="form-group">
                <label>Lark App Secret</label>
                <input type="text" id="lark-app-secret" placeholder="">
              </div>
              <div class="form-group">
                <label>Lark Verification Token</label>
                <input type="text" id="lark-verification-token" placeholder="">
              </div>
            </div>
          </div>
        </div>

        <div class="buttons">
          <button class="btn btn-secondary" onclick="prevStep()">← 戻る</button>
          <button class="btn btn-primary" onclick="nextStep()">次へ進む →</button>
        </div>
      </div>

      <!-- Step 3: 確認・保存 -->
      <div class="step-content" data-step="3">
        <h2><span class="emoji">✅</span> 設定を確認して完了</h2>
        <p class="subtitle">入力内容を確認し、設定を保存します</p>

        <div class="form-row">
          <div class="form-group">
            <label>ポート番号</label>
            <input type="number" id="server-port" value="3000">
          </div>
          <div class="form-group">
            <label>Lark Receiverポート</label>
            <input type="number" id="lark-receiver-port" value="3001">
          </div>
        </div>

        <h3 style="margin: 25px 0 15px;">📋 設定プレビュー</h3>
        <div class="code-block" id="config-preview"></div>

        <div class="buttons">
          <button class="btn btn-secondary" onclick="prevStep()">← 戻る</button>
          <button class="btn btn-primary" onclick="saveConfig()">💾 設定を保存して完了</button>
        </div>
      </div>

      <!-- 完了画面 -->
      <div class="step-content" data-step="4">
        <div class="success-screen">
          <div class="success-icon">🎉</div>
          <h2>セットアップ完了！</h2>
          <p>設定ファイルの保存が完了しました。<br>以下のコマンドでアプリを起動できます。</p>
          <div class="code-block">
<span class="comment"># 開発モード（変更を自動反映）</span>
<span class="command">npm run dev</span>

<span class="comment"># 本番モード</span>
<span class="command">npm run build && npm start</span>
          </div>
          <p style="margin-top: 20px;">SlackチャンネルにメッセージがあるとLarkに通知されます 📨</p>
          <a href="/setup/dashboard" class="dashboard-link">📊 ダッシュボードを開く</a>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentStep = 1;

    document.getElementById('lark-receiver-enabled').addEventListener('change', function() {
      document.getElementById('lark-advanced-fields').style.display = this.checked ? 'block' : 'none';
    });

    function toggleExpand(id) {
      document.getElementById(id).classList.toggle('open');
    }

    function showAlert(message, type) {
      const container = document.getElementById('alert-container');
      const icons = { success: '✅', error: '❌', info: 'ℹ️' };
      container.innerHTML = '<div class="alert alert-' + type + '"><span class="alert-icon">' + icons[type] + '</span>' + message + '</div>';
      setTimeout(() => container.innerHTML = '', 6000);
    }

    function updateSteps() {
      const progressPercent = ((currentStep - 1) / 3) * 100;
      document.querySelector('.progress-bar').style.width = progressPercent + '%';

      document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        if (stepNum === currentStep) step.classList.add('active');
        if (stepNum < currentStep) step.classList.add('completed');
      });

      document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
        if (parseInt(content.dataset.step) === currentStep) {
          content.classList.add('active');
        }
      });

      if (currentStep === 3) updatePreview();
      if (currentStep === 4) document.querySelector('.progress-bar').style.width = '100%';
    }

    function getConfig() {
      return {
        slack: {
          botToken: document.getElementById('slack-bot-token').value.trim(),
          signingSecret: document.getElementById('slack-signing-secret').value.trim(),
          appToken: document.getElementById('slack-app-token').value.trim(),
          workspaceName: document.getElementById('slack-workspace-name').value.trim() || 'My Workspace',
          userToken: document.getElementById('slack-user-token').value.trim(),
          connectChannelIds: document.getElementById('slack-connect-channels').value.trim(),
        },
        lark: {
          webhookUrl: document.getElementById('lark-webhook-url').value.trim(),
          receiverEnabled: document.getElementById('lark-receiver-enabled').checked,
          appId: document.getElementById('lark-app-id').value.trim(),
          appSecret: document.getElementById('lark-app-secret').value.trim(),
          verificationToken: document.getElementById('lark-verification-token').value.trim(),
        },
        server: {
          port: parseInt(document.getElementById('server-port').value) || 3000,
          larkReceiverPort: parseInt(document.getElementById('lark-receiver-port').value) || 3001,
        }
      };
    }

    function updatePreview() {
      const config = getConfig();
      let preview = '<span class="comment"># Slack設定</span>\\n';
      preview += 'SLACK_BOT_TOKEN=' + (config.slack.botToken ? '✓ 設定済み' : '❌ 未設定') + '\\n';
      preview += 'SLACK_SIGNING_SECRET=' + (config.slack.signingSecret ? '✓ 設定済み' : '❌ 未設定') + '\\n';
      preview += 'SLACK_APP_TOKEN=' + (config.slack.appToken ? '✓ 設定済み' : '❌ 未設定') + '\\n';
      preview += 'SLACK_WORKSPACE_NAME=' + config.slack.workspaceName + '\\n';
      if (config.slack.userToken) {
        preview += 'SLACK_USER_TOKEN=✓ 設定済み\\n';
      }
      preview += '\\n<span class="comment"># Lark設定</span>\\n';
      preview += 'LARK_WEBHOOK_URL=' + (config.lark.webhookUrl ? '✓ 設定済み' : '❌ 未設定') + '\\n';
      preview += 'LARK_RECEIVER_ENABLED=' + config.lark.receiverEnabled + '\\n';
      preview += '\\n<span class="comment"># サーバー設定</span>\\n';
      preview += 'PORT=' + config.server.port + '\\n';
      preview += 'LARK_RECEIVER_PORT=' + config.server.larkReceiverPort;

      document.getElementById('config-preview').innerHTML = preview.replace(/\\\\n/g, '\\n');
    }

    function nextStep() {
      // Validation
      if (currentStep === 1) {
        const botToken = document.getElementById('slack-bot-token').value.trim();
        const signingSecret = document.getElementById('slack-signing-secret').value.trim();
        const appToken = document.getElementById('slack-app-token').value.trim();

        if (!botToken || !signingSecret || !appToken) {
          showAlert('必須項目を入力してください', 'error');
          return;
        }
        if (!botToken.startsWith('xoxb-')) {
          showAlert('Bot Tokenは xoxb- で始まる必要があります', 'error');
          return;
        }
      }
      if (currentStep === 2) {
        const webhookUrl = document.getElementById('lark-webhook-url').value.trim();
        if (!webhookUrl) {
          showAlert('Lark Webhook URLを入力してください', 'error');
          return;
        }
      }

      if (currentStep < 4) {
        currentStep++;
        updateSteps();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    function prevStep() {
      if (currentStep > 1) {
        currentStep--;
        updateSteps();
      }
    }

    async function testSlack() {
      const botToken = document.getElementById('slack-bot-token').value.trim();
      if (!botToken) {
        showAlert('Bot Tokenを入力してください', 'error');
        return;
      }

      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '🔄 テスト中...';

      try {
        const res = await fetch('/setup/api/test/slack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken })
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('slack-bot-token').classList.add('success');
          document.getElementById('slack-bot-token').classList.remove('error');
        } else {
          document.getElementById('slack-bot-token').classList.add('error');
          document.getElementById('slack-bot-token').classList.remove('success');
        }
        showAlert(data.success ? data.message : data.error, data.success ? 'success' : 'error');
      } catch (e) {
        showAlert('接続テストに失敗しました: ' + e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🔌 Slack接続をテスト';
      }
    }

    async function testLark() {
      const webhookUrl = document.getElementById('lark-webhook-url').value.trim();
      if (!webhookUrl) {
        showAlert('Webhook URLを入力してください', 'error');
        return;
      }

      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '🔄 テスト中...';

      try {
        const res = await fetch('/setup/api/test/lark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl })
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('lark-webhook-url').classList.add('success');
          document.getElementById('lark-webhook-url').classList.remove('error');
        } else {
          document.getElementById('lark-webhook-url').classList.add('error');
          document.getElementById('lark-webhook-url').classList.remove('success');
        }
        showAlert(data.success ? data.message : data.error, data.success ? 'success' : 'error');
      } catch (e) {
        showAlert('接続テストに失敗しました: ' + e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🔌 Lark Webhookをテスト';
      }
    }

    async function saveConfig() {
      const config = getConfig();
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '🔄 保存中...';

      try {
        // バリデーション
        const validateRes = await fetch('/setup/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        const validateData = await validateRes.json();

        if (!validateData.success) {
          showAlert('設定エラー: ' + validateData.errors.join(', '), 'error');
          btn.disabled = false;
          btn.textContent = '💾 設定を保存して完了';
          return;
        }

        // 保存
        const saveRes = await fetch('/setup/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        const saveData = await saveRes.json();

        if (saveData.success) {
          currentStep = 4;
          updateSteps();
        } else {
          showAlert('保存エラー: ' + saveData.error, 'error');
          btn.disabled = false;
          btn.textContent = '💾 設定を保存して完了';
        }
      } catch (e) {
        showAlert('保存に失敗しました: ' + e.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 設定を保存して完了';
      }
    }

    // 既存設定の読み込み
    async function loadExistingConfig() {
      try {
        const res = await fetch('/setup/api/config');
        const data = await res.json();

        if (data.exists && data.config) {
          const c = data.config;
          if (c.slack) {
            document.getElementById('slack-bot-token').value = c.slack.botToken || '';
            document.getElementById('slack-signing-secret').value = c.slack.signingSecret || '';
            document.getElementById('slack-app-token').value = c.slack.appToken || '';
            document.getElementById('slack-workspace-name').value = c.slack.workspaceName || '';
            document.getElementById('slack-user-token').value = c.slack.userToken || '';
            document.getElementById('slack-connect-channels').value = c.slack.connectChannelIds || '';
          }
          if (c.lark) {
            document.getElementById('lark-webhook-url').value = c.lark.webhookUrl || '';
            document.getElementById('lark-receiver-enabled').checked = c.lark.receiverEnabled || false;
            document.getElementById('lark-app-id').value = c.lark.appId || '';
            document.getElementById('lark-app-secret').value = c.lark.appSecret || '';
            document.getElementById('lark-verification-token').value = c.lark.verificationToken || '';
            if (c.lark.receiverEnabled) {
              document.getElementById('lark-advanced-fields').style.display = 'block';
            }
          }
          if (c.server) {
            document.getElementById('server-port').value = c.server.port || 3000;
            document.getElementById('lark-receiver-port').value = c.server.larkReceiverPort || 3001;
          }
          showAlert('既存の設定を読み込みました', 'info');
        }
      } catch (e) {
        console.log('設定読み込みをスキップ:', e);
      }
    }

    loadExistingConfig();
  </script>
</body>
</html>`;
}

function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slack to Lark Notifier - ダッシュボード</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Sans', sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
    }
    .navbar {
      background: linear-gradient(135deg, #4A154B 0%, #611f69 100%);
      color: white;
      padding: 15px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .navbar h1 { font-size: 20px; }
    .navbar a { color: white; text-decoration: none; opacity: 0.9; }
    .navbar a:hover { opacity: 1; }
    .container {
      max-width: 1200px;
      margin: 30px auto;
      padding: 0 20px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 25px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .card-title { font-size: 16px; color: #666; }
    .card-icon { font-size: 24px; }
    .status {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    .status-dot.green { background: #2eb67d; }
    .status-dot.red { background: #e74c3c; }
    .status-dot.yellow { background: #f5a623; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .status-text { font-size: 24px; font-weight: 700; }
    .status-label { color: #888; font-size: 14px; }
    .info-list { margin-top: 20px; }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .info-item:last-child { border-bottom: none; }
    .info-label { color: #666; }
    .info-value { font-weight: 600; }
    .actions {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }
    .btn {
      padding: 12px 25px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      transition: all 0.3s;
    }
    .btn-primary { background: #4A154B; color: white; }
    .btn-primary:hover { background: #611f69; }
    .btn-secondary { background: #e0e0e0; color: #333; }
    .btn-secondary:hover { background: #d0d0d0; }
    .section-title {
      font-size: 18px;
      margin-bottom: 15px;
      color: #333;
    }
    .code-block {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      border-radius: 12px;
      font-family: monospace;
      overflow-x: auto;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #888;
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <h1>🔔 Slack to Lark Notifier</h1>
    <a href="/setup">⚙️ 設定を変更</a>
  </nav>

  <div class="container">
    <div class="cards">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Slack 接続状態</span>
          <span class="card-icon">📱</span>
        </div>
        <div class="status">
          <div class="status-dot" id="slack-status-dot"></div>
          <div>
            <div class="status-text" id="slack-status-text">確認中...</div>
            <div class="status-label" id="slack-status-label"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Lark 接続状態</span>
          <span class="card-icon">🔗</span>
        </div>
        <div class="status">
          <div class="status-dot" id="lark-status-dot"></div>
          <div>
            <div class="status-text" id="lark-status-text">確認中...</div>
            <div class="status-label" id="lark-status-label"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">設定状態</span>
          <span class="card-icon">⚙️</span>
        </div>
        <div class="status">
          <div class="status-dot" id="config-status-dot"></div>
          <div>
            <div class="status-text" id="config-status-text">確認中...</div>
            <div class="status-label" id="config-status-label"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="section-title">🚀 クイックスタート</h2>
      <div class="code-block">
# 開発モードで起動
npm run dev

# 本番モードで起動
npm run build && npm start
      </div>
      <div class="actions" style="margin-top: 20px;">
        <a href="/setup" class="btn btn-primary">⚙️ 設定を変更</a>
        <button class="btn btn-secondary" onclick="refreshStatus()">🔄 ステータス更新</button>
      </div>
    </div>
  </div>

  <script>
    async function loadStatus() {
      try {
        const res = await fetch('/setup/api/status');
        const data = await res.json();

        if (data.success) {
          const s = data.status;

          // Slack
          const slackDot = document.getElementById('slack-status-dot');
          const slackText = document.getElementById('slack-status-text');
          const slackLabel = document.getElementById('slack-status-label');
          slackDot.className = 'status-dot ' + (s.slackConnected ? 'green' : 'red');
          slackText.textContent = s.slackConnected ? '接続済み' : '未接続';
          slackLabel.textContent = s.workspaceName || '';

          // Lark
          const larkDot = document.getElementById('lark-status-dot');
          const larkText = document.getElementById('lark-status-text');
          larkDot.className = 'status-dot ' + (s.larkConnected ? 'green' : 'red');
          larkText.textContent = s.larkConnected ? '設定済み' : '未設定';

          // Config
          const configDot = document.getElementById('config-status-dot');
          const configText = document.getElementById('config-status-text');
          const configLabel = document.getElementById('config-status-label');
          configDot.className = 'status-dot ' + (s.configured ? 'green' : 'yellow');
          configText.textContent = s.configured ? '設定完了' : '未設定';
          configLabel.textContent = s.configured ? '.env ファイルあり' : '設定が必要です';
        }
      } catch (e) {
        console.error('Status load error:', e);
      }
    }

    function refreshStatus() {
      document.getElementById('slack-status-text').textContent = '確認中...';
      document.getElementById('lark-status-text').textContent = '確認中...';
      document.getElementById('config-status-text').textContent = '確認中...';
      loadStatus();
    }

    loadStatus();
    setInterval(loadStatus, 30000); // 30秒ごとに更新
  </script>
</body>
</html>`;
}

// セットアップサーバーをスタンドアロンで起動
export async function startSetupServer(port: number = 3002): Promise<void> {
  const app = express();
  app.use('/setup', createSetupRouter());

  // ルートにリダイレクト
  app.get('/', (_req: Request, res: Response) => {
    res.redirect('/setup');
  });

  app.listen(port, () => {
    console.log(`\n🔧 セットアップウィザードが起動しました`);
    console.log(`   ブラウザで開く: http://localhost:${port}/setup`);
    console.log(`\n   設定が完了したら Ctrl+C で終了し、npm run dev で起動してください\n`);
  });
}
