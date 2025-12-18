# セットアップガイド

slack-to-lark-notifierを本番環境で利用するための完全ガイドです。

## 目次

1. [前提条件](#前提条件)
2. [Slack App作成](#slack-app作成)
3. [Lark Webhook設定](#lark-webhook設定)
4. [環境変数設定](#環境変数設定)
5. [アプリケーション起動](#アプリケーション起動)
6. [動作確認](#動作確認)

---

## 前提条件

- Node.js 18以上
- npm または yarn
- Slack Workspaceの管理者権限（またはApp作成権限）
- Lark（Feishu）の管理者権限

---

## Slack App作成

### Step 1: Slack APIにアクセス

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 右上の「Create New App」をクリック

### Step 2: App作成方法を選択

1. 「From scratch」を選択
2. App Name: `Lark Notifier`（任意の名前）
3. Workspace: 通知を受け取りたいWorkspaceを選択
4. 「Create App」をクリック

### Step 3: Socket Mode有効化

1. 左メニューの「Socket Mode」をクリック
2. 「Enable Socket Mode」をONにする
3. Token Name: `socket-token`（任意）
4. 「Generate」をクリック
5. **表示されるApp-Level Token（`xapp-`で始まる）を保存** → `SLACK_APP_TOKEN`

### Step 4: Event Subscriptions設定

1. 左メニューの「Event Subscriptions」をクリック
2. 「Enable Events」をONにする
3. 「Subscribe to bot events」で以下を追加:
   - `message.channels` - パブリックチャンネルのメッセージ
   - `message.groups` - プライベートチャンネルのメッセージ
   - `app_mention` - Botへのメンション
4. 「Save Changes」をクリック

### Step 5: OAuth & Permissions設定

1. 左メニューの「OAuth & Permissions」をクリック
2. 「Scopes」セクションで「Bot Token Scopes」に以下を追加:
   - `channels:history` - パブリックチャンネルの履歴読み取り
   - `channels:read` - パブリックチャンネル情報の読み取り
   - `groups:history` - プライベートチャンネルの履歴読み取り
   - `groups:read` - プライベートチャンネル情報の読み取り
   - `chat:write` - メッセージ送信（応答用）
   - `users:read` - ユーザー情報読み取り

### Step 6: Appインストール

1. 左メニューの「OAuth & Permissions」をクリック
2. 「Install to Workspace」をクリック
3. 権限を確認して「Allow」をクリック
4. **表示されるBot User OAuth Token（`xoxb-`で始まる）を保存** → `SLACK_BOT_TOKEN`

### Step 7: Signing Secret取得

1. 左メニューの「Basic Information」をクリック
2. 「App Credentials」セクションの「Signing Secret」を表示
3. **Signing Secretを保存** → `SLACK_SIGNING_SECRET`

### Step 8: Botをチャンネルに追加

1. Slackアプリで通知を受け取りたいチャンネルを開く
2. チャンネル名をクリック → 「Integrations」タブ
3. 「Apps」セクションで「Add an App」をクリック
4. 作成したApp（Lark Notifier）を追加

---

## Lark Webhook設定

### Step 1: Lark管理画面にアクセス

1. [Lark Open Platform](https://open.larksuite.com/) にアクセス
2. 「Developer Console」に移動

### Step 2: カスタムボット作成

1. 「Custom Bot」または「Incoming Webhook」を選択
2. 通知を受け取りたいグループチャットを選択
3. ボット名を設定（例: `Slack通知`）
4. 「Add」をクリック

### Step 3: Webhook URL取得

1. 作成したボットの設定を開く
2. **Webhook URL（`https://open.larksuite.com/open-apis/bot/v2/hook/...`）を保存** → `LARK_WEBHOOK_URL`

---

## 環境変数設定

### `.env`ファイル作成

```bash
cp .env.example .env
```

### 必須設定

```bash
# Slack設定（Step 3, 6, 7で取得した値）
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx
SLACK_SIGNING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SLACK_APP_TOKEN=xapp-x-xxxxxxxxxx-xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SLACK_WORKSPACE_NAME=My Company

# Lark設定（Webhook URLで取得した値）
LARK_WEBHOOK_URL=https://open.larksuite.com/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# サーバー設定
PORT=3000
```

### オプション設定

```bash
# 特定のチャンネルのみ監視する場合
WATCH_CHANNEL_IDS=C123456789,C987654321

# 特定のチャンネルを除外する場合
EXCLUDE_CHANNEL_IDS=C111111111

# Slack Connect共有チャンネルを監視する場合
INCLUDE_SHARED_CHANNELS=true
```

### 複数Workspace対応（Slack Connect用）

```bash
# 追加Workspace設定
SLACK_WORKSPACE_2_BOT_TOKEN=xoxb-secondary-token
SLACK_WORKSPACE_2_SIGNING_SECRET=secondary-secret
SLACK_WORKSPACE_2_APP_TOKEN=xapp-secondary-token
SLACK_WORKSPACE_2_NAME=Partner Company
```

---

## アプリケーション起動

### 開発環境

```bash
# 依存関係インストール
npm install

# 開発サーバー起動（ホットリロード有効）
npm run dev
```

### 本番環境

```bash
# ビルド
npm run build

# 起動
npm start
```

### 起動確認

正常に起動すると以下のログが表示されます:

```
🚀 Starting Slack to Lark Notifier...
📋 設定読み込み完了:
   - Workspace数: 1
   - 共有チャンネル監視: 有効
Loaded 15 channels for workspace primary
Initialized workspace: My Company
Started workspace app: My Company
⚡️ Slack to Lark Notifier is running with 1 workspace(s)
```

---

## 動作確認

### テストメッセージ送信

1. Botを追加したSlackチャンネルでメッセージを送信
2. Larkのグループチャットに通知が届くことを確認

### 期待される通知形式

```
📨 Slack通知 - #general

🏢 Workspace: My Company
👤 送信者: U1234567890
💬 メッセージ: テストメッセージです
🕐 時刻: 2025/12/18 15:30:00
```

### 共有チャンネルの場合

```
📨 Slack通知 (共有チャンネル) - #shared-project

🏢 Workspace: Partner Company
👤 送信者: U9876543210
💬 メッセージ: 共有チャンネルからのメッセージ
🕐 時刻: 2025/12/18 15:30:00
🔗 接続チーム: T123, T456
```

---

## 次のステップ

- [デプロイ手順](./DEPLOYMENT.md) - 本番環境へのデプロイ方法
- [トラブルシューティング](./TROUBLESHOOTING.md) - よくある問題と解決方法
