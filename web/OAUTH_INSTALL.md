# Slack OAuth ワンクリックインストール機能

## 概要

Slack Botをワンクリックでインストールし、監視するチャンネルを選択できるようにする機能です。

## 実装ファイル

### APIルート

1. **`/api/oauth/slack/install/route.ts`**
   - OAuth認証のコールバックハンドラー
   - Bot インストール情報をVercel KVに保存
   - チャンネル一覧を取得して一時保存
   - チャンネル設定の保存処理

2. **`/api/oauth/slack/channels/route.ts`**
   - 一時保存されたチャンネル一覧を取得
   - チャンネル選択UIで使用

### UIコンポーネント

3. **`/app/setup-wizard/components/SlackChannelSelector.tsx`**
   - チャンネル選択UI
   - 検索機能付き
   - 全選択/全解除機能

4. **`/app/setup-wizard/install/page.tsx`**
   - ワンクリックインストールウィザード
   - 3ステップのフロー（インストール → チャンネル選択 → 完了）

## OAuth フロー

### 1. インストール開始

ユーザーが `/setup-wizard/install` にアクセスし、「Slackに追加」ボタンをクリック:

```
https://slack.com/oauth/v2/authorize?
  client_id={SLACK_CLIENT_ID}&
  scope=channels:read,channels:history,chat:write,users:read,groups:read,groups:history&
  redirect_uri={APP_URL}/api/oauth/slack/install
```

### 2. OAuth コールバック

Slackが認証後、`/api/oauth/slack/install` にリダイレクト:

```typescript
GET /api/oauth/slack/install?code=xxxxx
```

処理内容:
- `code` を `access_token` と交換
- Bot インストール情報を保存 (`bot:install:{team_id}`)
- チャンネル一覧を取得
- チャンネル情報を一時保存 (`channels:temp:{team_id}`, 10分間有効)
- チャンネル選択画面にリダイレクト

### 3. チャンネル選択

ユーザーが監視するチャンネルを選択:

```
GET /setup-wizard/install?team_id=xxx&team_name=xxx&success=true
```

UIで表示:
- チャンネル一覧（検索可能）
- プライベートチャンネルの表示
- 全選択/全解除機能

### 4. 設定保存

選択したチャンネルを保存:

```typescript
POST /api/oauth/slack/install
{
  "team_id": "T0123456789",
  "channel_ids": ["C0123456789", "C9876543210"]
}
```

保存内容:
- チャンネル設定を保存 (`channels:config:{team_id}`)
- チャンネル名のマッピングも保存
- 一時データを削除

## データモデル

### Bot Installation (`bot:install:{team_id}`)

```typescript
interface BotInstallation {
  team_id: string;
  team_name: string;
  bot_token: string;
  bot_user_id: string;
  app_id: string;
  authed_user_id: string;
  scope: string;
  installed_at: string;
  updated_at: string;
}
```

### Channel Configuration (`channels:config:{team_id}`)

```typescript
interface ChannelConfig {
  team_id: string;
  channel_ids: string[];
  channel_names: Record<string, string>; // { "C123": "general" }
  updated_at: string;
}
```

### Temporary Channels (`channels:temp:{team_id}`)

```typescript
interface TempChannelsData {
  team_id: string;
  channels: Array<{
    id: string;
    name: string;
    is_private: boolean;
  }>;
  expires_at: number;
}
```

## 環境変数

必要な環境変数:

```bash
# Slack OAuth Credentials
SLACK_CLIENT_ID=xxxxx.xxxxx
SLACK_CLIENT_SECRET=xxxxx

# App URL (redirect_uri用)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SLACK_CLIENT_ID=xxxxx.xxxxx

# Vercel KV (データ保存用)
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=xxxxx
KV_REST_API_READ_ONLY_TOKEN=xxxxx
```

## Slack App 設定

### OAuth & Permissions

**Redirect URLs:**
```
https://your-app.vercel.app/api/oauth/slack/install
http://localhost:3000/api/oauth/slack/install (開発用)
```

**Bot Token Scopes:**
- `channels:read` - チャンネル一覧の取得
- `channels:history` - チャンネルメッセージの読み取り
- `chat:write` - メッセージの送信
- `users:read` - ユーザー情報の取得
- `groups:read` - プライベートチャンネル一覧の取得
- `groups:history` - プライベートチャンネルメッセージの読み取り

## 使用方法

### 開発環境

1. 環境変数を設定:
```bash
cp .env.example .env
# .env を編集して Slack credentials を設定
```

2. 開発サーバー起動:
```bash
npm run dev
```

3. ブラウザで開く:
```
http://localhost:3000/setup-wizard/install
```

### 本番環境

1. Vercel にデプロイ
2. 環境変数を設定（Vercel Dashboard）
3. Slack App の Redirect URL を更新
4. ユーザーにインストールリンクを共有:
```
https://your-app.vercel.app/setup-wizard/install
```

## セキュリティ考慮事項

1. **Token 保護**
   - Bot Token は Vercel KV に暗号化保存
   - クライアント側には公開しない

2. **CSRF 対策**
   - Slack OAuth の `state` パラメータ（今後実装推奨）

3. **データ有効期限**
   - 一時チャンネルデータは10分で自動削除
   - 期限切れデータは適切にエラーハンドリング

## トラブルシューティング

### エラー: "Channel data not found or expired"

原因: チャンネル選択画面で10分以上経過した

解決策: 最初からやり直す（「Slackに追加」ボタンから）

### エラー: "Missing team_id parameter"

原因: OAuth コールバックが正しく処理されなかった

解決策:
- Redirect URL が正しく設定されているか確認
- 環境変数が正しいか確認

### エラー: "OAuth認証に失敗しました"

原因: Client ID/Secret が間違っている

解決策:
- `.env` ファイルの `SLACK_CLIENT_ID` と `SLACK_CLIENT_SECRET` を確認
- Slack App の Credentials と一致しているか確認

## 今後の改善案

1. **State パラメータの追加**
   - CSRF 対策のため OAuth に state を追加

2. **チャンネル選択の永続化**
   - 設定変更機能の追加
   - 管理画面からのチャンネル追加/削除

3. **複数ワークスペース対応**
   - 1つのアプリで複数の Slack ワークスペースに対応

4. **インストール状態の表示**
   - 既にインストール済みの場合の処理
   - 再インストールのフロー

## 関連ドキュメント

- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
