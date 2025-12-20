"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import type { ReactNode } from "react";

type FaqCategory = "setup" | "troubleshooting" | "account" | "general";

interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string | ReactNode;
}

const faqItems: FaqItem[] = [
  // Setup Questions
  {
    id: "lark-open-id",
    category: "setup",
    question: "Lark Open IDの確認方法を教えてください",
    answer: (
      <div className="space-y-3">
        <p>Lark Open IDは以下の方法で確認できます。</p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            <strong>方法1: Developer Consoleから</strong>
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li>Lark Developer Consoleにアクセス</li>
              <li>作成したアプリの「Event Subscriptions」を開く</li>
              <li>テストメッセージを送信してログを確認</li>
              <li><code className="bg-gray-100 px-1 rounded">sender.open_id</code> の値をコピー</li>
            </ul>
          </li>
          <li>
            <strong>方法2: 管理者に問い合わせ</strong>
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li>Lark管理者がAdmin Consoleから確認可能</li>
              <li>ユーザー管理画面でOpen IDを確認できます</li>
            </ul>
          </li>
        </ol>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
          <p className="font-medium text-yellow-900">💡 ヒント:</p>
          <p className="text-yellow-800">
            Open IDは「ou_」で始まる文字列です（例: ou_xxxxxxxxxxxxxxxxxxxxx）
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "slack-permissions",
    category: "setup",
    question: "Slack Appに必要な権限は何ですか？",
    answer: (
      <div className="space-y-3">
        <p>Slack Appには以下の権限（Scopes）が必要です。</p>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Bot Token Scopes（必須）:</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded">channels:read</code> - チャンネル一覧の取得
            </li>
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded">channels:history</code> - チャンネルメッセージの読み取り
            </li>
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded">chat:write</code> - メッセージの送信
            </li>
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded">users:read</code> - ユーザー情報の取得
            </li>
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded">groups:read</code> - プライベートチャンネルの読み取り
            </li>
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded">groups:history</code> - プライベートチャンネルの履歴
            </li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <p className="font-medium text-blue-900">📌 Slack Connectを使用する場合:</p>
          <p className="text-blue-800">
            外部組織との共有チャンネルでは、User Token（<code className="bg-gray-200 px-1 rounded">channels:read</code>, <code className="bg-gray-200 px-1 rounded">channels:history</code>）が必要です。
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "webhook-url",
    category: "setup",
    question: "Lark Webhook URLはどこで取得できますか？",
    answer: (
      <div className="space-y-3">
        <p>Lark Webhook URLは以下の手順で取得できます。</p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Larkアプリで通知を受け取りたいグループチャットを開く</li>
          <li>グループ名の右にある「...」メニューをクリック</li>
          <li>「設定」→「ボット」→「カスタムボットを追加」を選択</li>
          <li>ボット名を入力（例: Slack通知Bot）</li>
          <li>作成後、表示されるWebhook URLをコピー</li>
        </ol>
        <div className="bg-gray-50 rounded p-3 text-sm mt-3">
          <p className="font-mono text-xs break-all">
            例: https://open.larksuite.com/open-apis/bot/v2/hook/xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          </p>
        </div>
      </div>
    ),
  },

  // Troubleshooting
  {
    id: "messages-not-arriving",
    category: "troubleshooting",
    question: "メッセージがLarkに届きません",
    answer: (
      <div className="space-y-4">
        <p>以下の項目を順番に確認してください。</p>
        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold mb-1">1. Slack側の設定確認</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
              <li>BotがSlackチャンネルに招待されているか</li>
              <li>Bot TokenとApp Tokenが正しく設定されているか</li>
              <li>Socket Modeが有効になっているか</li>
              <li>必要な権限が付与されているか</li>
            </ul>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold mb-1">2. Lark側の設定確認</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
              <li>Webhook URLが正しくコピーされているか</li>
              <li>Webhook URLが期限切れになっていないか</li>
              <li>カスタムボットがグループに追加されているか</li>
            </ul>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold mb-1">3. システム側の確認</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
              <li>環境変数が正しく設定されているか</li>
              <li>Vercelのログにエラーが出ていないか</li>
              <li>テスト送信機能で疎通確認を行う</li>
            </ul>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
          <p className="font-medium text-red-900">🔍 デバッグ方法:</p>
          <p className="text-red-800">
            Vercelダッシュボードの「Logs」タブでリアルタイムログを確認できます。
            エラーメッセージが表示されている場合、その内容を確認してください。
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "account-link-fail",
    category: "troubleshooting",
    question: "アカウント連携がうまくいきません",
    answer: (
      <div className="space-y-3">
        <p>アカウント連携でエラーが発生する場合、以下を確認してください。</p>
        <div className="space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <h4 className="font-semibold text-yellow-900 mb-2">よくある原因:</h4>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
              <li>Lark Open IDが間違っている（ou_で始まるか確認）</li>
              <li>Slack OAuth認証を「拒否」してしまった</li>
              <li>環境変数<code className="bg-gray-200 px-1 rounded">SLACK_CLIENT_ID</code>が未設定</li>
              <li>リダイレクトURLが正しく設定されていない</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <h4 className="font-semibold text-blue-900 mb-2">解決方法:</h4>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>もう一度Lark Open IDを確認する</li>
              <li>ブラウザのキャッシュをクリアして再試行</li>
              <li>別のブラウザで試してみる</li>
              <li>管理者に環境変数の設定を確認してもらう</li>
            </ol>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "slack-connect-issue",
    category: "troubleshooting",
    question: "Slack Connectチャンネルのメッセージが取得できません",
    answer: (
      <div className="space-y-3">
        <p>
          Slack Connect（外部組織との共有チャンネル）では、Bot Tokenでメッセージを取得できません。
        </p>
        <div className="bg-orange-50 border border-orange-200 rounded p-4">
          <h4 className="font-semibold text-orange-900 mb-2">必要な設定:</h4>
          <ol className="list-decimal list-inside text-sm text-orange-800 space-y-2">
            <li>
              <strong>User Token Scopesを追加:</strong>
              <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                <li><code className="bg-gray-200 px-1 rounded">channels:read</code></li>
                <li><code className="bg-gray-200 px-1 rounded">channels:history</code></li>
              </ul>
            </li>
            <li>
              <strong>OAuth認証:</strong> ユーザーとしてSlackに認証し、User Tokenを取得
            </li>
            <li>
              <strong>環境変数設定:</strong> 取得したUser Tokenを<code className="bg-gray-200 px-1 rounded">SLACK_USER_TOKEN</code>として設定
            </li>
          </ol>
        </div>
        <Link
          href="/guide/slack-connect"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
        >
          詳しい設定方法を見る →
        </Link>
      </div>
    ),
  },
  {
    id: "lark-message-not-sent",
    category: "troubleshooting",
    question: "LarkからSlackにメッセージが送られません（双方向モード）",
    answer: (
      <div className="space-y-3">
        <p>双方向モード（Lark → Slack）が動作しない場合の確認項目です。</p>
        <div className="space-y-3">
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold mb-2">1. Lark App設定</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
              <li>Lark App IDとApp Secretが正しく設定されているか</li>
              <li>Event Subscriptions URLが正しいか（<code className="bg-gray-100 px-1 rounded">/api/lark/webhook</code>）</li>
              <li>イベント「im.message.receive_v1」が追加されているか</li>
              <li>権限「im:message」が付与されているか</li>
              <li>アプリが「Publish」されているか</li>
            </ul>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold mb-2">2. アカウント連携</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
              <li>Lark Open IDとSlackアカウントが正しく連携されているか</li>
              <li>連携したSlackアカウントに<code className="bg-gray-100 px-1 rounded">chat:write</code>権限があるか</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },

  // Account Linking
  {
    id: "what-is-open-id",
    category: "account",
    question: "Lark Open IDとは何ですか？",
    answer: (
      <div className="space-y-2">
        <p>
          Lark Open IDは、Larkのユーザーを一意に識別するためのIDです。
          「ou_」で始まる文字列で、Larkアプリがユーザーを特定する際に使用されます。
        </p>
        <div className="bg-gray-50 rounded p-3 text-sm">
          <p className="font-mono text-xs">例: ou_7d8a6e6dddddd2dd3dd3d30d33c7d</p>
        </div>
        <p className="text-sm text-gray-600">
          このIDを使ってLarkユーザーとSlackアカウントを紐付けることで、
          Larkから送信したメッセージを本人のSlackアカウントで投稿できるようになります。
        </p>
      </div>
    ),
  },
  {
    id: "why-link-account",
    category: "account",
    question: "アカウント連携は必須ですか？",
    answer: (
      <div className="space-y-3">
        <p>
          <strong>必須ではありません。</strong> ただし、連携することで以下のメリットがあります。
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <h4 className="font-semibold text-green-900 mb-2">連携あり:</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✅ 本人名義でメッセージ送信</li>
              <li>✅ 誰が送ったか一目瞭然</li>
              <li>✅ プロフェッショナルな印象</li>
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <h4 className="font-semibold text-gray-900 mb-2">連携なし:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>⚠️ Bot名で送信される</li>
              <li>⚠️ 誰が送ったか分かりにくい</li>
              <li>⚠️ メッセージに署名が必要</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          チーム全体で使う場合は、各メンバーがアカウント連携を行うことを推奨します。
        </p>
      </div>
    ),
  },

  // General
  {
    id: "cost",
    category: "general",
    question: "利用料金はかかりますか？",
    answer: (
      <div className="space-y-2">
        <p>
          <strong>このツール自体は完全無料</strong>です。以下のサービスも無料プランで利用できます。
        </p>
        <ul className="list-disc list-inside text-sm space-y-1 text-gray-700">
          <li>Slack App作成（無料）</li>
          <li>Lark Webhook（無料）</li>
          <li>Lark App作成（無料）</li>
          <li>Vercel デプロイ（無料プランで十分動作）</li>
        </ul>
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm mt-3">
          <p className="text-blue-800">
            💡 大量のメッセージを転送する場合、Vercelの無料プランの制限に達する可能性があります。
            その場合はProプランへのアップグレードをご検討ください。
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "security",
    category: "general",
    question: "セキュリティは大丈夫ですか？",
    answer: (
      <div className="space-y-3">
        <p>このツールは以下のセキュリティ対策を実施しています。</p>
        <ul className="list-disc list-inside text-sm space-y-2 text-gray-700">
          <li>
            <strong>OAuth認証:</strong> Slack/Larkの公式OAuth認証を使用
          </li>
          <li>
            <strong>環境変数:</strong> TokenやSecretは環境変数で管理（コードには含まれない）
          </li>
          <li>
            <strong>HTTPS通信:</strong> すべての通信が暗号化されています
          </li>
          <li>
            <strong>最小権限:</strong> 必要最小限の権限のみ要求します
          </li>
          <li>
            <strong>オープンソース:</strong> コードは公開されており、監査可能です
          </li>
        </ul>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm mt-3">
          <p className="font-medium text-yellow-900">⚠️ 注意事項:</p>
          <p className="text-yellow-800">
            Token情報は絶対に第三者と共有しないでください。
            また、公開リポジトリにコミットしないよう注意してください。
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "data-storage",
    category: "general",
    question: "メッセージデータはどこに保存されますか？",
    answer: (
      <div className="space-y-2">
        <p>
          <strong>メッセージデータは保存されません。</strong>
        </p>
        <p className="text-sm text-gray-700">
          このツールはリアルタイムでメッセージを転送するだけで、
          データベースやファイルにメッセージを保存することはありません。
          すべてのメッセージはSlackとLarkのサーバー上にのみ保存されます。
        </p>
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm mt-3">
          <p className="text-green-800">
            ✅ アカウント連携情報（Lark Open ID ↔ Slack User ID）のみ、
            環境変数またはデータベースに保存されます。
          </p>
        </div>
      </div>
    ),
  },
];

const glossary = [
  {
    term: "Slack App",
    definition: "Slackワークスペースに追加できるアプリケーション。Botやコマンドを提供します。",
  },
  {
    term: "Bot Token",
    definition: "Slackで Bot としてメッセージを送受信するための認証トークン（xoxb-で始まる）。",
  },
  {
    term: "User Token",
    definition: "Slackでユーザーとしてアクションを実行するための認証トークン（xoxp-で始まる）。Slack Connectで必要。",
  },
  {
    term: "Socket Mode",
    definition: "WebSocket接続でSlackのイベントを受信する方式。サーバーの公開URLが不要になります。",
  },
  {
    term: "Lark Webhook",
    definition: "Larkグループチャットにメッセージを送信するためのHTTP URL。",
  },
  {
    term: "Lark Open ID",
    definition: "Larkユーザーを一意に識別するID（ou_で始まる）。アカウント連携に使用します。",
  },
  {
    term: "OAuth",
    definition: "アプリが安全にユーザー認証・認可を行うための標準プロトコル。SlackとLarkで使用されます。",
  },
  {
    term: "Slack Connect",
    definition: "異なるSlackワークスペース間でチャンネルを共有する機能。外部パートナーとの連携に使います。",
  },
  {
    term: "Vercel",
    definition: "サーバーレスでWebアプリをホスティングできるプラットフォーム。このツールのデプロイ先として使用します。",
  },
];

export default function HelpPage() {
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const categories = [
    { id: "all" as const, label: "すべて", icon: "📚" },
    { id: "setup" as const, label: "初期設定", icon: "⚙️" },
    { id: "troubleshooting" as const, label: "トラブルシューティング", icon: "🔧" },
    { id: "account" as const, label: "アカウント連携", icon: "🔗" },
    { id: "general" as const, label: "一般的な質問", icon: "💬" },
  ];

  const filteredFaqs = faqItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header
        title="ヘルプ・FAQ"
        subtitle="よくある質問とトラブルシューティング"
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">クイックリンク</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/setup-wizard"
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <span className="text-2xl">🚀</span>
              <div>
                <div className="font-semibold text-blue-900">セットアップウィザード</div>
                <div className="text-xs text-blue-700">初期設定をガイド</div>
              </div>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <span className="text-2xl">📊</span>
              <div>
                <div className="font-semibold text-green-900">ダッシュボード</div>
                <div className="text-xs text-green-700">設定状態を確認</div>
              </div>
            </Link>
            <Link
              href="/link-account"
              className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <span className="text-2xl">🔗</span>
              <div>
                <div className="font-semibold text-purple-900">アカウント連携</div>
                <div className="text-xs text-purple-700">Slack連携設定</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="mb-4">
            <input
              type="text"
              placeholder="質問を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">よくある質問</h2>
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">🔍</div>
              <p>該当する質問が見つかりませんでした</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-900">{item.question}</span>
                    <span className="text-gray-400 text-xl">
                      {expandedItems.has(item.id) ? "−" : "+"}
                    </span>
                  </button>
                  {expandedItems.has(item.id) && (
                    <div className="px-6 py-4 bg-white border-t border-gray-200">
                      <div className="text-gray-700 prose prose-sm max-w-none">
                        {item.answer}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Glossary */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">用語集</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {glossary.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{item.term}</h3>
                <p className="text-sm text-gray-600">{item.definition}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-md p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">問題が解決しませんでしたか？</h2>
          <p className="mb-6 text-blue-100">
            FAQで解決できない場合は、以下の方法でお問い合わせください
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/your-repo/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <span>📝</span>
              GitHub Issueを作成
            </a>
            <a
              href="mailto:support@example.com"
              className="inline-flex items-center justify-center gap-2 bg-white/20 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-colors"
            >
              <span>✉️</span>
              メールで問い合わせ
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <Link href="/" className="text-blue-600 hover:underline font-medium">
                ホームに戻る
              </Link>
            </div>
            <div className="text-gray-500 text-sm text-center">
              Slack to Lark Notifier v0.1.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
