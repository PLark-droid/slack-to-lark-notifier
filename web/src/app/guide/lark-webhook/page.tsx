import Link from "next/link";

export default function LarkWebhookGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ホームに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Lark Webhook 設定ガイド
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Introduction */}
        <section className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            Webhook とは？
          </h2>
          <p className="text-blue-700">
            Webhookは、外部サービスからLarkグループにメッセージを送信するための仕組みです。
            URLを取得するだけで、プログラムからLarkへ通知を送れるようになります。
          </p>
        </section>

        {/* Step 1 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              1
            </span>
            通知を受け取るグループを開く
          </h2>
          <p className="text-gray-600 mb-4">
            Larkアプリで、Slackからの通知を受け取りたいグループチャットを開きます。
          </p>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              💡 新しいグループを作成する場合は、「+」ボタンから「グループチャットを作成」を選択してください。
            </p>
          </div>
        </section>

        {/* Step 2 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              2
            </span>
            グループ設定を開く
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">2.1</span>
              <div>
                グループ名の横にある <strong>「...」</strong>（三点リーダー）をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">2.2</span>
              <div>
                <strong>「設定」</strong> または <strong>「Settings」</strong> を選択
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              💡 モバイルアプリの場合は、グループ名をタップして設定画面を開きます。
            </p>
          </div>
        </section>

        {/* Step 3 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              3
            </span>
            ボットを追加
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.1</span>
              <div>
                設定メニューから <strong>「ボット」</strong> または <strong>「Bots」</strong> を選択
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.2</span>
              <div>
                <strong>「ボットを追加」</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">3.3</span>
              <div>
                ボット一覧から <strong>「カスタムボット」</strong>（Custom Bot）を選択
              </div>
            </li>
          </ol>
        </section>

        {/* Step 4 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              4
            </span>
            カスタムボットを設定
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">4.1</span>
              <div>
                <strong>ボット名</strong>: 任意の名前（例: &quot;Slack通知&quot;）
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">4.2</span>
              <div>
                <strong>説明</strong>: 任意（例: &quot;Slackからのメッセージ転送&quot;）
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-blue-600">4.3</span>
              <div>
                <strong className="bg-green-100 px-2 py-0.5 rounded">追加</strong> をクリック
              </div>
            </li>
          </ol>
        </section>

        {/* Step 5 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              5
            </span>
            Webhook URL をコピー
          </h2>
          <p className="text-gray-600 mb-4">
            ボットが追加されると、Webhook URLが表示されます。
          </p>
          <div className="bg-gray-100 p-4 rounded-lg mb-4 font-mono text-sm break-all">
            https://open.larksuite.com/open-apis/bot/v2/hook/xxxxxxxxx
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ このURLは秘密情報です。他人に共有しないでください。
              このURLを知っている人は誰でもこのグループにメッセージを送信できます。
            </p>
          </div>
        </section>

        {/* Summary */}
        <section className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-4">
            ✅ 取得できた情報
          </h2>
          <ul className="space-y-2 text-green-700">
            <li className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <strong>Lark Webhook URL</strong>（https://open.larksuite.com/...）
            </li>
          </ul>
        </section>

        {/* Test */}
        <section className="bg-white rounded-xl p-6 shadow-md mt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🧪</span>
            動作確認
          </h2>
          <p className="text-gray-600 mb-4">
            Webhook URLが正しく機能するかテストできます。
            以下のコマンドをターミナルで実行してください:
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>{`curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"msg_type":"text","content":{"text":"テストメッセージ"}}' \\
  "あなたのWebhook URL"`}</pre>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Larkグループに「テストメッセージ」が表示されれば成功です。
          </p>
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
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            次へ: 設定を入力 →
          </Link>
        </div>
      </main>
    </div>
  );
}
