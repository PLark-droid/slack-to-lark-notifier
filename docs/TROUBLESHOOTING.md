# トラブルシューティング

よくある問題と解決方法をまとめています。

## 目次

1. [起動時のエラー](#起動時のエラー)
2. [Slack接続エラー](#slack接続エラー)
3. [Lark通知エラー](#lark通知エラー)
4. [メッセージが届かない](#メッセージが届かない)
5. [共有チャンネル関連](#共有チャンネル関連)

---

## 起動時のエラー

### 「設定エラー: SLACK_BOT_TOKEN が未設定です」

**原因**: 環境変数が正しく設定されていない

**解決方法**:
```bash
# .envファイルが存在するか確認
ls -la .env

# 環境変数が読み込まれているか確認
cat .env | grep SLACK_BOT_TOKEN
```

### 「Cannot find module 'dotenv/config'」

**原因**: 依存関係がインストールされていない

**解決方法**:
```bash
npm install
```

### 「EADDRINUSE: address already in use :::3000」

**原因**: ポート3000が既に使用されている

**解決方法**:
```bash
# 使用中のプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートを使用
PORT=3001 npm start
```

---

## Slack接続エラー

### 「An API error occurred: invalid_auth」

**原因**: Bot Tokenが無効または期限切れ

**解決方法**:
1. Slack APIでAppの設定を開く
2. 「OAuth & Permissions」でTokenを再生成
3. `.env`ファイルを更新

### 「An API error occurred: not_authed」

**原因**: Socket Mode用のApp-Level Tokenが無効

**解決方法**:
1. 「Basic Information」→「App-Level Tokens」で新しいTokenを生成
2. `SLACK_APP_TOKEN`を更新

### 「Error: Missing required scopes」

**原因**: Botに必要な権限が付与されていない

**必要なスコープ**:
- `channels:history`
- `channels:read`
- `groups:history`
- `groups:read`
- `chat:write`

**解決方法**:
1. 「OAuth & Permissions」でスコープを追加
2. 「Reinstall App」でアプリを再インストール

### 「WebSocket connection failed」

**原因**: Socket Modeが有効になっていない、またはネットワーク問題

**解決方法**:
1. 「Socket Mode」が有効か確認
2. ファイアウォールでWebSocket接続が許可されているか確認
3. プロキシ環境の場合は`HTTPS_PROXY`を設定

---

## Lark通知エラー

### 「Lark API error: 400 - Bad Request」

**原因**: Webhook URLが無効、またはメッセージ形式が不正

**解決方法**:
1. Webhook URLが正しいか確認
2. Lark管理画面でボットが有効か確認

### 「Lark API error: 403 - Forbidden」

**原因**: Webhookの権限問題

**解決方法**:
1. Larkでボットを再作成
2. 新しいWebhook URLを取得

### 「LARK_WEBHOOK_URL is not configured」

**原因**: 環境変数が設定されていない

**解決方法**:
```bash
# .envに追加
LARK_WEBHOOK_URL=https://open.larksuite.com/open-apis/bot/v2/hook/your-webhook-id
```

---

## メッセージが届かない

### チェックリスト

1. **Botがチャンネルに追加されているか**
   ```
   Slackチャンネル設定 → Integrations → Apps でBotを確認
   ```

2. **正しいチャンネルを監視しているか**
   ```bash
   # 起動ログで確認
   Loaded 15 channels for workspace primary
   ```

3. **チャンネルフィルターが設定されているか**
   ```bash
   # .envを確認
   WATCH_CHANNEL_IDS=C123456789  # 設定されている場合、このチャンネルのみ監視
   ```

4. **除外設定されていないか**
   ```bash
   EXCLUDE_CHANNEL_IDS=C123456789  # このチャンネルは除外される
   ```

### ログで確認

```bash
# メッセージ受信ログ
Message forwarded to Lark successfully

# エラーログ
Failed to forward message to Lark: [エラー詳細]
```

### プライベートチャンネルの場合

プライベートチャンネルからメッセージを受け取るには:
1. Botをプライベートチャンネルに招待
2. `groups:history`スコープが必要

---

## 共有チャンネル関連

### 「共有チャンネルのメッセージが届かない」

**原因**: Slack Connect設定が正しくない

**解決方法**:
1. `.env`で共有チャンネル監視を有効化:
   ```bash
   INCLUDE_SHARED_CHANNELS=true
   ```
2. アプリを再起動

### 「外部Workspaceからのメッセージが届かない」

**原因**: 外部WorkspaceにもBotをインストールする必要がある

**解決方法**（2つのアプローチ）:

**A. Slack Connect（共有チャンネル）を使用**
- 自分のWorkspaceのBotが共有チャンネルにアクセスできるようにする
- 相手からの招待を受け入れる

**B. 複数Workspace対応**
- 相手のWorkspaceにもBotをインストール
- `.env`で追加Workspace設定:
  ```bash
  SLACK_WORKSPACE_2_BOT_TOKEN=xoxb-partner-token
  SLACK_WORKSPACE_2_SIGNING_SECRET=partner-secret
  SLACK_WORKSPACE_2_APP_TOKEN=xapp-partner-token
  SLACK_WORKSPACE_2_NAME=Partner Company
  ```

### 「channel_id_changed エラー」

**原因**: 共有チャンネルになる際にチャンネルIDが変更された

**解決方法**: アプリは自動的に対応します。ログを確認:
```
Channel ID changed: G1234567890 -> C1234567890
```

---

## デバッグモード

詳細なログを有効にするには:

```bash
DEBUG=* npm run dev
```

または特定のモジュールのみ:

```bash
DEBUG=slack* npm run dev
```

---

## サポート

問題が解決しない場合:

1. [GitHub Issues](https://github.com/PLark-droid/slack-to-lark-notifier/issues) で報告
2. 以下の情報を含めてください:
   - エラーメッセージ全文
   - 環境（OS、Node.jsバージョン）
   - 再現手順
