# マルチテナント設定システム

Issue #19 の一部として実装されたマルチテナント基盤のドキュメント

## 概要

複数のユーザーが独自の設定を保存・管理できるマルチテナント設定システムです。
Vercel KVなどの外部DBを使用せず、**環境変数とlocalStorageを組み合わせた簡易実装**です。

## アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│              クライアントサイド                   │
│  ┌──────────────────────────────────────────┐   │
│  │  React Component                         │   │
│  │  - useConfig() Hook使用                  │   │
│  └──────────────┬───────────────────────────┘   │
│                 │                               │
│  ┌──────────────▼───────────────────────────┐   │
│  │  localStorage                            │   │
│  │  - ユーザー設定の永続化                   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              サーバーサイド                       │
│  ┌──────────────────────────────────────────┐   │
│  │  API Routes                              │   │
│  │  - GET/POST/PUT/DELETE /api/config       │   │
│  └──────────────┬───────────────────────────┘   │
│                 │                               │
│  ┌──────────────▼───────────────────────────┐   │
│  │  環境変数                                 │   │
│  │  - USER_CONFIG_<USER_ID>="{...}"         │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## ファイル構成

```
web/
├── src/
│   ├── lib/
│   │   ├── types/
│   │   │   └── config.ts          # 型定義
│   │   ├── hooks/
│   │   │   └── useConfig.ts       # React Hook
│   │   └── config.ts               # 設定管理ユーティリティ
│   └── app/
│       └── api/
│           └── config/
│               └── route.ts        # API Route
└── CONFIG_SYSTEM.md                # このドキュメント
```

## データ構造

### UserConfig

```typescript
interface UserConfig {
  id: string;                          // ユニークなユーザーID
  slackBotToken?: string;              // Slack Bot Token (xoxb-...)
  slackChannels: string[];             // Slack Channel IDs
  larkWebhookUrl?: string;             // Lark Webhook URL
  userMappings: Record<string, string>; // Lark Open ID → Slack User ID
  createdAt?: string;                  // 作成日時 (ISO 8601)
  updatedAt?: string;                  // 更新日時 (ISO 8601)
}
```

## 使用方法

### 1. クライアントサイドでの設定管理

React コンポーネント内で `useConfig` Hookを使用します。

```tsx
'use client';

import { useConfig } from '@/lib/hooks/useConfig';

export default function SettingsPage() {
  const { config, loading, error, saveConfig } = useConfig('user-123');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const handleSave = async () => {
    const newConfig = {
      ...config!,
      slackChannels: ['C123456', 'C789012'],
      larkWebhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
    };

    const success = await saveConfig(newConfig);
    if (success) {
      alert('Saved!');
    }
  };

  return (
    <div>
      <h1>Settings</h1>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### 2. サーバーサイドでの設定取得

環境変数から設定を取得します。

```typescript
import { getConfig } from '@/lib/config';

export async function GET(request: Request) {
  const userId = 'user-123';
  const config = getConfig(userId);

  if (!config) {
    return Response.json({ error: 'Config not found' }, { status: 404 });
  }

  // 設定を使用
  console.log('Slack Channels:', config.slackChannels);

  return Response.json({ success: true });
}
```

### 3. 環境変数の設定

Vercelの環境変数に以下の形式で設定します。

```bash
# ユーザーID "user-123" の設定
USER_CONFIG_USER_123='{"id":"user-123","slackBotToken":"xoxb-...","slackChannels":["C123456"],"larkWebhookUrl":"https://...","userMappings":{"ou_xxx":"U123456"}}'

# ユーザーID "company-abc" の設定
USER_CONFIG_COMPANY_ABC='{"id":"company-abc","slackBotToken":"xoxb-...","slackChannels":["C999888"],"larkWebhookUrl":"https://...","userMappings":{}}'
```

**注意**: 環境変数名はユーザーIDを大文字に変換し、英数字以外をアンダースコアに置き換えます。

例:
- `user-123` → `USER_CONFIG_USER_123`
- `company.abc` → `USER_CONFIG_COMPANY_ABC`
- `test@example` → `USER_CONFIG_TEST_EXAMPLE`

## API エンドポイント

### GET /api/config

設定を取得します。

**リクエスト**:
```
GET /api/config?userId=user-123
```

**レスポンス**:
```json
{
  "success": true,
  "config": {
    "id": "user-123",
    "slackBotToken": "xoxb-...",
    "slackChannels": ["C123456"],
    "larkWebhookUrl": "https://...",
    "userMappings": {
      "ou_xxx": "U123456"
    },
    "createdAt": "2025-12-19T10:00:00.000Z",
    "updatedAt": "2025-12-19T10:00:00.000Z"
  }
}
```

### POST /api/config

設定を保存します（バリデーションのみ、実際の保存はクライアントサイド）。

**リクエスト**:
```json
{
  "config": {
    "id": "user-123",
    "slackBotToken": "xoxb-...",
    "slackChannels": ["C123456"],
    "larkWebhookUrl": "https://...",
    "userMappings": {}
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "config": {
    "id": "user-123",
    "slackBotToken": "xoxb-...",
    "slackChannels": ["C123456"],
    "larkWebhookUrl": "https://...",
    "userMappings": {},
    "updatedAt": "2025-12-19T10:00:00.000Z"
  }
}
```

### PUT /api/config

POSTと同じ（設定を更新）。

### DELETE /api/config

設定を削除します（クライアントサイドでlocalStorageから削除）。

**リクエスト**:
```
DELETE /api/config?userId=user-123
```

**レスポンス**:
```json
{
  "success": true
}
```

## ユーティリティ関数

### validateConfig(config)

設定のバリデーションを行います。

```typescript
import { validateConfig } from '@/lib/config';

const validation = validateConfig(config);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### getConfigFromStorage(userId)

localStorageから設定を取得します（クライアントサイドのみ）。

```typescript
import { getConfigFromStorage } from '@/lib/config';

const config = getConfigFromStorage('user-123');
```

### saveConfigToStorage(config)

localStorageに設定を保存します（クライアントサイドのみ）。

```typescript
import { saveConfigToStorage } from '@/lib/config';

const success = saveConfigToStorage(config);
```

### getConfigFromEnv(userId)

環境変数から設定を取得します（サーバーサイドのみ）。

```typescript
import { getConfigFromEnv } from '@/lib/config';

const config = getConfigFromEnv('user-123');
```

### createDefaultConfig(userId)

デフォルト設定を生成します。

```typescript
import { createDefaultConfig } from '@/lib/config';

const defaultConfig = createDefaultConfig('user-123');
```

### mergeConfig(base, overrides)

設定をマージします。

```typescript
import { mergeConfig } from '@/lib/config';

const merged = mergeConfig(baseConfig, {
  slackChannels: ['C999888'],
});
```

## バリデーションルール

以下のルールで設定をバリデーションします：

1. **User ID**: 必須、空でない文字列
2. **Slack Channels**: 配列である必要がある
3. **User Mappings**: オブジェクトである必要がある
4. **Slack Bot Token**: オプショナル、存在する場合は `xoxb-` で始まる
5. **Lark Webhook URL**: オプショナル、存在する場合は有効なURL

## セキュリティ考慮事項

### 1. 機密情報の取り扱い

- **サーバーサイド**: 環境変数に保存（Vercelの暗号化された環境変数）
- **クライアントサイド**: localStorageに保存（ブラウザのsame-origin policyで保護）

### 2. 環境変数の管理

Vercelで環境変数を設定する際は、以下に注意してください：

- Production/Preview/Development環境を分ける
- 必要最小限の権限のトークンを使用
- 定期的にトークンをローテーション

### 3. localStorage の制限

- ブラウザのlocalStorageは5-10MB程度の容量制限あり
- 機密情報をlocalStorageに保存する場合は注意が必要
- ユーザーが手動でlocalStorageをクリアすると設定が消える

### 4. 推奨事項

本番環境では以下の対策を推奨します：

- 可能であればVercel KVなどのデータベースを使用
- APIエンドポイントに認証を追加
- HTTPS必須
- CSRFトークンの実装

## 制限事項

### 1. スケーラビリティ

- 少人数向けの簡易実装
- 大規模なマルチテナント環境では不向き
- 環境変数の数に制限あり（Vercelは4KB/変数、最大100変数）

### 2. 機能制限

- リアルタイム同期なし
- バージョン管理なし
- 監査ログなし
- ロールベースアクセス制御なし

### 3. データ永続性

- クライアントサイド: ブラウザに依存
- サーバーサイド: 環境変数の手動管理が必要

## トラブルシューティング

### 設定が取得できない

1. ユーザーIDが正しいか確認
2. 環境変数名が正しい形式か確認（大文字、アンダースコア）
3. JSONの形式が正しいか確認
4. Vercelで環境変数が設定されているか確認

### 設定が保存できない

1. ブラウザのlocalStorageが有効か確認
2. バリデーションエラーがないか確認
3. ブラウザの容量制限に達していないか確認

### TypeScriptエラー

```bash
# 型チェック
npx tsc --noEmit

# ビルド
npm run build
```

## 今後の拡張

将来的に以下の機能を追加することを検討：

1. **データベース統合**
   - Vercel KV、Supabase、Firebaseなど

2. **認証・認可**
   - NextAuth.js統合
   - ロールベースアクセス制御

3. **監査ログ**
   - 設定変更の履歴管理
   - バージョン管理

4. **バリデーション強化**
   - Zodなどのスキーマ検証ライブラリ
   - より詳細なエラーメッセージ

5. **UI改善**
   - 設定画面の実装
   - リアルタイムプレビュー

## テスト

```bash
# ビルド（型チェック含む）
npm run build

# Lintチェック
npm run lint

# 開発サーバー起動
npm run dev
```

## ライセンス

このプロジェクトのライセンスに従います。

---

**実装日**: 2025-12-19
**Issue**: #19
**実装者**: CodeGenAgent (Claude Sonnet 4)
