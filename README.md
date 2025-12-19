# Slack to Lark Notifier

SlackのメッセージをLarkに転送する通知システムです。

## 機能

- Slackチャンネルのメッセージを自動でLarkに転送
- メンション時の通知対応
- 日本語タイムゾーン対応

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`を作成:

```bash
cp .env.example .env
```

以下の環境変数を設定:

| 変数名 | 説明 |
|--------|------|
| `SLACK_BOT_TOKEN` | Slack Bot Token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Slack App Signing Secret |
| `SLACK_APP_TOKEN` | Slack App-Level Token (xapp-...) |
| `LARK_WEBHOOK_URL` | Lark Incoming Webhook URL |

### 3. Slack App設定

1. [Slack API](https://api.slack.com/apps)で新しいAppを作成
2. Socket Modeを有効化
3. Event Subscriptionsで以下を購読:
   - `message.channels`
   - `app_mention`
4. Bot Token Scopesを追加:
   - `channels:history`
   - `chat:write`

### 4. Lark Webhook設定

1. Lark管理画面でIncoming Webhookボットを作成
2. Webhook URLを取得して環境変数に設定

### 5. Slack Connectチャンネル監視（オプション）

Slack Connectの共有チャンネルを監視するには、User Tokenを使用したポーリング方式を利用します。

```bash
# .envに追加
SLACK_USER_TOKEN=xoxp-...  # User Token
SLACK_CONNECT_CHANNEL_IDS=C123,C456  # 監視するチャンネルID（カンマ区切り）
SLACK_CONNECT_POLLING_INTERVAL=5000  # ポーリング間隔（ミリ秒）
```

**User Tokenの取得方法:**
1. Slack Appの設定で OAuth & Permissions を開く
2. User Token Scopes に以下を追加:
   - `channels:history`
   - `channels:read`
   - `users:read`
3. ワークスペースに再インストールしてUser OAuth Tokenを取得

### 6. Lark→Slack双方向通信（オプション）

LarkからSlackへメッセージを送信するには、Lark Appを作成します。

```bash
# .envに追加
LARK_RECEIVER_ENABLED=true
LARK_APP_ID=cli_xxxxx
LARK_APP_SECRET=xxxxx
LARK_VERIFICATION_TOKEN=xxxxx
LARK_DEFAULT_SLACK_CHANNEL=general  # デフォルト送信先

# チャンネルマッピング（オプション）
LARK_CHANNEL_MAP=oc_xxxxx:general,oc_yyyyy:random
```

**Lark Appの設定:**
1. [Lark Developer Console](https://open.larksuite.com/app)でアプリを作成
2. Event Subscription URLを設定: `https://your-domain.com:3001/lark/events`
3. `im.message.receive_v1` イベントを購読

**使用方法:**
- Larkで `/slack #channel メッセージ` と送信すると、指定したSlackチャンネルに転送されます

## 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# 型チェック
npm run typecheck

# Lint
npm run lint
```

## ライセンス

MIT
