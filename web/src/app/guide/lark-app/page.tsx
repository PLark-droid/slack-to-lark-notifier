import Link from "next/link";

export default function LarkAppGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ホームに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Lark App 作成ガイド（双方向通信用）
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            LarkからSlackへ返信するための設定
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Introduction */}
        <section className="bg-purple-50 rounded-xl p-6 border border-purple-200 mb-6">
          <h2 className="text-lg font-semibold text-purple-800 mb-2">
            双方向通信とは？
          </h2>
          <p className="text-purple-700 mb-3">
            通常の設定では Slack → Lark の片方向のみです。
            双方向通信を有効にすると、Larkで送信したメッセージを
            Slackのスレッドに返信として送ることができます。
          </p>
          <p className="text-purple-600 text-sm">
            ⚠️ この設定は必須ではありません。片方向で十分な場合はスキップしてください。
          </p>
        </section>

        {/* Step 1 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              1
            </span>
            Lark Developer Console にアクセス
          </h2>
          <p className="text-gray-600 mb-4">
            Larkの開発者コンソールでアプリを作成します。
          </p>
          <a
            href="https://open.larksuite.com/app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Lark Developer Console を開く ↗
          </a>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              💡 Lark管理者アカウントでログインしてください。
              一般ユーザーはアプリを作成できない場合があります。
            </p>
          </div>
        </section>

        {/* Step 2 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              2
            </span>
            新しいアプリを作成
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">2.1</span>
              <div>
                <strong className="bg-green-100 px-2 py-0.5 rounded">Create App</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">2.2</span>
              <div>
                <strong>&quot;Create Custom App&quot;</strong> を選択
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">2.3</span>
              <div>
                <strong>App Name</strong>: 任意の名前（例: &quot;Slack連携&quot;）
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">2.4</span>
              <div>
                <strong>Description</strong>: 任意の説明
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">2.5</span>
              <div>
                <strong className="bg-green-100 px-2 py-0.5 rounded">Create</strong> をクリック
              </div>
            </li>
          </ol>
        </section>

        {/* Step 3 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              3
            </span>
            App ID と Verification Token を取得
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">3.1</span>
              <div>
                作成したアプリの設定ページを開く
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">3.2</span>
              <div>
                <strong>&quot;Credentials & Basic Info&quot;</strong> セクションを確認
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">3.3</span>
              <div>
                <strong>App ID</strong> をコピー
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">3.4</span>
              <div>
                <strong>Verification Token</strong> をコピー
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ App ID と Verification Token を安全な場所に保存してください。
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              4
            </span>
            イベント受信を設定
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">4.1</span>
              <div>
                左メニューから <strong>&quot;Event Subscriptions&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">4.2</span>
              <div>
                <strong>&quot;Request URL&quot;</strong> に以下を入力:
                <code className="block mt-2 bg-gray-800 text-white px-3 py-2 rounded text-sm break-all">
                  https://あなたのアプリ.vercel.app/api/lark/webhook
                </code>
                <p className="text-sm text-gray-500 mt-2">
                  例: https://slack-to-lark-notifier.vercel.app/api/lark/webhook
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">4.3</span>
              <div>
                <strong>&quot;Add Events&quot;</strong> をクリックして以下を追加:
                <ul className="mt-2 ml-4 space-y-1">
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">im.message.receive_v1</code> - メッセージ受信</li>
                </ul>
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Vercelにデプロイ済みの場合は、そのURLを使用してください。
              環境変数に <code className="bg-blue-100 px-1 rounded">LARK_VERIFICATION_TOKEN</code> の設定が必要です。
            </p>
          </div>
        </section>

        {/* Step 5 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              5
            </span>
            Permissions を設定
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">5.1</span>
              <div>
                左メニューから <strong>&quot;Permissions & Scopes&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">5.2</span>
              <div>
                以下のスコープを追加:
                <ul className="mt-2 ml-4 space-y-1">
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">im:message</code> - メッセージの読み取り</li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">im:message:send_as_bot</code> - Botとしてメッセージ送信</li>
                </ul>
              </div>
            </li>
          </ol>
        </section>

        {/* Step 6 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              6
            </span>
            アプリを公開
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">6.1</span>
              <div>
                <strong>&quot;Version Management & Release&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">6.2</span>
              <div>
                <strong>&quot;Create Version&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">6.3</span>
              <div>
                必要事項を入力して <strong>&quot;Submit for Review&quot;</strong>
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              💡 組織内のみで使用する場合は、管理者による承認後すぐに利用可能になります。
            </p>
          </div>
        </section>

        {/* Summary */}
        <section className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-4">
            ✅ 取得できた情報
          </h2>
          <p className="text-green-700 mb-4">
            双方向通信用に以下の情報が必要です:
          </p>
          <ul className="space-y-2 text-green-700">
            <li className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <strong>Lark App ID</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <strong>Lark Verification Token</strong>
            </li>
          </ul>
        </section>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link
            href="/guide/lark-webhook"
            className="text-gray-500 hover:text-gray-700"
          >
            ← 戻る: Lark Webhook設定
          </Link>
          <Link
            href="/guide/vercel-deploy"
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            次へ: Vercelにデプロイ →
          </Link>
        </div>
      </main>
    </div>
  );
}
