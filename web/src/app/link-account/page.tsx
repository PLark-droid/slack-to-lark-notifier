"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const SLACK_CLIENT_ID = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://slack-to-lark-notifier.vercel.app";

// Slack User OAuth scopes needed
const SLACK_USER_SCOPES = [
  "chat:write", // Post messages as the user
  "users:read", // Read user info
].join(",");

function LinkAccountContent() {
  const searchParams = useSearchParams();
  const [larkOpenId, setLarkOpenId] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const slackUser = searchParams.get("slack_user");

  useEffect(() => {
    // Try to get lark_open_id from URL or localStorage
    const savedLarkId = localStorage.getItem("lark_open_id");
    if (savedLarkId) {
      setLarkOpenId(savedLarkId);
    }
  }, []);

  const handleLinkAccount = () => {
    if (!larkOpenId.trim()) {
      alert("Lark Open IDを入力してください");
      return;
    }

    if (!SLACK_CLIENT_ID) {
      alert("SLACK_CLIENT_ID が設定されていません");
      return;
    }

    // Save lark_open_id
    localStorage.setItem("lark_open_id", larkOpenId);
    setIsLinking(true);

    // Build OAuth URL with state = lark_open_id
    const oauthUrl = new URL("https://slack.com/oauth/v2/authorize");
    oauthUrl.searchParams.set("client_id", SLACK_CLIENT_ID);
    oauthUrl.searchParams.set("user_scope", SLACK_USER_SCOPES);
    oauthUrl.searchParams.set("redirect_uri", `${APP_URL}/api/oauth/slack`);
    oauthUrl.searchParams.set("state", larkOpenId);

    // Redirect to Slack OAuth
    window.location.href = oauthUrl.toString();
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            アカウント連携完了！
          </h1>
          <p className="text-gray-600 mb-6">
            {slackUser && (
              <>
                <span className="font-semibold">{decodeURIComponent(slackUser)}</span>
                として連携されました。
              </>
            )}
          </p>
          <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
            <h2 className="font-bold text-gray-900 mb-2">これで可能になること:</h2>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✅ Larkからメッセージを送ると、あなたのSlackアカウントで投稿されます</li>
              <li>✅ お客さんから見て、誰が送ったか一目瞭然</li>
            </ul>
          </div>
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

  // Error state
  if (error) {
    const errorMessages: Record<string, string> = {
      no_code: "認証コードが取得できませんでした",
      no_lark_id: "Lark IDが指定されていません",
      oauth_failed: "OAuth認証に失敗しました",
      server_error: "サーバーエラーが発生しました",
      access_denied: "アクセスが拒否されました",
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            連携に失敗しました
          </h1>
          <p className="text-gray-600 mb-4">
            {errorMessages[error] || `エラー: ${error}`}
          </p>
          <button
            onClick={() => window.location.href = "/link-account"}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            もう一度試す
          </button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Lark ↔ Slack アカウント連携
          </h1>
          <p className="text-gray-600">
            LarkアカウントとSlackアカウントを連携して、
            Larkからのメッセージを本人のSlackアカウントで送信できるようにします。
          </p>
        </div>

        {/* Step 1: Lark Open ID */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 1: あなたの Lark Open ID を入力
          </label>
          <input
            type="text"
            value={larkOpenId}
            onChange={(e) => setLarkOpenId(e.target.value)}
            placeholder="ou_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-2">
            Lark Open ID は Lark Developer Console または Bot へのメッセージログで確認できます
          </p>
        </div>

        {/* How to find Lark Open ID */}
        <details className="mb-6 bg-gray-50 rounded-lg p-4">
          <summary className="font-medium text-gray-700 cursor-pointer">
            Lark Open ID の確認方法
          </summary>
          <div className="mt-3 text-sm text-gray-600 space-y-2">
            <p>1. Larkグループで Slack2Lark Bot にメッセージを送る</p>
            <p>2. Vercelのログで <code className="bg-gray-200 px-1 rounded">sender_id.open_id</code> を確認</p>
            <p>3. または Lark Admin Console でユーザー詳細を確認</p>
          </div>
        </details>

        {/* Step 2: Connect Slack */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step 2: Slackアカウントを連携
          </label>
          <button
            onClick={handleLinkAccount}
            disabled={isLinking || !larkOpenId.trim()}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              isLinking || !larkOpenId.trim()
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#4A154B] hover:bg-[#3a1139] text-white"
            }`}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
            {isLinking ? "Slackへリダイレクト中..." : "Slackアカウントを連携"}
          </button>
        </div>

        {/* Notice */}
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700">
          <p className="font-medium mb-2">📝 必要な権限:</p>
          <ul className="space-y-1 text-gray-600">
            <li>• <code>chat:write</code> - あなたとしてメッセージを投稿</li>
            <li>• <code>users:read</code> - ユーザー情報の読み取り</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LinkAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      }
    >
      <LinkAccountContent />
    </Suspense>
  );
}
