import Link from "next/link";

export default function SlackAppGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ホームに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Slack App 作成ガイド
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Important: Customer work required */}
        <section className="bg-amber-50 rounded-xl p-6 border border-amber-200 mb-6">
          <h2 className="text-lg font-bold text-amber-800 mb-3">
            📌 お客様のワークスペースに連携する場合
          </h2>
          <p className="text-amber-700 mb-4">
            当社でSlack Appを作成し、お客様にインストールしてもらいます。
            お客様側の作業は最小限です。
          </p>

          <div className="bg-white rounded-lg p-4 border border-amber-200">
            <h3 className="font-semibold text-gray-900 mb-3">
              お客様にお願いする作業（3ステップ）
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <span className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                <div>
                  <p className="text-gray-800 font-medium">インストールリンクをクリック</p>
                  <p className="text-gray-500 text-sm">当社から共有されたURLを開く</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                <div>
                  <p className="text-gray-800 font-medium">「許可する」をクリック</p>
                  <p className="text-gray-500 text-sm">ワークスペース管理者による承認が必要</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                <div>
                  <p className="text-gray-800 font-medium">チャンネルでBotを招待</p>
                  <p className="text-gray-500 text-sm">監視したいチャンネルで <code className="bg-gray-100 px-1 rounded">/invite @Bot名</code></p>
                  <p className="text-gray-400 text-xs">※ これはチャンネルメンバーなら誰でも可能</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200">
              <p className="text-amber-700 text-sm">
                ⏱️ 所要時間: 約1〜2分 ／ 技術的な設定作業は不要
              </p>
            </div>
          </div>

          <p className="text-amber-600 text-sm mt-4">
            💡 以下の手順は当社側で実施します。お客様への作業依頼は上記のみです。
          </p>
        </section>

        {/* Step 1 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              1
            </span>
            Slack API サイトにアクセス
          </h2>
          <p className="text-gray-600 mb-4">
            以下のリンクからSlack APIのアプリ管理ページにアクセスします。
          </p>
          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            api.slack.com/apps を開く ↗
          </a>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              💡 Slackにログインしていない場合は、先にログインしてください。
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
                右上の <strong className="bg-green-100 px-2 py-0.5 rounded">Create New App</strong> ボタンをクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">2.2</span>
              <div>
                <strong>&quot;From scratch&quot;</strong> を選択
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">2.3</span>
              <div>
                <strong>App Name</strong>: 任意の名前（例: &quot;Lark Notifier&quot;）
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">2.4</span>
              <div>
                <strong>Workspace</strong>: 連携するSlackワークスペースを選択
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">2.5</span>
              <div>
                <strong className="bg-green-100 px-2 py-0.5 rounded">Create App</strong> をクリック
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
            Socket Mode を有効化
          </h2>
          <p className="text-gray-600 mb-4">
            Socket Modeを使うと、サーバーを公開せずにSlackからイベントを受信できます。
          </p>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">3.1</span>
              <div>
                左メニューから <strong>&quot;Socket Mode&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">3.2</span>
              <div>
                <strong>&quot;Enable Socket Mode&quot;</strong> をONに切り替え
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">3.3</span>
              <div>
                App-Level Token の名前を入力（例: &quot;socket-token&quot;）
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">3.4</span>
              <div>
                Scope: <code className="bg-gray-100 px-2 py-0.5 rounded">connections:write</code> を追加
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">3.5</span>
              <div>
                <strong className="bg-green-100 px-2 py-0.5 rounded">Generate</strong> をクリックして Token を生成
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ 生成された <strong>App Token</strong>（xapp-で始まる）を安全な場所にコピーして保存してください。
              このトークンは後で使用します。
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              4
            </span>
            Event Subscriptions を設定
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
                <strong>&quot;Enable Events&quot;</strong> をONに切り替え
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">4.3</span>
              <div>
                <strong>&quot;Subscribe to bot events&quot;</strong> を展開して以下を追加:
                <ul className="mt-2 ml-4 space-y-1">
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">message.channels</code> - パブリックチャンネルのメッセージ</li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">message.groups</code> - プライベートチャンネルのメッセージ</li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">message.im</code> - ダイレクトメッセージ（オプション）</li>
                </ul>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">4.4</span>
              <div>
                <strong className="bg-green-100 px-2 py-0.5 rounded">Save Changes</strong> をクリック
              </div>
            </li>
          </ol>
        </section>

        {/* Step 5 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              5
            </span>
            OAuth & Permissions を設定
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">5.1</span>
              <div>
                左メニューから <strong>&quot;OAuth & Permissions&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">5.2</span>
              <div>
                <strong>&quot;Scopes&quot;</strong> セクションで <strong>&quot;Bot Token Scopes&quot;</strong> に以下を追加:
                <ul className="mt-2 ml-4 space-y-1">
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">channels:history</code></li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">channels:read</code></li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">groups:history</code></li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">groups:read</code></li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">users:read</code></li>
                  <li><code className="bg-gray-100 px-2 py-0.5 rounded">chat:write</code> （双方向通信用）</li>
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
            ワークスペースにインストール
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">6.1</span>
              <div>
                ページ上部の <strong className="bg-green-100 px-2 py-0.5 rounded">Install to Workspace</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">6.2</span>
              <div>
                権限を確認して <strong>&quot;Allow&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">6.3</span>
              <div>
                <strong>Bot User OAuth Token</strong>（xoxb-で始まる）をコピー
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ この <strong>Bot Token</strong> も安全な場所に保存してください。
            </p>
          </div>
        </section>

        {/* Step 7 */}
        <section className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              7
            </span>
            Signing Secret を取得
          </h2>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">7.1</span>
              <div>
                左メニューから <strong>&quot;Basic Information&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-purple-600">7.2</span>
              <div>
                <strong>&quot;App Credentials&quot;</strong> セクションにある <strong>Signing Secret</strong> をコピー
              </div>
            </li>
          </ol>
        </section>

        {/* Summary */}
        <section className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-4">
            ✅ 取得できた情報
          </h2>
          <p className="text-green-700 mb-4">
            以下の3つの情報を取得できていれば、Slack側の設定は完了です。
          </p>
          <ul className="space-y-2 text-green-700">
            <li className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <strong>Bot Token</strong>（xoxb-で始まる）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <strong>App Token</strong>（xapp-で始まる）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <strong>Signing Secret</strong>
            </li>
          </ul>
        </section>

        {/* Bot invitation */}
        <section className="bg-white rounded-xl p-6 shadow-md mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💡</span>
            重要: Botをチャンネルに招待
          </h2>
          <p className="text-gray-700 mb-4">
            監視したいSlackチャンネルで、作成したBotを招待する必要があります。
          </p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">チャンネルで以下のコマンドを入力:</p>
            <code className="bg-gray-800 text-white px-4 py-2 rounded block font-mono">
              /invite @アプリ名
            </code>
          </div>
        </section>

        {/* Distributing to customers */}
        <section className="bg-purple-50 rounded-xl p-6 border border-purple-200 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            🔗 お客様のワークスペースにインストールしてもらう方法
          </h2>
          <p className="text-gray-700 mb-4">
            当社で作成したAppをお客様のワークスペースにインストールしてもらう場合は、
            以下の手順でインストールリンクを共有します。
          </p>
          <ol className="space-y-4 text-gray-700">
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div>
                左メニューから <strong className="text-gray-900">&quot;Manage Distribution&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div>
                <strong className="text-gray-900">チェックリストを完了する</strong>
                <p className="text-gray-600 text-sm mt-1">
                  「Activate Public Distribution」ボタンがグレーの場合、先にチェック項目を完了します:
                </p>
                <div className="bg-white rounded-lg p-3 mt-2 border border-purple-200">
                  <ul className="text-sm text-gray-700 space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <div>
                        <strong>Enable Features & Functionality</strong>
                        <span className="text-gray-500"> - 自動で完了済み</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">!</span>
                      <div>
                        <strong>Add OAuth Redirect URLs</strong>
                        <span className="text-red-600 font-medium"> - 設定が必要</span>
                        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-gray-700 text-xs mb-2">Socket Mode使用でも最低1つ必要です:</p>
                          <ol className="text-xs text-gray-600 space-y-1">
                            <li>1. 「Add OAuth Redirect URLs」をクリック</li>
                            <li>2. 「OAuth & Permissions」ページが開く</li>
                            <li>3. 「Redirect URLs」セクションで「Add New Redirect URL」をクリック</li>
                            <li>4. <code className="bg-gray-200 px-1 rounded">https://localhost</code> を入力して「Add」</li>
                            <li>5. 「Save URLs」をクリック</li>
                          </ol>
                          <p className="text-gray-500 text-xs mt-2">※ 実際にはこのURLは使用されません（Socket Mode使用のため）</p>
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <div>
                        <strong>Remove Hard Coded Information</strong>
                        <span className="text-gray-500"> - 自動で完了済み</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <div>
                        <strong>Use HTTPS For Your Features</strong>
                        <span className="text-gray-500"> - 自動で完了済み</span>
                      </div>
                    </li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-3 font-medium">
                    ※ すべてに緑のチェックが付くとボタンが有効になります
                  </p>
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div>
                <strong className="text-gray-900">&quot;Activate Public Distribution&quot;</strong> をクリック
              </div>
            </li>
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <div>
                <strong className="text-gray-900">&quot;Shareable URL&quot;</strong> をコピー
              </div>
            </li>
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
              <div>
                お客様にこのURLを共有し、「許可する」をクリックしてもらう
              </div>
            </li>
          </ol>
          <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
            <p className="text-gray-900 text-sm font-bold mb-2">
              お客様への案内テンプレート:
            </p>
            <div className="bg-gray-800 text-gray-100 p-3 rounded text-sm font-mono">
              <p>Slack-Lark連携ツールのインストールをお願いします。</p>
              <p className="mt-2">【手順】</p>
              <p>1. 以下のリンクをクリック</p>
              <p>2. 「許可する」をクリック</p>
              <p>3. 連携したいチャンネルで /invite @アプリ名 を実行</p>
              <p className="mt-2 text-gray-400">[インストールリンクをここに貼り付け]</p>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-700"
          >
            ← ホームに戻る
          </Link>
          <Link
            href="/guide/lark-webhook"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            次へ: Lark Webhook設定 →
          </Link>
        </div>
      </main>
    </div>
  );
}
