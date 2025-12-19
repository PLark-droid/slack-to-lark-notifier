/**
 * Configuration Demo Page
 *
 * マルチテナント設定システムのデモページ
 */

import ConfigExample from '@/components/ConfigExample';

export default function ConfigDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚙️</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                設定管理デモ
              </h1>
              <p className="text-sm text-gray-500">
                マルチテナント設定システムの動作確認
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h2 className="font-semibold text-blue-800 mb-2">このページについて</h2>
          <p className="text-blue-700 text-sm mb-2">
            このページは、マルチテナント設定システムの動作を確認するためのデモページです。
          </p>
          <ul className="text-blue-600 text-sm space-y-1 ml-4">
            <li>• ユーザーIDごとに異なる設定を保存できます</li>
            <li>• ブラウザのlocalStorageに保存されます</li>
            <li>• 環境変数からの読み込みにも対応しています</li>
          </ul>
        </div>

        <ConfigExample />

        <div className="mt-8 bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-bold mb-4">使い方</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">1. ユーザーIDを入力</h3>
              <p className="text-gray-600 text-sm">
                例: <code className="bg-gray-100 px-2 py-1 rounded">user-demo</code>、
                <code className="bg-gray-100 px-2 py-1 rounded">company-abc</code> など
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">2. 設定を入力</h3>
              <p className="text-gray-600 text-sm">
                Slack Bot Token、Channel IDs、Lark Webhook URLを入力します。
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">3. 保存ボタンをクリック</h3>
              <p className="text-gray-600 text-sm">
                localStorageに保存されます。ブラウザを閉じても設定は保持されます。
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">4. 確認方法</h3>
              <p className="text-gray-600 text-sm mb-2">
                ブラウザのDevToolsで確認できます：
              </p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
{`// Consoleで実行
localStorage.getItem('slack-to-lark-config:user-demo')

// または Application タブ > Local Storage`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-bold mb-4">技術詳細</h2>

          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>実装ファイル:</strong>
            </p>
            <ul className="ml-4 space-y-1">
              <li>• <code>/src/lib/types/config.ts</code> - 型定義</li>
              <li>• <code>/src/lib/config.ts</code> - 設定管理ユーティリティ</li>
              <li>• <code>/src/lib/hooks/useConfig.ts</code> - React Hook</li>
              <li>• <code>/src/app/api/config/route.ts</code> - API Routes</li>
            </ul>

            <p className="mt-4">
              <strong>ストレージ:</strong>
            </p>
            <ul className="ml-4 space-y-1">
              <li>• クライアントサイド: localStorage</li>
              <li>• サーバーサイド: 環境変数 (USER_CONFIG_*)</li>
            </ul>

            <p className="mt-4">
              <strong>詳細ドキュメント:</strong>
            </p>
            <ul className="ml-4 space-y-1">
              <li>• <code>/CONFIG_SYSTEM.md</code> - 技術ドキュメント</li>
              <li>• <code>/IMPLEMENTATION_SUMMARY.md</code> - 実装サマリー</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>Slack to Lark Notifier - Configuration System Demo</p>
          <p className="mt-1">Issue #19 - Multi-tenant Configuration</p>
        </div>
      </footer>
    </div>
  );
}
