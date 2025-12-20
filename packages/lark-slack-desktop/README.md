# Lark-Slack Desktop

SlackとLarkを双方向で接続するデスクトップアプリケーション。

## 特徴

- 🖥️ **デスクトップアプリ**: Mac/Windows対応
- 📌 **システムトレイ常駐**: バックグラウンドで動作
- 🔒 **セキュア**: 認証情報はOSのキーチェーンに保存
- 🚀 **簡単設定**: GUIで設定完結

## スクリーンショット

```
┌────────────────────────────────┐
│  🔗 Lark-Slack Connector  [●] │
├────────────────────────────────┤
│  📊 統計                       │
│  ┌─────────┐  ┌─────────┐     │
│  │   142   │  │    28   │     │
│  │Slack→   │  │Lark→    │     │
│  │  Lark   │  │ Slack   │     │
│  └─────────┘  └─────────┘     │
│                                │
│  🔌 接続状態                   │
│  💬 Slack        ✅            │
│  🐦 Lark         ✅            │
│                                │
│  📝 ログ                       │
│  12:34:56 メッセージ転送完了   │
│  12:34:50 #general → Lark     │
│                                │
│  [⚙️ 設定]        [▶️ 開始]   │
└────────────────────────────────┘
```

## 動作要件

- Node.js 18+
- Rust (Tauriビルド用)

## 開発

```bash
# 依存関係インストール
npm install

# 開発モード起動
npm run tauri:dev

# ビルド
npm run tauri:build
```

## 設定

アプリ内の設定画面から以下を入力:

### Slack
- **Bot Token** (`xoxb-...`): Slack Bot Token
- **Signing Secret**: Slack App Signing Secret
- **App Token** (`xapp-...`): Socket Mode用トークン

### Lark
- **Webhook URL**: Lark Incoming Webhook URL

## 技術スタック

- **Tauri**: デスクトップアプリフレームワーク
- **React**: フロントエンドUI
- **Rust**: バックエンド
- **lark-slack-connector**: コア転送ロジック

## セキュリティ

認証情報は以下に安全に保存されます:
- **macOS**: Keychain
- **Windows**: Credential Manager
- **Linux**: Secret Service (libsecret)

## ライセンス

MIT
