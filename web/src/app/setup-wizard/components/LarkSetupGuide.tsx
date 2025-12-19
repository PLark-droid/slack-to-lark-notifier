"use client";

import { useState } from "react";

/**
 * Lark Webhook Setup Guide Component
 *
 * Provides a step-by-step guide for setting up Lark Webhook with:
 * - Clear instructions without technical jargon
 * - Webhook URL input form
 * - Test send functionality
 * - Success/failure feedback
 */
export default function LarkSetupGuide() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  /**
   * Test webhook URL by sending a test message
   */
  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setTestStatus("error");
      setTestMessage("Webhook URLを入力してください");
      return;
    }

    setTestStatus("testing");
    setTestMessage("テスト送信中...");

    try {
      const response = await fetch("/api/lark/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webhookUrl }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestStatus("success");
        setTestMessage("送信成功しました！Larkグループでメッセージを確認してください。");
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "送信に失敗しました。URLを確認してください。");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("通信エラーが発生しました。もう一度お試しください。");
    }
  };

  /**
   * Copy webhook URL to clipboard
   */
  const handleCopy = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <section className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">
          Webhook とは？
        </h2>
        <p className="text-blue-700">
          Webhookは、外部サービスからLarkグループにメッセージを送信するための仕組みです。
          URLを取得するだけで、Slackの通知をLarkへ転送できるようになります。
        </p>
      </section>

      {/* Step 1: Open Lark Group */}
      <section className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
            1
          </span>
          Larkグループを開く
        </h2>
        <p className="text-gray-600">
          Larkアプリで、Slackからの通知を受け取りたいグループチャットを開きます。
        </p>
      </section>

      {/* Step 2: Add Bot */}
      <section className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
            2
          </span>
          ボットを追加
        </h2>
        <ol className="space-y-3 text-gray-600">
          <li className="flex gap-3">
            <span className="font-mono text-blue-600 flex-shrink-0">2.1</span>
            <div>
              グループチャット画面で右上の「<strong>+</strong>」ボタンをクリック
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-blue-600 flex-shrink-0">2.2</span>
            <div>
              「<strong>ボット</strong>」を選択
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-blue-600 flex-shrink-0">2.3</span>
            <div>
              「<strong>Webhook</strong>」を選択
            </div>
          </li>
        </ol>
      </section>

      {/* Step 3: Configure Webhook */}
      <section className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
            3
          </span>
          Webhookを設定
        </h2>
        <ol className="space-y-3 text-gray-600 mb-4">
          <li className="flex gap-3">
            <span className="font-mono text-blue-600 flex-shrink-0">3.1</span>
            <div>
              <strong>名前</strong>: 任意の名前（例: &quot;Slack通知&quot;）
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-blue-600 flex-shrink-0">3.2</span>
            <div>
              <strong>追加</strong>ボタンをクリック
            </div>
          </li>
        </ol>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            このURLは秘密情報です。他人に共有しないでください。
          </p>
        </div>
      </section>

      {/* Step 4: Copy Webhook URL */}
      <section className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
            4
          </span>
          Webhook URLをコピー
        </h2>
        <p className="text-gray-600 mb-4">
          表示されたWebhook URLをコピーして、下のフォームに貼り付けてください。
        </p>
        <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm break-all text-gray-500">
          https://open.larksuite.com/open-apis/bot/v2/hook/xxxxxxxxx
        </div>
      </section>

      {/* Step 5: Input and Test */}
      <section className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
            5
          </span>
          URLを入力してテスト
        </h2>

        {/* Webhook URL Input */}
        <div className="space-y-4">
          <div>
            <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                id="webhook-url"
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={!webhookUrl}
              >
                コピー
              </button>
            </div>
          </div>

          {/* Test Button */}
          <button
            onClick={handleTestWebhook}
            disabled={testStatus === "testing"}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {testStatus === "testing" ? "送信中..." : "テスト送信"}
          </button>

          {/* Test Status */}
          {testStatus !== "idle" && (
            <div
              className={`p-4 rounded-lg ${
                testStatus === "success"
                  ? "bg-green-50 border border-green-200"
                  : testStatus === "error"
                  ? "bg-red-50 border border-red-200"
                  : "bg-blue-50 border border-blue-200"
              }`}
            >
              <p
                className={`text-sm ${
                  testStatus === "success"
                    ? "text-green-800"
                    : testStatus === "error"
                    ? "text-red-800"
                    : "text-blue-800"
                }`}
              >
                {testStatus === "success" && "✓ "}
                {testStatus === "error" && "✗ "}
                {testMessage}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Success Summary */}
      {testStatus === "success" && (
        <section className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-4">
            設定完了しました！
          </h2>
          <p className="text-green-700 mb-4">
            これで、SlackからLarkへ通知を転送できるようになりました。
          </p>
          <div className="space-y-2 text-green-700">
            <p className="font-medium">次のステップ:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Slack側の設定を行う</li>
              <li>環境変数にWebhook URLを設定する</li>
              <li>デプロイして運用開始</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
