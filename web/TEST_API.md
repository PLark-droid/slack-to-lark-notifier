# API テストガイド

マルチテナント設定システムのAPIをテストする方法

## 前提条件

```bash
# 開発サーバーを起動
npm run dev
```

サーバーは http://localhost:3000 で起動します。

## 1. GET - 設定取得

### リクエスト
```bash
curl "http://localhost:3000/api/config?userId=user-123"
```

### 期待されるレスポンス
```json
{
  "success": true,
  "config": {
    "id": "user-123",
    "slackBotToken": null,
    "slackChannels": [],
    "larkWebhookUrl": null,
    "userMappings": {},
    "createdAt": "2025-12-19T10:00:00.000Z",
    "updatedAt": "2025-12-19T10:00:00.000Z"
  }
}
```

## 2. POST - 設定保存（バリデーション）

### リクエスト
```bash
curl -X POST "http://localhost:3000/api/config" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "id": "user-123",
      "slackBotToken": "xoxb-test-token-12345",
      "slackChannels": ["C123456", "C789012"],
      "larkWebhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/test-webhook",
      "userMappings": {
        "ou_lark_user_1": "U123456",
        "ou_lark_user_2": "U789012"
      }
    }
  }'
```

### 期待されるレスポンス
```json
{
  "success": true,
  "config": {
    "id": "user-123",
    "slackBotToken": "xoxb-test-token-12345",
    "slackChannels": ["C123456", "C789012"],
    "larkWebhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/test-webhook",
    "userMappings": {
      "ou_lark_user_1": "U123456",
      "ou_lark_user_2": "U789012"
    },
    "updatedAt": "2025-12-19T10:05:00.000Z"
  }
}
```

## 3. PUT - 設定更新

POSTと同じです。

```bash
curl -X PUT "http://localhost:3000/api/config" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "id": "user-123",
      "slackBotToken": "xoxb-updated-token",
      "slackChannels": ["C999888"],
      "larkWebhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/updated",
      "userMappings": {}
    }
  }'
```

## 4. DELETE - 設定削除

### リクエスト
```bash
curl -X DELETE "http://localhost:3000/api/config?userId=user-123"
```

### 期待されるレスポンス
```json
{
  "success": true
}
```

## バリデーションエラーのテスト

### 1. ユーザーIDなし
```bash
curl -X POST "http://localhost:3000/api/config" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "id": "",
      "slackChannels": [],
      "userMappings": {}
    }
  }'
```

**期待されるレスポンス:**
```json
{
  "success": false,
  "error": "Validation failed: User ID is required"
}
```

### 2. 不正なSlack Bot Token
```bash
curl -X POST "http://localhost:3000/api/config" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "id": "user-123",
      "slackBotToken": "invalid-token",
      "slackChannels": [],
      "userMappings": {}
    }
  }'
```

**期待されるレスポンス:**
```json
{
  "success": false,
  "error": "Validation failed: Slack Bot Token must start with \"xoxb-\""
}
```

### 3. 不正なURL
```bash
curl -X POST "http://localhost:3000/api/config" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "id": "user-123",
      "slackChannels": [],
      "larkWebhookUrl": "not-a-valid-url",
      "userMappings": {}
    }
  }'
```

**期待されるレスポンス:**
```json
{
  "success": false,
  "error": "Validation failed: Lark Webhook URL must be a valid URL"
}
```

## 環境変数からの読み込みテスト

### 1. 環境変数を設定
```bash
export USER_CONFIG_USER_123='{"id":"user-123","slackBotToken":"xoxb-from-env","slackChannels":["C123"],"larkWebhookUrl":"https://example.com","userMappings":{}}'
```

### 2. サーバーを再起動
```bash
npm run dev
```

### 3. APIで取得
```bash
curl "http://localhost:3000/api/config?userId=user-123"
```

環境変数の内容が返されることを確認してください。

## ブラウザでのテスト

### デモページにアクセス

```
http://localhost:3000/config-demo
```

1. ユーザーIDを入力（例: `user-demo`）
2. 各フィールドに値を入力
3. 「保存」ボタンをクリック
4. ブラウザのDevToolsでlocalStorageを確認

```javascript
// ブラウザのコンソールで実行
localStorage.getItem('slack-to-lark-config:user-demo')
```

### Application タブで確認

1. DevToolsを開く (F12)
2. Application タブを選択
3. Storage > Local Storage を展開
4. `http://localhost:3000` を選択
5. `slack-to-lark-config:user-demo` というキーを確認

## Postman コレクション

以下の設定でPostmanコレクションを作成できます：

### Collection Variables
- `base_url`: `http://localhost:3000`
- `user_id`: `user-123`

### 1. Get Config
- Method: `GET`
- URL: `{{base_url}}/api/config?userId={{user_id}}`

### 2. Save Config
- Method: `POST`
- URL: `{{base_url}}/api/config`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "config": {
    "id": "{{user_id}}",
    "slackBotToken": "xoxb-test-token",
    "slackChannels": ["C123456"],
    "larkWebhookUrl": "https://example.com",
    "userMappings": {}
  }
}
```

### 3. Update Config
- Method: `PUT`
- URL: `{{base_url}}/api/config`
- Headers: `Content-Type: application/json`
- Body: (同上)

### 4. Delete Config
- Method: `DELETE`
- URL: `{{base_url}}/api/config?userId={{user_id}}`

## トラブルシューティング

### サーバーが起動しない
```bash
# ポート3000が使用中の場合
lsof -i :3000
kill -9 <PID>

# または別のポートで起動
PORT=3001 npm run dev
```

### CORSエラー
開発環境では問題ありませんが、本番環境でCORSエラーが発生する場合は、
`next.config.js` にCORS設定を追加してください。

### TypeScriptエラー
```bash
# 型チェック
npx tsc --noEmit

# ビルドチェック
npm run build
```

## 次のステップ

1. Vercelにデプロイ
2. 環境変数を設定
3. 本番環境でテスト
4. 実際のSlack/Lark統合をテスト

---

**テストガイド作成日**: 2025-12-19
**対応Issue**: #19
