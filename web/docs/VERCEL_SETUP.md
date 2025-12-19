# Vercel デプロイ完全ガイド

このガイドでは、Slack-Lark双方向通信をVercelのみで構築する手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [Step 1: Vercel環境変数の設定](#step-1-vercel環境変数の設定)
3. [Step 2: Slack Appの設定変更](#step-2-slack-appの設定変更)
4. [Step 3: Lark Appの設定](#step-3-lark-appの設定)
5. [Step 4: 動作確認](#step-4-動作確認)
6. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

以下が完了していることを確認してください：

- [ ] Vercelにデプロイ済み（URL: https://slack-to-lark-notifier.vercel.app/）
- [ ] Slack Appが作成済み（Bot Token取得済み）
- [ ] Lark Webhookが作成済み（Webhook URL取得済み）

---

## Step 1: Vercel環境変数の設定

### 1.1 Vercelダッシュボードを開く

1. [vercel.com/dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクト「slack-to-lark-notifier」をクリック
3. 上部メニューから **Settings** をクリック
4. 左メニューから **Environment Variables** をクリック

### 1.2 環境変数を追加

以下の環境変数を1つずつ追加します。

| 変数名 | 値の取得方法 | 例 |
|--------|-------------|-----|
| `SLACK_BOT_TOKEN` | Slack App > OAuth & Permissions > Bot User OAuth Token | `xoxb-1234567890-...` |
| `SLACK_SIGNING_SECRET` | Slack App > Basic Information > Signing Secret | `abc123def456...` |
| `SLACK_CHANNEL_ID` | Slackチャンネル詳細の一番下 | `C0123456789` |
| `LARK_WEBHOOK_URL` | Larkグループ > ボット > Webhook URL | `https://open.larksuite.com/open-apis/bot/v2/hook/...` |
| `LARK_APP_SECRET` | Lark Developer Console > Credentials > App Secret | `xxxxx` |

### 1.3 環境変数の追加手順（各変数ごとに実行）

1. **Name** に変数名を入力（例: `SLACK_BOT_TOKEN`）
2. **Value** に値を入力
3. **Environment** は全て選択（Production, Preview, Development）
4. **Add** をクリック

### 1.4 再デプロイ

環境変数設定後、必ず再デプロイが必要です：

1. **Deployments** タブをクリック
2. 最新のデプロイの右側「...」をクリック
3. **Redeploy** をクリック
4. **Redeploy** を確認

---

## Step 2: Slack Appの設定変更

Socket ModeからEvents APIに切り替えます。

### 2.1 Slack App管理画面を開く

1. [api.slack.com/apps](https://api.slack.com/apps) にアクセス
2. 作成したアプリをクリック

### 2.2 Socket Modeを無効化

1. 左メニュー **Socket Mode** をクリック
2. **Enable Socket Mode** を **OFF** にする

### 2.3 Event Subscriptionsを有効化

1. 左メニュー **Event Subscriptions** をクリック
2. **Enable Events** を **ON** にする
3. **Request URL** に以下を入力：

```
https://slack-to-lark-notifier.vercel.app/api/slack/events
```

4. ✅ **Verified** と表示されることを確認

> **Verifiedにならない場合**:
> - Vercelの再デプロイが完了しているか確認
> - 環境変数 `SLACK_SIGNING_SECRET` が正しいか確認

### 2.4 Subscribe to bot eventsを設定

**Request URL** の下にある **Subscribe to bot events** セクションで：

1. **Add Bot User Event** をクリック
2. 以下のイベントを追加：
   - `message.channels` - パブリックチャンネルのメッセージ
   - `message.groups` - プライベートチャンネルのメッセージ

3. **Save Changes** をクリック

### 2.5 アプリを再インストール（重要）

設定変更後は再インストールが必要です：

1. 左メニュー **Install App** をクリック
2. **Reinstall to Workspace** をクリック
3. **許可する** をクリック

---

## Step 3: Lark Appの設定

Lark → Slack の転送を設定します。

### 3.1 Lark Developer Consoleを開く

1. [open.larksuite.com/app](https://open.larksuite.com/app) にアクセス
2. 作成したアプリをクリック（なければ新規作成）

### 3.2 App Secretを取得

1. **Credentials & Basic Info** をクリック
2. **App Secret** の目のアイコンをクリックして表示
3. コピーしてVercelの環境変数 `LARK_APP_SECRET` に設定
4. Vercelを再デプロイ

### 3.3 Event Subscriptionsを設定

1. 左メニュー **Event Subscriptions** をクリック
2. **Request URL** に以下を入力：

```
https://slack-to-lark-notifier.vercel.app/api/lark/webhook
```

3. ✅ 検証が成功することを確認

### 3.4 イベントを追加

1. **Add Events** をクリック
2. `im.message.receive_v1` を追加（メッセージ受信）

### 3.5 Permissionsを設定

1. 左メニュー **Permissions & Scopes** をクリック
2. 以下のスコープを追加：
   - `im:message` - メッセージ読み取り
   - `im:message:send_as_bot` - Botとしてメッセージ送信

### 3.6 アプリを公開

1. **Version Management & Release** をクリック
2. **Create Version** をクリック
3. 必要事項を入力して **Submit for Review**

---

## Step 4: 動作確認

### 4.1 Slack → Lark のテスト

1. Slackで監視対象チャンネルを開く
2. チャンネル設定 > インテグレーション > **アプリを追加**
3. 作成したアプリを追加
4. メッセージを送信
5. Larkグループに転送されることを確認

### 4.2 Lark → Slack のテスト

1. Larkで作成したBotにメッセージを送信
2. Slackの指定チャンネルに転送されることを確認

---

## トラブルシューティング

### Q: Request URLの検証に失敗する

**原因**: 環境変数が設定されていない、または再デプロイされていない

**解決策**:
1. Vercelの環境変数を確認
2. Redeployを実行
3. 数分待ってから再試行

### Q: メッセージが転送されない

**原因**: Botがチャンネルに追加されていない

**解決策**:
1. Slackでチャンネルを開く
2. チャンネル名をクリック > インテグレーション > アプリを追加
3. 作成したアプリを選択

### Q: Vercelのログを確認したい

1. Vercelダッシュボード > プロジェクト
2. **Logs** タブをクリック
3. **Functions** を選択
4. `/api/slack/events` または `/api/lark/webhook` のログを確認

### Q: 「Verified」にならない

**確認事項**:
1. URLが正確か（末尾のスラッシュに注意）
2. 環境変数が設定されているか
3. Vercelの再デプロイが完了しているか

正しいURL:
- Slack: `https://slack-to-lark-notifier.vercel.app/api/slack/events`
- Lark: `https://slack-to-lark-notifier.vercel.app/api/lark/webhook`

---

## 環境変数一覧

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `SLACK_BOT_TOKEN` | ✅ | Bot User OAuth Token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | ✅ | リクエスト署名検証用 |
| `SLACK_CHANNEL_ID` | ✅ | 転送先SlackチャンネルID (C...) |
| `LARK_WEBHOOK_URL` | ✅ | Lark Webhook URL |
| `LARK_APP_SECRET` | 双方向時 | Lark App Secret（Credentials画面から取得） |

---

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/slack/events` | POST | Slack Events API受信 |
| `/api/slack/events` | GET | ヘルスチェック |
| `/api/lark/webhook` | POST | Lark Events受信 |
| `/api/lark/webhook` | GET | ヘルスチェック |

---

## アーキテクチャ図

```
┌─────────────┐     Events API      ┌─────────────────────┐
│   Slack     │ ─────────────────→  │  Vercel             │
│  チャンネル  │                     │  /api/slack/events  │
└─────────────┘                     └──────────┬──────────┘
                                               │
                                               │ Webhook POST
                                               ▼
                                    ┌─────────────────────┐
                                    │   Lark グループ      │
                                    └─────────────────────┘

┌─────────────┐     Events          ┌─────────────────────┐
│   Lark      │ ─────────────────→  │  Vercel             │
│    Bot      │                     │  /api/lark/webhook  │
└─────────────┘                     └──────────┬──────────┘
                                               │
                                               │ Slack API
                                               ▼
                                    ┌─────────────────────┐
                                    │  Slack チャンネル    │
                                    └─────────────────────┘
```

---

最終更新: 2024年12月
