# Slack to Lark Notifier

SlackのメッセージをLarkに自動転送するWebアプリケーション。Vercelで完結するサーバーレス構成。

## 機能

- **Slack → Lark**: Slackチャンネルのメッセージを自動的にLarkグループに転送
- **Lark → Slack**: LarkからSlackへの返信（双方向通信）
- **サーバーレス**: Vercelのみで動作、ngrok不要

## デモ

https://slack-to-lark-notifier.vercel.app/

## クイックスタート

### 1. デプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PLark-droid/slack-to-lark-notifier)

### 2. 環境変数を設定

Vercelダッシュボードで以下の環境変数を設定：

| 変数名 | 説明 |
|--------|------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | リクエスト署名検証用 |
| `SLACK_CHANNEL_ID` | 転送先チャンネルID |
| `LARK_WEBHOOK_URL` | Lark Webhook URL |
| `LARK_APP_SECRET` | 双方向通信時のみ必要 |

### 3. Slack/Larkを設定

詳細は [docs/VERCEL_SETUP.md](docs/VERCEL_SETUP.md) を参照。

## API エンドポイント

| エンドポイント | 説明 |
|---------------|------|
| `/api/slack/events` | Slack Events API受信 |
| `/api/lark/webhook` | Lark Events受信 |

## ローカル開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

## ドキュメント

- [Vercelデプロイ完全ガイド](docs/VERCEL_SETUP.md)
- [環境変数サンプル](.env.example)

## 技術スタック

- Next.js 16
- TypeScript
- Tailwind CSS
- Vercel Serverless Functions

## ライセンス

MIT
