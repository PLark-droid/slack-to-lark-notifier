"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import SlackChannelSelector from "../components/SlackChannelSelector";

/**
 * Setup wizard states
 */
type WizardStep = "install" | "select-channels" | "complete" | "error";

/**
 * OAuth InstallWizard Component
 *
 * Handles the one-click Slack installation flow:
 * 1. Display "Add to Slack" button
 * 2. OAuth callback with channel list
 * 3. User selects channels to monitor
 * 4. Configuration saved and complete
 */
function InstallWizardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>("install");
  const [teamId, setTeamId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [error, setError] = useState<string>("");

  const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      access_denied: "インストールがキャンセルされました",
      no_code: "OAuth認証に失敗しました（codeパラメータが見つかりません）",
      missing_credentials: "Slack OAuth認証情報が設定されていません",
      oauth_failed: "OAuth認証に失敗しました",
      invalid_response: "Slackからの応答が無効です",
      channels_fetch_failed: "チャンネル情報の取得に失敗しました",
      server_error: "サーバーエラーが発生しました",
    };

    return errorMessages[errorCode] || `エラーが発生しました: ${errorCode}`;
  };

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const successParam = searchParams.get("success");
    const teamIdParam = searchParams.get("team_id");
    const teamNameParam = searchParams.get("team_name");

    if (errorParam) {
      setError(getErrorMessage(errorParam));
      setStep("error");
    } else if (successParam === "true" && teamIdParam) {
      setTeamId(teamIdParam);
      setTeamName(teamNameParam || "");
      setStep("select-channels");
    }
  }, [searchParams]);

  /**
   * Generate Slack OAuth URL
   */
  const getSlackOAuthUrl = (): string => {
    const scopes = [
      "channels:read",
      "channels:history",
      "chat:write",
      "users:read",
      "groups:read",
      "groups:history",
    ];

    const params = new URLSearchParams({
      client_id: clientId || "",
      scope: scopes.join(","),
      redirect_uri: `${appUrl}/api/oauth/slack/install`,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  };

  /**
   * Handle successful channel selection
   */
  const handleComplete = () => {
    setStep("complete");
  };

  /**
   * Handle error during channel selection
   */
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setStep("error");
  };

  /**
   * Restart the setup process
   */
  const handleRestart = () => {
    router.push("/setup-wizard/install");
    setStep("install");
    setError("");
    setTeamId("");
    setTeamName("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← ホームに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Slack ワンクリックインストール
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Slackを簡単に連携してメッセージをLarkに転送
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Install */}
        {step === "install" && (
          <div className="bg-white rounded-xl p-8 shadow-md text-center">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Slackに追加する
            </h2>
            <p className="text-gray-600 mb-6">
              「Slackに追加」ボタンをクリックして、ワークスペースにBotを追加します。
              <br />
              追加後、監視するチャンネルを選択できます。
            </p>

            {/* Prerequisites */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-blue-800 mb-2">必要な権限</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>✓ チャンネル一覧の読み取り（channels:read）</li>
                <li>✓ チャンネルメッセージの読み取り（channels:history）</li>
                <li>✓ メッセージの送信（chat:write）</li>
                <li>✓ ユーザー情報の読み取り（users:read）</li>
              </ul>
            </div>

            {/* Add to Slack Button */}
            {clientId ? (
              <a
                href={getSlackOAuthUrl()}
                className="inline-flex items-center gap-3 bg-[#4A154B] text-white px-6 py-3 rounded-lg hover:bg-[#611f69] transition-colors font-medium"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                  fill="currentColor"
                >
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
                Slackに追加
              </a>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">
                  環境変数 NEXT_PUBLIC_SLACK_CLIENT_ID が設定されていません。
                  <br />
                  .env ファイルを確認してください。
                </p>
              </div>
            )}

            {/* What happens next */}
            <div className="mt-8 text-left">
              <h3 className="font-medium text-gray-900 mb-3">次に行うこと</h3>
              <ol className="text-gray-600 text-sm space-y-2">
                <li>1. 「Slackに追加」をクリック</li>
                <li>2. Slackの認証画面で「許可する」をクリック</li>
                <li>3. 自動的にチャンネル選択画面に移動します</li>
                <li>4. 監視するチャンネルを選択して保存</li>
              </ol>
            </div>
          </div>
        )}

        {/* Step 2: Select Channels */}
        {step === "select-channels" && (
          <SlackChannelSelector
            teamId={teamId}
            teamName={teamName}
            onComplete={handleComplete}
            onError={handleError}
          />
        )}

        {/* Step 3: Complete */}
        {step === "complete" && (
          <div className="bg-white rounded-xl p-8 shadow-md text-center">
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              設定が完了しました！
            </h2>
            <p className="text-gray-600 mb-6">
              <span className="font-medium">{teamName}</span> の設定が保存されました。
              <br />
              選択したチャンネルの新着メッセージがLarkに転送されます。
            </p>

            {/* Next Steps */}
            <div className="bg-green-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-medium text-green-800 mb-3">次のステップ</h3>
              <ol className="text-green-700 text-sm space-y-2">
                <li>1. 選択したSlackチャンネルに移動</li>
                <li>2. チャンネルにBotを招待（@botname を入力）</li>
                <li>3. テストメッセージを送信</li>
                <li>4. Larkで通知が届くことを確認</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Link
                href="/"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                ホームに戻る
              </Link>
              <button
                onClick={handleRestart}
                className="text-gray-600 px-6 py-3 hover:text-gray-800 font-medium"
              >
                別のワークスペースを追加
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {step === "error" && (
          <div className="bg-white rounded-xl p-8 shadow-md text-center">
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              エラーが発生しました
            </h2>
            <p className="text-red-600 mb-6">{error}</p>

            {/* Troubleshooting */}
            <div className="bg-red-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-medium text-red-800 mb-3">トラブルシューティング</h3>
              <ul className="text-red-700 text-sm space-y-2">
                <li>• 環境変数が正しく設定されているか確認してください</li>
                <li>• Slack App設定で正しいリダイレクトURLが登録されているか確認してください</li>
                <li>• ブラウザのキャッシュをクリアして再試行してください</li>
              </ul>
            </div>

            {/* Retry Button */}
            <button
              onClick={handleRestart}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              最初からやり直す
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * OAuth Install Wizard Page Component
 */
export default function InstallWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      }
    >
      <InstallWizardContent />
    </Suspense>
  );
}
