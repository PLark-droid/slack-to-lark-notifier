"use client";

import { useState, useReducer } from "react";
import Link from "next/link";

/**
 * Setup Wizard State Types
 */
type Step = 1 | 2 | 3 | 4;

interface WizardState {
  currentStep: Step;
  slackConnected: boolean;
  larkWebhookUrl: string;
  isComplete: boolean;
  errors: Record<string, string>;
}

type WizardAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_SLACK_CONNECTED"; payload: boolean }
  | { type: "SET_LARK_WEBHOOK"; payload: string }
  | { type: "SET_ERROR"; payload: { field: string; message: string } }
  | { type: "CLEAR_ERROR"; payload: string }
  | { type: "COMPLETE_SETUP" }
  | { type: "RESET" };

/**
 * Wizard State Reducer
 */
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "NEXT_STEP":
      if (state.currentStep < 4) {
        return { ...state, currentStep: (state.currentStep + 1) as Step };
      }
      return state;

    case "PREV_STEP":
      if (state.currentStep > 1) {
        return { ...state, currentStep: (state.currentStep - 1) as Step };
      }
      return state;

    case "SET_SLACK_CONNECTED":
      return { ...state, slackConnected: action.payload };

    case "SET_LARK_WEBHOOK":
      return { ...state, larkWebhookUrl: action.payload };

    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.payload.field]: action.payload.message },
      };

    case "CLEAR_ERROR":
      const newErrors = { ...state.errors };
      delete newErrors[action.payload];
      return { ...state, errors: newErrors };

    case "COMPLETE_SETUP":
      return { ...state, isComplete: true };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

const initialState: WizardState = {
  currentStep: 1,
  slackConnected: false,
  larkWebhookUrl: "",
  isComplete: false,
  errors: {},
};

/**
 * Main Setup Wizard Component
 */
export default function SetupWizardPage() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const handleNext = () => {
    // Validate current step before proceeding
    if (validateCurrentStep()) {
      dispatch({ type: "NEXT_STEP" });
    }
  };

  const handlePrev = () => {
    dispatch({ type: "PREV_STEP" });
  };

  const validateCurrentStep = (): boolean => {
    switch (state.currentStep) {
      case 1:
        // Welcome step has no validation
        return true;

      case 2:
        // Slack connection step
        if (!state.slackConnected) {
          dispatch({
            type: "SET_ERROR",
            payload: {
              field: "slack",
              message: "Slackとの連携を完了してください",
            },
          });
          return false;
        }
        dispatch({ type: "CLEAR_ERROR", payload: "slack" });
        return true;

      case 3:
        // Lark webhook step
        if (!state.larkWebhookUrl.trim()) {
          dispatch({
            type: "SET_ERROR",
            payload: {
              field: "lark",
              message: "Webhook URLを入力してください",
            },
          });
          return false;
        }
        if (!isValidWebhookUrl(state.larkWebhookUrl)) {
          dispatch({
            type: "SET_ERROR",
            payload: {
              field: "lark",
              message: "正しいWebhook URL形式で入力してください（https://から始まる必要があります）",
            },
          });
          return false;
        }
        dispatch({ type: "CLEAR_ERROR", payload: "lark" });
        return true;

      default:
        return true;
    }
  };

  const isValidWebhookUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && parsed.hostname.length > 0;
    } catch {
      return false;
    }
  };

  const handleComplete = async () => {
    // In a real implementation, this would save the configuration
    // For now, we just mark as complete
    dispatch({ type: "COMPLETE_SETUP" });
  };

  const progressPercentage = (state.currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-3xl hover:opacity-70 transition-opacity">
              🔔
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                かんたん設定ウィザード
              </h1>
              <p className="text-sm text-gray-500">
                4つのステップで設定を完了します
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              ステップ {state.currentStep} / 4
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progressPercentage)}% 完了
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 min-h-[500px]">
          {state.currentStep === 1 && (
            <StepWelcome onNext={handleNext} />
          )}

          {state.currentStep === 2 && (
            <StepSlackConnect
              isConnected={state.slackConnected}
              error={state.errors.slack}
              onConnect={() => dispatch({ type: "SET_SLACK_CONNECTED", payload: true })}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}

          {state.currentStep === 3 && (
            <StepLarkWebhook
              webhookUrl={state.larkWebhookUrl}
              error={state.errors.lark}
              onChange={(url) => dispatch({ type: "SET_LARK_WEBHOOK", payload: url })}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}

          {state.currentStep === 4 && (
            <StepComplete
              onComplete={handleComplete}
              onPrev={handlePrev}
              isComplete={state.isComplete}
            />
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">
            設定でお困りですか？
          </p>
          <Link
            href="/"
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            詳しいガイドを見る
          </Link>
        </div>
      </main>
    </div>
  );
}

/**
 * Step 1: Welcome
 */
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">👋</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        ようこそ！
      </h2>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        このウィザードでは、SlackとLarkを連携する設定を行います。
        <br />
        難しい操作は一切ありません。画面の指示に従って進めてください。
      </p>

      <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left max-w-xl mx-auto">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>✨</span>
          できるようになること
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>Slackのメッセージを自動的にLarkへ転送</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>大切な通知を見逃さない</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>チーム全体の情報共有がスムーズに</span>
          </li>
        </ul>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left max-w-xl mx-auto">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>⏱️</span>
          所要時間
        </h3>
        <p className="text-gray-700">
          約5分で完了します。途中で中断しても、また戻ってこられます。
        </p>
      </div>

      <button
        onClick={onNext}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-10 py-4 rounded-lg shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        はじめる
      </button>
    </div>
  );
}

/**
 * Step 2: Slack Connect
 */
function StepSlackConnect({
  isConnected,
  error,
  onConnect,
  onNext,
  onPrev,
}: {
  isConnected: boolean;
  error?: string;
  onConnect: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">💬</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Slackと連携する
        </h2>
        <p className="text-gray-600">
          Slackのメッセージを受け取るために、連携を許可してください
        </p>
      </div>

      {!isConnected ? (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <span>📝</span>
              操作手順
            </h3>
            <ol className="text-yellow-800 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">1.</span>
                <span>下の「Slackに追加」ボタンをクリック</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">2.</span>
                <span>Slackのログイン画面が開きます（既にログイン済みの場合はスキップ）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">3.</span>
                <span>「許可する」ボタンをクリック</span>
              </li>
            </ol>
          </div>

          <div className="text-center mb-6">
            <a
              href="/api/slack/install"
              onClick={(e) => {
                e.preventDefault();
                // Simulate OAuth flow
                setTimeout(() => {
                  onConnect();
                }, 1000);
              }}
              className="inline-flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold text-lg px-8 py-4 rounded-lg border-2 border-gray-300 shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-300"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
              Slackに追加
            </a>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:underline mx-auto block mb-4"
          >
            {showDetails ? "詳細を隠す" : "何が起こるか詳しく知る"}
          </button>

          {showDetails && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 mb-6">
              <h4 className="font-semibold mb-2">安心してください</h4>
              <ul className="space-y-1">
                <li>• メッセージの読み取り権限のみを要求します</li>
                <li>• メッセージの削除や変更は行いません</li>
                <li>• 個人情報は収集しません</li>
                <li>• いつでも連携を解除できます</li>
              </ul>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 inline-block">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-800 font-semibold">
              Slackとの連携が完了しました！
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t">
        <button
          onClick={onPrev}
          className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          ← 戻る
        </button>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isConnected}
        >
          次へ →
        </button>
      </div>
    </div>
  );
}

/**
 * Step 3: Lark Webhook
 */
function StepLarkWebhook({
  webhookUrl,
  error,
  onChange,
  onNext,
  onPrev,
}: {
  webhookUrl: string;
  error?: string;
  onChange: (url: string) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Larkの受信設定
        </h2>
        <p className="text-gray-600">
          メッセージを送信するLarkのWebhook URLを入力してください
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>❓</span>
          Webhook URLとは？
        </h3>
        <p className="text-blue-800 text-sm mb-2">
          Webhook URLは、Larkでメッセージを受け取るための専用のアドレスです。
          郵便の宛先のようなものです。
        </p>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          {showGuide ? "取得手順を隠す" : "取得手順を見る"}
        </button>
      </div>

      {showGuide && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-3">
            Webhook URLの取得手順
          </h3>
          <ol className="text-yellow-800 space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">1.</span>
              <span>Larkアプリを開き、メッセージを送りたいグループを選択</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">2.</span>
              <span>グループ名の右にある「...」メニューをクリック</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">3.</span>
              <span>「設定」→「ボット」→「カスタムボットを追加」を選択</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">4.</span>
              <span>ボット名を入力（例: Slack通知）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">5.</span>
              <span>表示された「Webhook URL」をコピー</span>
            </li>
          </ol>
        </div>
      )}

      <div className="mb-6">
        <label
          htmlFor="webhook-url"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Webhook URL
        </label>
        <input
          id="webhook-url"
          type="url"
          value={webhookUrl}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
          className={`w-full px-4 py-3 border-2 rounded-lg text-base focus:outline-none focus:ring-2 transition-colors ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
          }`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "webhook-error" : undefined}
        />
        {error && (
          <p id="webhook-error" className="text-red-600 text-sm mt-2 flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </p>
        )}
        <p className="text-gray-500 text-xs mt-2">
          URLは「https://」で始まる必要があります
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-900 text-sm mb-2">
          💡 ヒント
        </h4>
        <p className="text-gray-700 text-sm">
          Webhook URLは非常に長い文字列です。全体をコピーしてペーストしてください。
          URLの途中で改行が入らないよう注意してください。
        </p>
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <button
          onClick={onPrev}
          className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          ← 戻る
        </button>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          次へ →
        </button>
      </div>
    </div>
  );
}

/**
 * Step 4: Complete
 */
function StepComplete({
  onComplete,
  onPrev,
  isComplete,
}: {
  onComplete: () => void;
  onPrev: () => void;
  isComplete: boolean;
}) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Simulate test
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate success (90% success rate)
    const success = Math.random() > 0.1;
    setTestResult(success ? "success" : "error");
    setIsTesting(false);

    if (success) {
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };

  if (isComplete) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-6 animate-bounce">🎉</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          設定が完了しました！
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Slackのメッセージが自動的にLarkに転送されるようになりました。
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left max-w-xl mx-auto">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <span>✅</span>
            次のステップ
          </h3>
          <ul className="space-y-2 text-green-800 text-sm">
            <li className="flex items-start gap-2">
              <span>1.</span>
              <span>Slackの対象チャンネルでメッセージを送信してみてください</span>
            </li>
            <li className="flex items-start gap-2">
              <span>2.</span>
              <span>Larkでメッセージが届いているか確認してください</span>
            </li>
            <li className="flex items-start gap-2">
              <span>3.</span>
              <span>うまく動作しない場合は、下のボタンから設定を見直せます</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            ホームに戻る
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3 rounded-lg border-2 border-gray-300 shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-300"
          >
            最初からやり直す
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🧪</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          動作テスト
        </h2>
        <p className="text-gray-600">
          設定が正しく動作するかテストしてみましょう
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>ℹ️</span>
          テストについて
        </h3>
        <p className="text-blue-800 text-sm">
          テストでは、LarkのWebhook URLに簡単なメッセージを送信します。
          Larkで「テストメッセージ」が届けば成功です。
        </p>
      </div>

      {testResult === null && !isTesting && (
        <div className="text-center mb-8">
          <button
            onClick={handleTest}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold text-lg px-10 py-4 rounded-lg shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-green-300"
          >
            テストを実行
          </button>
        </div>
      )}

      {isTesting && (
        <div className="text-center mb-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">テスト中...</p>
        </div>
      )}

      {testResult === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-800 font-semibold mb-2">
              テスト成功！
            </p>
            <p className="text-green-700 text-sm">
              Larkにテストメッセージが送信されました。
            </p>
          </div>
        </div>
      )}

      {testResult === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">❌</div>
            <p className="text-red-800 font-semibold mb-2">
              テスト失敗
            </p>
            <p className="text-red-700 text-sm mb-4">
              メッセージの送信に失敗しました。
            </p>
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-red-900 text-sm mb-2">
              よくある原因
            </h4>
            <ul className="text-red-800 text-sm space-y-1">
              <li>• Webhook URLが正しくない</li>
              <li>• Webhook URLの期限が切れている</li>
              <li>• ネットワーク接続の問題</li>
            </ul>
            <div className="mt-4">
              <button
                onClick={onPrev}
                className="text-red-600 hover:underline text-sm font-medium"
              >
                ← 前のステップに戻って修正する
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-900 text-sm mb-2">
          💡 テストをスキップすることもできます
        </h4>
        <p className="text-gray-700 text-sm">
          テストをスキップして、実際のメッセージで動作を確認することもできます。
          下の「完了する」ボタンをクリックしてください。
        </p>
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <button
          onClick={onPrev}
          className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          ← 戻る
        </button>
        <button
          onClick={onComplete}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          完了する
        </button>
      </div>
    </div>
  );
}
