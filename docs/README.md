# ドキュメントガイド

slack-to-lark-notifierを始めるためのガイドです。目的に応じて適切なドキュメントを参照してください。

---

## クイックスタート

**「とりあえず動かしたい」** → [セットアップガイド](./SETUP_GUIDE.md)

---

## 目的別ガイド

### 初めて使う方

1. **[セットアップガイド](./SETUP_GUIDE.md)** を最初に読んでください
   - Slack Appの作成方法
   - Lark Webhookの設定方法
   - 環境変数の設定
   - 動作確認方法

### 本番環境にデプロイしたい方

1. まず [セットアップガイド](./SETUP_GUIDE.md) で基本設定を完了
2. **[デプロイ手順](./DEPLOYMENT.md)** でお好みの環境にデプロイ
   - Docker / Docker Compose
   - Google Cloud Run
   - AWS ECS Fargate
   - Heroku
   - VPS / オンプレミス

### 問題が発生した方

**[トラブルシューティング](./TROUBLESHOOTING.md)** を参照してください
- 起動時のエラー
- Slack接続エラー
- Lark通知エラー
- メッセージが届かない場合

---

## ドキュメント一覧

| ドキュメント | 内容 | 対象者 |
|-------------|------|--------|
| [セットアップガイド](./SETUP_GUIDE.md) | 初期設定の完全ガイド | 全員（必読） |
| [デプロイ手順](./DEPLOYMENT.md) | 本番環境へのデプロイ方法 | 運用担当者 |
| [トラブルシューティング](./TROUBLESHOOTING.md) | よくある問題と解決方法 | 問題発生時 |

---

## 推奨する読み順

```
1. セットアップガイド（必須）
   ├── Slack App作成
   ├── Lark Webhook設定
   └── 動作確認
       │
       ▼
2. デプロイ手順（本番運用する場合）
   ├── Docker
   ├── Cloud Run / ECS
   └── Heroku / VPS
       │
       ▼
3. トラブルシューティング（必要に応じて）
```

---

## よくある質問

### Q: 開発環境で試すだけなら何を読めばいい？

**[セットアップガイド](./SETUP_GUIDE.md)** だけでOKです。`npm run dev`で起動できます。

### Q: Dockerで動かしたい

1. [セットアップガイド](./SETUP_GUIDE.md) で`.env`ファイルを作成
2. [デプロイ手順](./DEPLOYMENT.md#docker) でDockerビルド・起動

### Q: 他社のSlackチャンネルからも通知を受けたい

[セットアップガイド](./SETUP_GUIDE.md) の「複数Workspace対応」セクションを参照してください。

---

## サポート

- **バグ報告・機能要望**: [GitHub Issues](https://github.com/PLark-droid/slack-to-lark-notifier/issues)
- **セットアップでお困りの場合**: [トラブルシューティング](./TROUBLESHOOTING.md) を確認
