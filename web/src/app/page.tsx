"use client";

import { useState } from "react";
import Link from "next/link";

type SetupMode = "basic" | "advanced" | null;

export default function Home() {
  const [mode, setMode] = useState<SetupMode>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🔔</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Slack to Lark Notifier
              </h1>
              <p className="text-sm text-gray-500">
                Slackのメッセージを自動的にLarkへ転送
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Mode Selection */}
        {!mode && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
              どのような連携を設定しますか？
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Basic Mode */}
              <button
                onClick={() => setMode("basic")}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow text-left border-2 border-transparent hover:border-blue-500"
              >
                <div className="text-4xl mb-4">📨</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  基本モード（片方向）
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Slack → Lark の片方向転送
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>✅ Slackの特定チャンネルを監視</li>
                  <li>✅ 新着メッセージをLarkに通知</li>
                  <li>✅ セットアップ簡単（10分程度）</li>
                </ul>
                <div className="mt-4 text-blue-600 font-medium text-sm">
                  こちらを選択 →
                </div>
              </button>

              {/* Advanced Mode */}
              <button
                onClick={() => setMode("advanced")}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow text-left border-2 border-transparent hover:border-purple-500"
              >
                <div className="text-4xl mb-4">🔄</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  双方向モード
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Slack ↔ Lark の双方向連携
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>✅ Slack → Lark 転送</li>
                  <li>✅ Lark → Slack 返信</li>
                  <li>✅ リアルタイム双方向通信</li>
                </ul>
                <div className="mt-4 text-purple-600 font-medium text-sm">
                  こちらを選択 →
                </div>
              </button>
            </div>
          </section>
        )}

        {/* Basic Mode Steps */}
        {mode === "basic" && (
          <section>
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setMode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← 戻る
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                基本モード セットアップ手順
              </h2>
            </div>

            <div className="space-y-6">
              {/* Step 1: Slack App */}
              <StepCard
                number={1}
                title="Slack Appを作成"
                time="5分"
                href="/guide/slack-app"
              >
                <p className="text-gray-600 mb-3">
                  Slackの管理画面でAppを作成し、Bot Token等を取得します。
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• api.slack.com でアプリ作成</li>
                  <li>• Socket Mode を有効化</li>
                  <li>• 必要なスコープを設定</li>
                  <li>• Bot Token / App Token を取得</li>
                </ul>
              </StepCard>

              {/* Step 2: Lark Webhook */}
              <StepCard
                number={2}
                title="Lark Webhookを設定"
                time="3分"
                href="/guide/lark-webhook"
              >
                <p className="text-gray-600 mb-3">
                  LarkでWebhook URLを作成します。
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Larkグループ設定を開く</li>
                  <li>• ボット &gt; カスタムボット追加</li>
                  <li>• Webhook URLをコピー</li>
                </ul>
              </StepCard>

              {/* Step 3: Configuration */}
              <StepCard
                number={3}
                title="設定を入力"
                time="2分"
                href="/setup"
              >
                <p className="text-gray-600 mb-3">
                  取得した情報を設定画面に入力して完了です。
                </p>
              </StepCard>
            </div>

            {/* Slack Connect Info */}
            <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <span>🔗</span>
                Slack Connectを使っていますか？
              </h3>
              <p className="text-blue-700 text-sm mb-4">
                <strong>Slack Connect</strong>とは、異なる会社間でSlackチャンネルを共有する機能です。
                外部パートナーとのチャンネルがある場合は追加設定が必要です。
              </p>
              <Link
                href="/guide/slack-connect"
                className="inline-flex items-center gap-2 text-blue-600 font-medium text-sm hover:underline"
              >
                Slack Connectの設定方法を見る →
              </Link>
            </div>
          </section>
        )}

        {/* Advanced Mode Steps */}
        {mode === "advanced" && (
          <section>
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setMode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← 戻る
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                双方向モード セットアップ手順
              </h2>
            </div>

            <div className="space-y-6">
              {/* Step 1: Slack App */}
              <StepCard
                number={1}
                title="Slack Appを作成"
                time="5分"
                href="/guide/slack-app"
              >
                <p className="text-gray-600 mb-3">
                  Slackの管理画面でAppを作成し、各種Tokenを取得します。
                </p>
              </StepCard>

              {/* Step 2: Lark Webhook */}
              <StepCard
                number={2}
                title="Lark Webhookを設定"
                time="3分"
                href="/guide/lark-webhook"
              >
                <p className="text-gray-600 mb-3">
                  LarkでWebhook URLを作成します。
                </p>
              </StepCard>

              {/* Step 3: Lark App */}
              <StepCard
                number={3}
                title="Lark Appを作成（双方向用）"
                time="10分"
                href="/guide/lark-app"
              >
                <p className="text-gray-600 mb-3">
                  Larkからの返信をSlackに転送するため、Lark Appを作成します。
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Lark Developer Consoleでアプリ作成</li>
                  <li>• イベント受信設定</li>
                  <li>• App IDとVerification Token取得</li>
                </ul>
              </StepCard>

              {/* Step 4: Configuration */}
              <StepCard
                number={4}
                title="設定を入力"
                time="2分"
                href="/setup?mode=advanced"
              >
                <p className="text-gray-600 mb-3">
                  取得した情報を設定画面に入力して完了です。
                </p>
              </StepCard>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="mt-12 bg-white rounded-xl p-8 shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">よくある質問</h2>
          <div className="space-y-6">
            <FaqItem question="料金はかかりますか？">
              このツールは無料で利用できます。Slack AppとLark Webhookの作成も無料です。
            </FaqItem>
            <FaqItem question="どんなメッセージが転送されますか？">
              指定したチャンネルの新着メッセージが転送されます。
              スレッド返信も転送できます。Bot自身のメッセージは転送されません。
            </FaqItem>
            <FaqItem question="Slack Connectとは何ですか？">
              異なる会社のSlackワークスペース間でチャンネルを共有する機能です。
              外部パートナーとの共有チャンネルがある場合、通常のBot Tokenでは
              メッセージを取得できないため、User Tokenを使った特別な設定が必要です。
            </FaqItem>
            <FaqItem question="双方向連携では何ができますか？">
              Slack→Larkの転送に加えて、Lark側で送信したメッセージを
              Slackに返信として送ることができます。
            </FaqItem>
            <FaqItem question="お客様側での作業は必要ですか？">
              最小限の作業をお願いします。①インストールリンクをクリック
              ②「許可する」をクリック（管理者）③チャンネルでBotを招待。
              所要時間は1〜2分程度で、技術的な設定は不要です。
            </FaqItem>
            <FaqItem question="Slack AppとBotの違いは？">
              Slack Appはアプリケーション全体のことで、Botはその中の一機能です。
              Botはチャンネルに招待でき、メッセージの送受信を行います。
              AppをインストールするとBotが使えるようになります。
            </FaqItem>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          Slack to Lark Notifier v0.1.0
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  title,
  time,
  href,
  children,
}: {
  number: number;
  title: string;
  time: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
          {number}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <span className="text-xs text-gray-400">約{time}</span>
          </div>
          {children}
          <Link
            href={href}
            className="inline-flex items-center gap-1 mt-4 text-blue-600 font-medium text-sm hover:underline"
          >
            詳細ガイドを見る →
          </Link>
        </div>
      </div>
    </div>
  );
}

function FaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0">
      <h3 className="font-medium text-gray-900 mb-2">{question}</h3>
      <p className="text-gray-600 text-sm">{children}</p>
    </div>
  );
}
