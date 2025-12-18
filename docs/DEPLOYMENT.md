# デプロイ手順

slack-to-lark-notifierを本番環境にデプロイする方法を説明します。

## 目次

1. [Docker](#docker)
2. [Google Cloud Run](#google-cloud-run)
3. [AWS Lambda](#aws-lambda)
4. [Heroku](#heroku)
5. [VPS / オンプレミス](#vps--オンプレミス)

---

## Docker

### Dockerイメージビルド

```bash
docker build -t slack-to-lark-notifier .
```

### Docker実行

```bash
docker run -d \
  --name slack-lark \
  -p 3000:3000 \
  -e SLACK_BOT_TOKEN=xoxb-your-token \
  -e SLACK_SIGNING_SECRET=your-secret \
  -e SLACK_APP_TOKEN=xapp-your-token \
  -e LARK_WEBHOOK_URL=https://open.larksuite.com/open-apis/bot/v2/hook/your-id \
  slack-to-lark-notifier
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  slack-lark:
    build: .
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
docker-compose up -d
```

---

## Google Cloud Run

### 前提条件

- Google Cloud CLI (`gcloud`) インストール済み
- プロジェクト作成済み

### デプロイ手順

```bash
# 1. 認証
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Artifact Registryにイメージをプッシュ
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/slack-to-lark-notifier

# 3. Cloud Runにデプロイ
gcloud run deploy slack-to-lark-notifier \
  --image gcr.io/YOUR_PROJECT_ID/slack-to-lark-notifier \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "SLACK_BOT_TOKEN=xoxb-xxx,SLACK_SIGNING_SECRET=xxx,SLACK_APP_TOKEN=xapp-xxx,LARK_WEBHOOK_URL=https://..."
```

### Secret Managerを使用（推奨）

```bash
# シークレット作成
echo -n "xoxb-your-token" | gcloud secrets create slack-bot-token --data-file=-

# Cloud Runでシークレットを参照
gcloud run deploy slack-to-lark-notifier \
  --image gcr.io/YOUR_PROJECT_ID/slack-to-lark-notifier \
  --set-secrets "SLACK_BOT_TOKEN=slack-bot-token:latest"
```

---

## AWS Lambda

> **注意**: Socket Modeを使用しているため、Lambda単体での実行は推奨しません。
> 常時接続が必要な場合はECS Fargateの使用を検討してください。

### ECS Fargate推奨構成

```bash
# ECRにプッシュ
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.ap-northeast-1.amazonaws.com
docker tag slack-to-lark-notifier:latest YOUR_ACCOUNT.dkr.ecr.ap-northeast-1.amazonaws.com/slack-to-lark-notifier:latest
docker push YOUR_ACCOUNT.dkr.ecr.ap-northeast-1.amazonaws.com/slack-to-lark-notifier:latest
```

### タスク定義例

```json
{
  "family": "slack-to-lark-notifier",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "YOUR_ACCOUNT.dkr.ecr.ap-northeast-1.amazonaws.com/slack-to-lark-notifier:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "secrets": [
        {
          "name": "SLACK_BOT_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:YOUR_ACCOUNT:secret:slack-bot-token"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/slack-to-lark-notifier",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "256",
  "memory": "512"
}
```

---

## Heroku

### デプロイ手順

```bash
# 1. Heroku CLIログイン
heroku login

# 2. アプリ作成
heroku create slack-to-lark-notifier

# 3. 環境変数設定
heroku config:set SLACK_BOT_TOKEN=xoxb-xxx
heroku config:set SLACK_SIGNING_SECRET=xxx
heroku config:set SLACK_APP_TOKEN=xapp-xxx
heroku config:set LARK_WEBHOOK_URL=https://...

# 4. デプロイ
git push heroku main
```

### Procfile

```
web: npm start
```

---

## VPS / オンプレミス

### systemdサービス設定

```ini
# /etc/systemd/system/slack-lark.service
[Unit]
Description=Slack to Lark Notifier
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/slack-to-lark-notifier
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/slack-to-lark-notifier/.env

[Install]
WantedBy=multi-user.target
```

### 起動・管理

```bash
# サービス有効化
sudo systemctl enable slack-lark

# 起動
sudo systemctl start slack-lark

# 状態確認
sudo systemctl status slack-lark

# ログ確認
journalctl -u slack-lark -f
```

### PM2を使用する場合

```bash
# PM2インストール
npm install -g pm2

# 起動
pm2 start dist/index.js --name slack-lark

# 自動起動設定
pm2 startup
pm2 save
```

---

## 運用監視

### ログ確認

```bash
# Docker
docker logs -f slack-lark

# systemd
journalctl -u slack-lark -f

# PM2
pm2 logs slack-lark
```

### ヘルスチェック

アプリケーションが正常に動作しているか確認するには、ログで以下のメッセージを確認:

```
⚡️ Slack to Lark Notifier is running with 1 workspace(s)
```

### アラート設定推奨

- アプリケーション再起動の検知
- エラーログの監視（`Failed to forward message`）
- Lark API エラーの監視

---

## 次のステップ

- [セットアップガイド](./SETUP_GUIDE.md) - 初期設定方法
- [トラブルシューティング](./TROUBLESHOOTING.md) - 問題発生時の対処
