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
