import Link from "next/link";

export default function SlackConnectGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ホームに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Slack Connect 設定ガイド
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            外部組織との共有チャンネルを監視する場合の追加設定
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* What is Slack Connect */}
        <section className="bg-orange-50 rounded-xl p-6 border border-orange-200 mb-6">
          <h2 className="text-lg font-semibold text-orange-800 mb-3">
            🔗 Slack Connect とは？
          </h2>
          <p className="text-orange-700 mb-4">
            <strong>Slack Connect</strong>は、異なる会社・組織のSlackワークスペース間で
            チャンネルを共有できる機能です。
          </p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-800 mb-2">こんなチャンネルがSlack Connectです:</h3>
            <ul className="text-gray-600 space-y-1 text-sm">
              <li>• 取引先・パートナー企業との共有チャンネル</li>
              <li>• 外注業者とのコミュニケーションチャンネル</li>
              <li>• チャンネル名の横に「外部」や「Shared」マークがある</li>
              <li>• 異なるドメイン（@company.com）のメンバーがいる</li>
            </ul>
          </div>
          <p className="text-orange-600 text-sm">
            ⚠️ Slack Connectチャンネルを監視する場合は、
            通常の Bot Token に加えて <strong>User Token</strong> が必要です。
          </p>
        </section>

        {/* Check if you need this */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🤔</span>
            この設定が必要かどうか確認
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">
                ✅ 以下の場合は不要です（通常設定でOK）
              </h3>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• 社内メンバーのみのチャンネルを監視する</li>
                <li>• 外部との共有チャンネルがない</li>
              </ul>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-medium text-orange-800 mb-2">
                ⚠️ 以下の場合はこの設定が必要です
              </h3>
              <ul className="text-orange-700 text-sm space-y-1">
                <li>• パートナー企業との共有チャンネルを監視したい</li>
                <li>• Slack Connectで接続されたチャンネルがある</li>
                <li>• 「外部」マークのあるチャンネルを監視したい</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Why User Token is needed */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💡</span>
            なぜ User Token が必要なのか
          </h2>
          <p className="text-gray-600 mb-4">
            Slack Connect チャンネルでは、セキュリティ上の理由から
            Bot Token ではメッセージを取得できません。
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Bot Token（xoxb-）</h3>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>✅ 社内チャンネル: OK</li>
                <li>❌ Slack Connect: アクセス不可</li>
              </ul>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="font-medium text-orange-800 mb-2">User Token（xoxp-）</h3>
              <ul className="text-orange-700 text-sm space-y-1">
                <li>✅ 社内チャンネル: OK</li>
                <li>✅ Slack Connect: アクセス可能</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Step 1 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
              1
            </span>
            User Token Scopes を追加
          </h2>
          <p className="text-gray-600 mb-4">
            既に作成した Slack App に User Token 用のスコープを追加します。
          </p>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">1.1</span>
              <div>
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  api.slack.com/apps
                </a> で作成したアプリを開く
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">1.2</span>
              <div>
                左メニューから <strong>&quot;OAuth & Permissions&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">1.3</span>
              <div>
                <strong>&quot;User Token Scopes&quot;</strong> セクションを見つける
                <p className="text-sm text-gray-500 mt-1">
                  （Bot Token Scopes の下にあります）
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">1.4</span>
              <div>
                以下のスコープを追加:
                <ul className="mt-2 ml-4 space-y-1">
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">channels:history</code></li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">channels:read</code></li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">groups:history</code></li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">groups:read</code></li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">users:read</code></li>
                </ul>
              </div>
            </li>
          </ol>
        </section>

        {/* Step 2 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
              2
            </span>
            アプリを再インストール
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">2.1</span>
              <div>
                ページ上部に表示される
                <strong className="bg-yellow-100 px-2 py-0.5 rounded mx-1">
                  reinstall your app
                </strong>
                をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">2.2</span>
              <div>
                権限を確認して <strong>&quot;Allow&quot;</strong> をクリック
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ User Token Scopes を追加した後は、必ず再インストールが必要です。
            </p>
          </div>
        </section>

        {/* Step 3 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
              3
            </span>
            User Token を取得
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">3.1</span>
              <div>
                <strong>&quot;OAuth & Permissions&quot;</strong> ページに戻る
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">3.2</span>
              <div>
                <strong>&quot;OAuth Tokens for Your Workspace&quot;</strong> セクションで
                <strong> User OAuth Token</strong>（xoxp-で始まる）をコピー
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Bot User OAuth Token</strong>（xoxb-）とは別のトークンです。
              間違えないように注意してください。
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
              4
            </span>
            監視するチャンネルIDを確認
          </h2>
          <p className="text-gray-600 mb-4">
            Slack Connect チャンネルのIDを取得します。
          </p>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">4.1</span>
              <div>
                Slackで監視したいチャンネルを開く
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">4.2</span>
              <div>
                チャンネル名をクリックして詳細を表示
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-orange-600">4.3</span>
              <div>
                一番下までスクロールして <strong>チャンネルID</strong> をコピー
                <p className="text-sm text-gray-500 mt-1">
                  （C から始まる文字列、例: C0123456789）
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Summary */}
        <section className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-4">
            ✅ Slack Connect 設定で追加で必要な情報
          </h2>
          <ul className="space-y-2 text-green-700">
            <li className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <strong>User Token</strong>（xoxp-で始まる）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <strong>監視するチャンネルID</strong>（C で始まる）
            </li>
          </ul>
        </section>

        {/* Polling explanation */}
        <section className="bg-white rounded-xl p-6 shadow-md mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔄</span>
            ポーリング方式について
          </h2>
          <p className="text-gray-600 mb-4">
            Slack Connect チャンネルは、通常のイベント方式（Socket Mode）ではなく、
            <strong>ポーリング方式</strong>で監視します。
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">ポーリング方式の特徴:</h3>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• 定期的（デフォルト5秒ごと）にチャンネルをチェック</li>
              <li>• 新着メッセージがあれば Lark に転送</li>
              <li>• イベント方式より若干の遅延あり（最大5秒程度）</li>
              <li>• User Token の権限でアクセスするため Slack Connect でも動作</li>
            </ul>
          </div>
        </section>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link
            href="/guide/slack-app"
            className="text-gray-500 hover:text-gray-700"
          >
            ← 戻る: Slack App設定
          </Link>
          <Link
            href="/setup"
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            設定を入力する →
          </Link>
        </div>
      </main>
    </div>
  );
}
