"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function CallbackContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            インストールがキャンセルされました
          </h1>
          <p className="text-gray-600 mb-6">
            Slackアプリのインストールが中断されました。
            もう一度お試しください。
          </p>
          <p className="text-sm text-gray-400 mb-6">
            エラー: {error}
          </p>
          <Link
            href="/"
            className="inline-block bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (code) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            インストール完了！
          </h1>
          <p className="text-gray-600 mb-6">
            Slackアプリが正常にインストールされました。
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h2 className="font-bold text-gray-900 mb-2">次のステップ:</h2>
            <ol className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <span>Slackで連携したいチャンネルを開く</span>
              </li>
              <li className="flex gap-2">
                <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <span>チャンネルでBotを招待: <code className="bg-gray-200 px-1 rounded">/invite @Bot名</code></span>
              </li>
              <li className="flex gap-2">
                <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <span>テストメッセージを送信して動作確認</span>
              </li>
            </ol>
          </div>

          <p className="text-sm text-gray-500">
            このページは閉じて大丈夫です。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🔄</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          処理中...
        </h1>
        <p className="text-gray-600">
          Slackからのリダイレクトを待っています。
        </p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
