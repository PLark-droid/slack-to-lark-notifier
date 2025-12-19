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

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: { text: '🎉 slack-to-lark-notifier セットアップテスト成功!' },
        }),
      });

      const data = (await response.json()) as { code?: number; StatusCode?: number };
      if (data.code === 0 || data.StatusCode === 0) {
        res.json({ success: true, message: 'Lark Webhook テスト成功！メッセージを確認してください' });
      } else {
        res.json({ success: false, error: `Lark Webhook エラー: ${JSON.stringify(data)}` });
      }
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
    '',
    '# ============================================',
    '# チャンネルフィルター設定',
    '# ============================================',
    'INCLUDE_SHARED_CHANNELS=true',
    '',
    '# ============================================',
    '# Lark設定',
    '# ============================================',
    `LARK_WEBHOOK_URL=${config.lark.webhookUrl}`,
    '',
    '# Lark→Slack双方向通信設定',
    `LARK_RECEIVER_ENABLED=${config.lark.receiverEnabled}`,
  ];

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
  <title>Slack to Lark Notifier - セットアップウィザード</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4A154B 0%, #611f69 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .wizard {
      padding: 30px;
    }
    .steps {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      position: relative;
    }
    .steps::before {
      content: '';
      position: absolute;
      top: 20px;
      left: 10%;
      right: 10%;
      height: 3px;
      background: #e0e0e0;
      z-index: 0;
    }
    .step {
      text-align: center;
      position: relative;
      z-index: 1;
      flex: 1;
    }
    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e0e0e0;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 10px;
      font-weight: bold;
      transition: all 0.3s;
    }
    .step.active .step-number { background: #4A154B; color: white; }
    .step.completed .step-number { background: #2eb67d; color: white; }
    .step-label { font-size: 12px; color: #666; }
    .step.active .step-label { color: #4A154B; font-weight: bold; }
    .step-content { display: none; }
    .step-content.active { display: block; }
    .form-group { margin-bottom: 20px; }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: #4A154B;
    }
    .form-group .help {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .guide-box {
      background: #f5f5f5;
      border-left: 4px solid #4A154B;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 0 8px 8px 0;
    }
    .guide-box h4 { color: #4A154B; margin-bottom: 10px; }
    .guide-box ol { margin-left: 20px; }
    .guide-box li { margin-bottom: 8px; color: #333; }
    .guide-box a { color: #4A154B; }
    .buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }
    .btn {
      padding: 12px 30px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      border: none;
    }
    .btn-primary { background: #4A154B; color: white; }
    .btn-primary:hover { background: #611f69; }
    .btn-secondary { background: #e0e0e0; color: #333; }
    .btn-secondary:hover { background: #d0d0d0; }
    .btn-test { background: #2eb67d; color: white; }
    .btn-test:hover { background: #27a06d; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .alert-info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
    .checkbox-group { display: flex; align-items: center; gap: 10px; }
    .checkbox-group input[type="checkbox"] { width: auto; }
    .success-screen {
      text-align: center;
      padding: 40px;
    }
    .success-icon { font-size: 80px; margin-bottom: 20px; }
    .code-block {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Fira Code', monospace;
      overflow-x: auto;
      text-align: left;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Slack to Lark Notifier</h1>
      <p>セットアップウィザード - 簡単3ステップで設定完了</p>
    </div>

    <div class="wizard">
      <div class="steps">
        <div class="step active" data-step="1">
          <div class="step-number">1</div>
          <div class="step-label">Slack設定</div>
        </div>
        <div class="step" data-step="2">
          <div class="step-number">2</div>
          <div class="step-label">Lark設定</div>
        </div>
        <div class="step" data-step="3">
          <div class="step-number">3</div>
          <div class="step-label">確認・保存</div>
        </div>
      </div>

      <div id="alert-container"></div>

      <!-- Step 1: Slack設定 -->
      <div class="step-content active" data-step="1">
        <h2>Step 1: Slack App設定</h2>

        <div class="guide-box">
          <h4>📖 Slack Appの作成方法</h4>
          <ol>
            <li><a href="https://api.slack.com/apps" target="_blank">Slack API</a> にアクセス</li>
            <li>「Create New App」→「From scratch」を選択</li>
            <li>App名とWorkspaceを選択して作成</li>
            <li>「OAuth & Permissions」で以下のBot Token Scopesを追加:
              <code>channels:history, channels:read, chat:write, groups:history, groups:read</code>
            </li>
            <li>「Install to Workspace」でインストール</li>
            <li>「Socket Mode」を有効化して App Token を生成</li>
          </ol>
        </div>

        <div class="form-group">
          <label>Bot Token (xoxb-...)</label>
          <input type="text" id="slack-bot-token" placeholder="xoxb-1234567890-...">
          <p class="help">OAuth & Permissions → Bot User OAuth Token</p>
        </div>

        <div class="form-group">
          <label>Signing Secret</label>
          <input type="text" id="slack-signing-secret" placeholder="abc123...">
          <p class="help">Basic Information → App Credentials → Signing Secret</p>
        </div>

        <div class="form-group">
          <label>App Token (xapp-...)</label>
          <input type="text" id="slack-app-token" placeholder="xapp-1-...">
          <p class="help">Basic Information → App-Level Tokens → connections:write</p>
        </div>

        <div class="form-group">
          <label>Workspace名（任意）</label>
          <input type="text" id="slack-workspace-name" placeholder="My Workspace">
        </div>

        <button class="btn btn-test" onclick="testSlack()">🔌 Slack接続テスト</button>

        <div class="buttons">
          <div></div>
          <button class="btn btn-primary" onclick="nextStep()">次へ →</button>
        </div>
      </div>

      <!-- Step 2: Lark設定 -->
      <div class="step-content" data-step="2">
        <h2>Step 2: Lark Webhook設定</h2>

        <div class="guide-box">
          <h4>📖 Lark Webhookの作成方法</h4>
          <ol>
            <li>Larkでグループチャットを開く（または作成）</li>
            <li>グループ設定 → 「ボット」→「ボットを追加」</li>
            <li>「カスタムボット」を選択</li>
            <li>ボット名を入力して作成</li>
            <li>表示されるWebhook URLをコピー</li>
          </ol>
        </div>

        <div class="form-group">
          <label>Lark Webhook URL</label>
          <input type="text" id="lark-webhook-url" placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/...">
          <p class="help">カスタムボット作成時に表示されるURL</p>
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input type="checkbox" id="lark-receiver-enabled">
            <label for="lark-receiver-enabled">Lark→Slack双方向通信を有効にする（上級者向け）</label>
          </div>
        </div>

        <div id="lark-advanced" style="display:none;">
          <div class="alert alert-info">
            双方向通信にはLark Open Platformでアプリを作成する必要があります。
            <a href="https://open.larksuite.com/app" target="_blank">Lark Open Platform</a>
          </div>

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

          <div class="form-group">
            <label>Lark Encrypt Key（任意）</label>
            <input type="text" id="lark-encrypt-key" placeholder="">
          </div>

          <div class="form-group">
            <label>デフォルトSlackチャンネル（任意）</label>
            <input type="text" id="lark-default-channel" placeholder="general">
          </div>
        </div>

        <button class="btn btn-test" onclick="testLark()">🔌 Lark Webhook テスト</button>

        <div class="buttons">
          <button class="btn btn-secondary" onclick="prevStep()">← 戻る</button>
          <button class="btn btn-primary" onclick="nextStep()">次へ →</button>
        </div>
      </div>

      <!-- Step 3: 確認・保存 -->
      <div class="step-content" data-step="3">
        <h2>Step 3: 設定確認・保存</h2>

        <div class="form-group">
          <label>ポート番号</label>
          <input type="number" id="server-port" value="3000">
        </div>

        <div class="form-group">
          <label>Lark Receiverポート番号</label>
          <input type="number" id="lark-receiver-port" value="3001">
        </div>

        <h3>設定プレビュー</h3>
        <div class="code-block" id="config-preview"></div>

        <div class="buttons">
          <button class="btn btn-secondary" onclick="prevStep()">← 戻る</button>
          <button class="btn btn-primary" onclick="saveConfig()">💾 設定を保存</button>
        </div>
      </div>

      <!-- 完了画面 -->
      <div class="step-content" data-step="4">
        <div class="success-screen">
          <div class="success-icon">🎉</div>
          <h2>セットアップ完了！</h2>
          <p>設定ファイルが保存されました。以下のコマンドでアプリを起動できます。</p>
          <div class="code-block">
npm run dev  # 開発モード

npm run build && npm start  # 本番モード
          </div>
          <button class="btn btn-primary" onclick="location.reload()">もう一度設定する</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentStep = 1;

    document.getElementById('lark-receiver-enabled').addEventListener('change', function() {
      document.getElementById('lark-advanced').style.display = this.checked ? 'block' : 'none';
    });

    function showAlert(message, type) {
      const container = document.getElementById('alert-container');
      container.innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
      setTimeout(() => container.innerHTML = '', 5000);
    }

    function updateSteps() {
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

      if (currentStep === 3) {
        updatePreview();
      }
    }

    function getConfig() {
      return {
        slack: {
          botToken: document.getElementById('slack-bot-token').value.trim(),
          signingSecret: document.getElementById('slack-signing-secret').value.trim(),
          appToken: document.getElementById('slack-app-token').value.trim(),
          workspaceName: document.getElementById('slack-workspace-name').value.trim() || 'My Workspace',
        },
        lark: {
          webhookUrl: document.getElementById('lark-webhook-url').value.trim(),
          receiverEnabled: document.getElementById('lark-receiver-enabled').checked,
          appId: document.getElementById('lark-app-id').value.trim(),
          appSecret: document.getElementById('lark-app-secret').value.trim(),
          verificationToken: document.getElementById('lark-verification-token').value.trim(),
          encryptKey: document.getElementById('lark-encrypt-key').value.trim(),
          defaultSlackChannel: document.getElementById('lark-default-channel').value.trim(),
        },
        server: {
          port: parseInt(document.getElementById('server-port').value) || 3000,
          larkReceiverPort: parseInt(document.getElementById('lark-receiver-port').value) || 3001,
        }
      };
    }

    function updatePreview() {
      const config = getConfig();
      let preview = '# Slack設定\\n';
      preview += 'SLACK_BOT_TOKEN=' + (config.slack.botToken ? '***' : '未設定') + '\\n';
      preview += 'SLACK_SIGNING_SECRET=' + (config.slack.signingSecret ? '***' : '未設定') + '\\n';
      preview += 'SLACK_APP_TOKEN=' + (config.slack.appToken ? '***' : '未設定') + '\\n';
      preview += 'SLACK_WORKSPACE_NAME=' + config.slack.workspaceName + '\\n\\n';
      preview += '# Lark設定\\n';
      preview += 'LARK_WEBHOOK_URL=' + (config.lark.webhookUrl ? '***' : '未設定') + '\\n';
      preview += 'LARK_RECEIVER_ENABLED=' + config.lark.receiverEnabled + '\\n\\n';
      preview += '# サーバー設定\\n';
      preview += 'PORT=' + config.server.port + '\\n';
      preview += 'LARK_RECEIVER_PORT=' + config.server.larkReceiverPort;

      document.getElementById('config-preview').innerText = preview.replace(/\\\\n/g, '\\n');
    }

    function nextStep() {
      if (currentStep < 4) {
        currentStep++;
        updateSteps();
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

      try {
        const res = await fetch('/setup/api/test/slack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken })
        });
        const data = await res.json();
        showAlert(data.success ? data.message : data.error, data.success ? 'success' : 'error');
      } catch (e) {
        showAlert('接続テストに失敗しました: ' + e.message, 'error');
      }
    }

    async function testLark() {
      const webhookUrl = document.getElementById('lark-webhook-url').value.trim();
      if (!webhookUrl) {
        showAlert('Webhook URLを入力してください', 'error');
        return;
      }

      try {
        const res = await fetch('/setup/api/test/lark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookUrl })
        });
        const data = await res.json();
        showAlert(data.success ? data.message : data.error, data.success ? 'success' : 'error');
      } catch (e) {
        showAlert('接続テストに失敗しました: ' + e.message, 'error');
      }
    }

    async function saveConfig() {
      const config = getConfig();

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
        }
      } catch (e) {
        showAlert('保存に失敗しました: ' + e.message, 'error');
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
          }
          if (c.lark) {
            document.getElementById('lark-webhook-url').value = c.lark.webhookUrl || '';
            document.getElementById('lark-receiver-enabled').checked = c.lark.receiverEnabled || false;
            document.getElementById('lark-app-id').value = c.lark.appId || '';
            document.getElementById('lark-app-secret').value = c.lark.appSecret || '';
            document.getElementById('lark-verification-token').value = c.lark.verificationToken || '';
            document.getElementById('lark-encrypt-key').value = c.lark.encryptKey || '';
            document.getElementById('lark-default-channel').value = c.lark.defaultSlackChannel || '';
            if (c.lark.receiverEnabled) {
              document.getElementById('lark-advanced').style.display = 'block';
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
