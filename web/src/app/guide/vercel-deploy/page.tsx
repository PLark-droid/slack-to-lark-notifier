import Link from "next/link";

export default function VercelDeployGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ホームに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Vercel デプロイガイド
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            サーバーレスで完結する構成
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Introduction */}
        <section className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Vercelで完結する構成
          </h2>
          <p className="text-blue-700 mb-3">
            ngrokやローカルサーバー不要。Vercelだけで双方向通信を実現します。
          </p>
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2">構成イメージ:</h3>
            <div className="text-sm text-gray-600 font-mono space-y-1">
              <div>Slack → /api/slack/events → Lark Webhook</div>
              <div>Lark → /api/lark/webhook → Slack API</div>
            </div>
          </div>
        </section>

        {/* Step 1 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              1
            </span>
            Vercelにデプロイ
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">1.1</span>
              <div>
                GitHubにリポジトリをプッシュ（既に完了している場合はスキップ）
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">1.2</span>
              <div>
                <a
                  href="https://vercel.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  vercel.com/new
                </a>{" "}
                で新しいプロジェクトを作成
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">1.3</span>
              <div>GitHubリポジトリを選択してインポート</div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">1.4</span>
              <div>
                <strong>Root Directory</strong> を <code className="bg-gray-800 text-white px-2 py-0.5 rounded">web</code> に設定
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">1.5</span>
              <div>
                <strong className="bg-green-100 text-green-800 px-2 py-0.5 rounded">Deploy</strong> をクリック
              </div>
            </li>
          </ol>
        </section>

        {/* Step 2 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              2
            </span>
            環境変数を設定
          </h2>
          <p className="text-gray-600 mb-4">
            Vercelダッシュボードで環境変数を設定します。
          </p>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">2.1</span>
              <div>
                プロジェクトの <strong>Settings</strong> → <strong>Environment Variables</strong> を開く
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">2.2</span>
              <div>
                以下の環境変数を追加:
                <table className="mt-3 w-full text-sm border rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 border-b font-bold text-gray-900">変数名</th>
                      <th className="text-left p-2 border-b font-bold text-gray-900">説明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-b"><code className="bg-gray-800 text-white px-1 rounded text-xs">SLACK_BOT_TOKEN</code></td>
                      <td className="p-2 border-b">xoxb-で始まるトークン</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b"><code className="bg-gray-800 text-white px-1 rounded text-xs">SLACK_SIGNING_SECRET</code></td>
                      <td className="p-2 border-b">リクエスト検証用</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b"><code className="bg-gray-800 text-white px-1 rounded text-xs">SLACK_CHANNEL_ID</code></td>
                      <td className="p-2 border-b">転送先チャンネルID</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b"><code className="bg-gray-800 text-white px-1 rounded text-xs">LARK_WEBHOOK_URL</code></td>
                      <td className="p-2 border-b">Lark Webhook URL</td>
                    </tr>
                    <tr>
                      <td className="p-2"><code className="bg-gray-800 text-white px-1 rounded text-xs">LARK_VERIFICATION_TOKEN</code></td>
                      <td className="p-2">Lark検証トークン（双方向用）</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">2.3</span>
              <div>
                環境変数設定後、<strong>Redeploy</strong> を実行
              </div>
            </li>
          </ol>
        </section>

        {/* Step 3 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              3
            </span>
            Slack App を Events API に切り替え
          </h2>
          <p className="text-gray-600 mb-4">
            Socket Mode から Events API に変更します。
          </p>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.1</span>
              <div>
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  api.slack.com/apps
                </a>{" "}
                でアプリを開く
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.2</span>
              <div>
                <strong>Socket Mode</strong> を <strong className="text-red-600">無効化（OFF）</strong>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.3</span>
              <div>
                <strong>Event Subscriptions</strong> を開く
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.4</span>
              <div>
                <strong>Enable Events</strong> を ON にする
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.5</span>
              <div>
                <strong>Request URL</strong> に以下を入力:
                <code className="block bg-gray-800 text-white px-3 py-2 rounded mt-2 text-sm break-all">
                  https://あなたのアプリ.vercel.app/api/slack/events
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.6</span>
              <div>
                <strong>Subscribe to bot events</strong> で以下を追加:
                <ul className="mt-2 ml-4 space-y-1">
                  <li>
                    <code className="bg-gray-800 text-white px-2 py-0.5 rounded text-xs">message.channels</code> - パブリックチャンネル
                  </li>
                  <li>
                    <code className="bg-gray-800 text-white px-2 py-0.5 rounded text-xs">message.groups</code> - プライベートチャンネル
                  </li>
                </ul>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.7</span>
              <div>
                <strong className="bg-green-100 text-green-800 px-2 py-0.5 rounded">Save Changes</strong> をクリック
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Verified</strong> と表示されれば成功です。
              エラーが出る場合は、環境変数が正しく設定されているか確認してください。
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              4
            </span>
            Lark App を設定（双方向通信用）
          </h2>
          <p className="text-gray-600 mb-4">
            Lark → Slack の転送を設定します。
          </p>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">4.1</span>
              <div>
                <a
                  href="https://open.larksuite.com/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Lark Developer Console
                </a>{" "}
                でアプリを開く
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">4.2</span>
              <div>
                <strong>Event Subscriptions</strong> → <strong>Request URL</strong>:
                <code className="block bg-gray-800 text-white px-3 py-2 rounded mt-2 text-sm break-all">
                  https://あなたのアプリ.vercel.app/api/lark/webhook
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">4.3</span>
              <div>
                <strong>Add Events</strong> で <code className="bg-gray-800 text-white px-2 py-0.5 rounded text-xs">im.message.receive_v1</code> を追加
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">4.4</span>
              <div>
                <strong>Credentials & Basic Info</strong> から <strong>Verification Token</strong> をコピーして環境変数に設定
              </div>
            </li>
          </ol>
        </section>

        {/* Step 5 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              5
            </span>
            動作確認
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-gray-900 mb-2">Slack → Lark のテスト</h3>
              <ol className="text-green-700 text-sm space-y-1">
                <li>1. Slackの監視対象チャンネルでメッセージを送信</li>
                <li>2. Larkにメッセージが転送されることを確認</li>
              </ol>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-bold text-gray-900 mb-2">Lark → Slack のテスト</h3>
              <ol className="text-purple-700 text-sm space-y-1">
                <li>1. Lark Botにメッセージを送信</li>
                <li>2. Slackの指定チャンネルに転送されることを確認</li>
              </ol>
            </div>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="bg-gray-50 rounded-xl p-6 border mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            API エンドポイント
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">GET</span>
                <code className="text-sm">/api/slack/events</code>
              </div>
              <p className="text-sm text-gray-600">ヘルスチェック</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                <code className="text-sm">/api/slack/events</code>
              </div>
              <p className="text-sm text-gray-600">Slack Events API 受信</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">GET</span>
                <code className="text-sm">/api/lark/webhook</code>
              </div>
              <p className="text-sm text-gray-600">ヘルスチェック</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                <code className="text-sm">/api/lark/webhook</code>
              </div>
              <p className="text-sm text-gray-600">Lark Events 受信</p>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            トラブルシューティング
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Q: Request URL の検証に失敗する</h3>
              <p className="text-gray-600 text-sm">
                A: 環境変数が正しく設定されているか確認してください。
                設定後は必ず <strong>Redeploy</strong> が必要です。
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Q: メッセージが転送されない</h3>
              <p className="text-gray-600 text-sm">
                A: Vercelの <strong>Functions</strong> ログを確認してください。
                エラーがあれば環境変数やWebhook URLを確認してください。
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Q: Botがチャンネルにいない</h3>
              <p className="text-gray-600 text-sm">
                A: Slackでチャンネルにアプリを招待してください。
                チャンネル設定 → インテグレーション → アプリを追加
              </p>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link
            href="/guide/slack-app"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Slack App 設定
          </Link>
          <Link
            href="/setup"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            設定を入力 →
          </Link>
        </div>
      </main>
    </div>
  );
}
