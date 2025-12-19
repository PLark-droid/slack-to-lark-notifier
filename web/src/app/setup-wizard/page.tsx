"use client";

import { useState, useReducer } from "react";
import Link from "next/link";

/**
 * Setup Wizard State Types - 6ステップの双方向通信設定
 */
type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface WizardState {
  currentStep: Step;
  // Step 2: Slack連携
  slackConnected: boolean;
  // Step 3: Lark Webhook (Slack → Lark)
  larkWebhookUrl: string;
  larkWebhookTested: boolean;
  // Step 4: Lark App (Lark → Slack)
  larkAppId: string;
  larkAppSecret: string;
  // Step 5: アカウント連携
  accountLinked: boolean;
  larkOpenId: string;
  // 完了状態
  isComplete: boolean;
  errors: Record<string, string>;
}

type WizardAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: Step }
  | { type: "SET_SLACK_CONNECTED"; payload: boolean }
  | { type: "SET_LARK_WEBHOOK"; payload: string }
  | { type: "SET_LARK_WEBHOOK_TESTED"; payload: boolean }
  | { type: "SET_LARK_APP_ID"; payload: string }
  | { type: "SET_LARK_APP_SECRET"; payload: string }
  | { type: "SET_ACCOUNT_LINKED"; payload: boolean }
  | { type: "SET_LARK_OPEN_ID"; payload: string }
  | { type: "SET_ERROR"; payload: { field: string; message: string } }
  | { type: "CLEAR_ERROR"; payload: string }
  | { type: "COMPLETE_SETUP" }
  | { type: "RESET" };

const TOTAL_STEPS = 6;

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "NEXT_STEP":
      if (state.currentStep < TOTAL_STEPS) {
        return { ...state, currentStep: (state.currentStep + 1) as Step };
      }
      return state;

    case "PREV_STEP":
      if (state.currentStep > 1) {
        return { ...state, currentStep: (state.currentStep - 1) as Step };
      }
      return state;

    case "GO_TO_STEP":
      return { ...state, currentStep: action.payload };

    case "SET_SLACK_CONNECTED":
      return { ...state, slackConnected: action.payload };

    case "SET_LARK_WEBHOOK":
      return { ...state, larkWebhookUrl: action.payload };

    case "SET_LARK_WEBHOOK_TESTED":
      return { ...state, larkWebhookTested: action.payload };

    case "SET_LARK_APP_ID":
      return { ...state, larkAppId: action.payload };

    case "SET_LARK_APP_SECRET":
      return { ...state, larkAppSecret: action.payload };

    case "SET_ACCOUNT_LINKED":
      return { ...state, accountLinked: action.payload };

    case "SET_LARK_OPEN_ID":
      return { ...state, larkOpenId: action.payload };

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
  larkWebhookTested: false,
  larkAppId: "",
  larkAppSecret: "",
  accountLinked: false,
  larkOpenId: "",
  isComplete: false,
  errors: {},
};

/**
 * Main Setup Wizard Component - 双方向通信対応
 */
export default function SetupWizardPage() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const handleNext = () => {
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
        return true;

      case 2:
        if (!state.slackConnected) {
          dispatch({
            type: "SET_ERROR",
            payload: { field: "slack", message: "Slackとの連携を完了してください" },
          });
          return false;
        }
        dispatch({ type: "CLEAR_ERROR", payload: "slack" });
        return true;

      case 3:
        if (!state.larkWebhookUrl.trim()) {
          dispatch({
            type: "SET_ERROR",
            payload: { field: "larkWebhook", message: "Webhook URLを入力してください" },
          });
          return false;
        }
        if (!isValidUrl(state.larkWebhookUrl)) {
          dispatch({
            type: "SET_ERROR",
            payload: { field: "larkWebhook", message: "正しいURL形式で入力してください" },
          });
          return false;
        }
        dispatch({ type: "CLEAR_ERROR", payload: "larkWebhook" });
        return true;

      case 4:
        // Lark App設定は任意（双方向を使わない場合はスキップ可能）
        return true;

      case 5:
        // アカウント連携も任意（ボット名で送信する場合はスキップ可能）
        return true;

      default:
        return true;
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleComplete = () => {
    dispatch({ type: "COMPLETE_SETUP" });
  };

  const progressPercentage = (state.currentStep / TOTAL_STEPS) * 100;

  const stepLabels = [
    "はじめに",
    "Slack連携",
    "Lark受信",
    "Lark送信",
    "アカウント連携",
    "完了",
  ];

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
                双方向連携ウィザード
              </h1>
              <p className="text-sm text-gray-500">
                SlackとLarkの双方向メッセージ転送を設定します
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
              ステップ {state.currentStep} / {TOTAL_STEPS}: {stepLabels[state.currentStep - 1]}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progressPercentage)}% 完了
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {/* Step indicators */}
          <div className="flex justify-between mt-2">
            {stepLabels.map((label, index) => (
              <div
                key={index}
                className={`text-xs ${
                  index + 1 <= state.currentStep ? "text-blue-600 font-medium" : "text-gray-400"
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 min-h-[500px]">
          {state.currentStep === 1 && <StepWelcome onNext={handleNext} />}

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
              isTested={state.larkWebhookTested}
              error={state.errors.larkWebhook}
              onChange={(url) => dispatch({ type: "SET_LARK_WEBHOOK", payload: url })}
              onTested={() => dispatch({ type: "SET_LARK_WEBHOOK_TESTED", payload: true })}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}

          {state.currentStep === 4 && (
            <StepLarkApp
              appId={state.larkAppId}
              appSecret={state.larkAppSecret}
              onAppIdChange={(id) => dispatch({ type: "SET_LARK_APP_ID", payload: id })}
              onAppSecretChange={(secret) => dispatch({ type: "SET_LARK_APP_SECRET", payload: secret })}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}

          {state.currentStep === 5 && (
            <StepAccountLink
              isLinked={state.accountLinked}
              larkOpenId={state.larkOpenId}
              onLarkOpenIdChange={(id) => dispatch({ type: "SET_LARK_OPEN_ID", payload: id })}
              onLinked={() => dispatch({ type: "SET_ACCOUNT_LINKED", payload: true })}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}

          {state.currentStep === 6 && (
            <StepComplete
              state={state}
              onComplete={handleComplete}
              onPrev={handlePrev}
              isComplete={state.isComplete}
            />
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">設定でお困りですか？</p>
          <Link href="/" className="text-blue-600 hover:underline text-sm font-medium">
            詳しいガイドを見る
          </Link>
        </div>
      </main>
    </div>
  );
}

/**
 * Step 1: Welcome - 双方向通信の説明
 */
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🔄</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Slack ↔ Lark 双方向連携
      </h2>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        このウィザードでは、SlackとLarkの<strong>双方向</strong>メッセージ転送を設定します。
        <br />
        Larkにいながら、Slackのお客さんとやり取りできるようになります。
      </p>

      <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left max-w-xl mx-auto">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>✨</span>
          できるようになること
        </h3>
        <ul className="space-y-3 text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span><strong>Slack → Lark</strong>: Slackの新着メッセージがLarkに届く</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span><strong>Lark → Slack</strong>: Larkから返信するとSlackに投稿される</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span><strong>本人名義で投稿</strong>: お客さんから見て誰が送ったか分かる</span>
          </li>
        </ul>
      </div>

      <div className="bg-yellow-50 rounded-lg p-6 mb-8 text-left max-w-xl mx-auto">
        <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
          <span>📋</span>
          設定の流れ（約10分）
        </h3>
        <ol className="space-y-2 text-yellow-800 text-sm">
          <li><strong>Step 1:</strong> はじめに（今ここ）</li>
          <li><strong>Step 2:</strong> Slackアプリを連携</li>
          <li><strong>Step 3:</strong> Lark Webhook設定（Slack→Lark受信用）</li>
          <li><strong>Step 4:</strong> Lark App設定（Lark→Slack送信用）</li>
          <li><strong>Step 5:</strong> アカウント連携（本人名義で投稿）</li>
          <li><strong>Step 6:</strong> 動作テスト・完了</li>
        </ol>
      </div>

      <button
        onClick={onNext}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-10 py-4 rounded-lg shadow-md transition-all hover:shadow-lg"
      >
        設定を始める
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
  const [isConnecting, setIsConnecting] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const handleSlackAuth = () => {
    if (!clientId) {
      alert("NEXT_PUBLIC_SLACK_CLIENT_ID が設定されていません");
      return;
    }
    setIsConnecting(true);
    // 実際のOAuth URLに遷移
    const scopes = "channels:read,channels:history,chat:write,users:read,groups:read,groups:history";
    const redirectUri = `${appUrl}/api/oauth/slack/install`;
    window.location.href = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  // デモ用：シミュレート
  const handleSimulateConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      onConnect();
      setIsConnecting(false);
    }, 1500);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">💬</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Slackと連携する</h2>
        <p className="text-gray-600">
          SlackワークスペースにBotを追加します
        </p>
      </div>

      {!isConnected ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">この設定で行うこと</h3>
            <ul className="text-blue-800 text-sm space-y-2">
              <li>• SlackワークスペースにBotをインストール</li>
              <li>• メッセージの読み取り・送信権限を許可</li>
              <li>• 監視するチャンネルを選択</li>
            </ul>
          </div>

          <div className="text-center mb-6">
            {clientId ? (
              <button
                onClick={handleSlackAuth}
                disabled={isConnecting}
                className="inline-flex items-center gap-3 bg-[#4A154B] hover:bg-[#611f69] text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-md transition-all disabled:opacity-50"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
                {isConnecting ? "接続中..." : "Slackに追加"}
              </button>
            ) : (
              <button
                onClick={handleSimulateConnect}
                disabled={isConnecting}
                className="inline-flex items-center gap-3 bg-[#4A154B] hover:bg-[#611f69] text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-md transition-all disabled:opacity-50"
              >
                {isConnecting ? "接続中..." : "Slackに追加（デモ）"}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">⚠️ {error}</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 inline-block">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-800 font-semibold">Slackとの連携が完了しました！</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t">
        <button onClick={onPrev} className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-100">
          ← 戻る
        </button>
        <button
          onClick={onNext}
          disabled={!isConnected}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次へ →
        </button>
      </div>
    </div>
  );
}

/**
 * Step 3: Lark Webhook (Slack → Lark)
 */
function StepLarkWebhook({
  webhookUrl,
  isTested,
  error,
  onChange,
  onTested,
  onNext,
  onPrev,
}: {
  webhookUrl: string;
  isTested: boolean;
  error?: string;
  onChange: (url: string) => void;
  onTested: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleTest = async () => {
    if (!webhookUrl) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/lark/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult("success");
        onTested();
      } else {
        setTestResult("error");
      }
    } catch {
      setTestResult("error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📥</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lark受信設定</h2>
        <p className="text-gray-600">
          <strong>Slack → Lark</strong> 方向の設定です
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Webhook URLとは？</h3>
        <p className="text-blue-800 text-sm mb-2">
          Slackのメッセージを受け取るためのLark側の「受信アドレス」です。
        </p>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          {showGuide ? "手順を隠す" : "取得手順を見る"}
        </button>
      </div>

      {showGuide && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-3">Webhook URL取得手順</h3>
          <ol className="text-yellow-800 space-y-2 text-sm">
            <li>1. Larkアプリで通知を受け取りたいグループを開く</li>
            <li>2. グループ名の右「...」→「設定」をクリック</li>
            <li>3. 「ボット」→「カスタムボットを追加」を選択</li>
            <li>4. ボット名を入力（例：Slack通知）して追加</li>
            <li>5. 表示されたWebhook URLをコピー</li>
          </ol>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Webhook URL
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
          className={`w-full px-4 py-3 border-2 rounded-lg ${
            error ? "border-red-300" : "border-gray-300"
          } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
        />
        {error && <p className="text-red-600 text-sm mt-2">⚠️ {error}</p>}
      </div>

      {webhookUrl && (
        <div className="mb-6">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {isTesting ? "テスト送信中..." : "テスト送信"}
          </button>
          {testResult === "success" && (
            <p className="text-green-600 text-sm mt-2">✅ テスト成功！Larkを確認してください</p>
          )}
          {testResult === "error" && (
            <p className="text-red-600 text-sm mt-2">❌ 送信失敗。URLを確認してください</p>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t">
        <button onClick={onPrev} className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-100">
          ← 戻る
        </button>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md"
        >
          次へ →
        </button>
      </div>
    </div>
  );
}

/**
 * Step 4: Lark App Setup (Lark → Slack)
 */
function StepLarkApp({
  appId,
  appSecret,
  onAppIdChange,
  onAppSecretChange,
  onNext,
  onPrev,
}: {
  appId: string;
  appSecret: string;
  onAppIdChange: (id: string) => void;
  onAppSecretChange: (secret: string) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app";
  const webhookEndpoint = `${appUrl}/api/lark/webhook`;

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📤</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lark送信設定</h2>
        <p className="text-gray-600">
          <strong>Lark → Slack</strong> 方向の設定です
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-purple-900 mb-2">なぜ必要？</h3>
        <p className="text-purple-800 text-sm">
          Larkからメッセージを送信してSlackに投稿するには、Lark Appの作成が必要です。
          これにより、Lark側のメッセージをこのシステムが受け取れるようになります。
        </p>
      </div>

      <button
        onClick={() => setShowGuide(!showGuide)}
        className="text-blue-600 hover:underline text-sm font-medium mb-4 block"
      >
        {showGuide ? "手順を隠す" : "Lark App作成手順を見る"}
      </button>

      {showGuide && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-3">Lark App作成手順</h3>
          <ol className="text-yellow-800 space-y-3 text-sm">
            <li>
              <strong>1.</strong>{" "}
              <a href="https://open.larksuite.com/app" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Lark Developer Console
              </a>
              を開く
            </li>
            <li><strong>2.</strong> 「Create Custom App」をクリック</li>
            <li><strong>3.</strong> App名を入力（例：Slack連携Bot）</li>
            <li><strong>4.</strong> 「Credentials & Basic Info」から App ID と App Secret をコピー</li>
            <li>
              <strong>5.</strong> 「Event Subscriptions」で以下のURLを設定：
              <div className="bg-gray-100 p-2 mt-1 rounded font-mono text-xs break-all">
                {webhookEndpoint}
              </div>
            </li>
            <li><strong>6.</strong> Event: 「im.message.receive_v1」を追加</li>
            <li><strong>7.</strong> 「Permissions」で「im:message」を追加</li>
            <li><strong>8.</strong> Appを「Publish」して有効化</li>
          </ol>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lark App ID
          </label>
          <input
            type="text"
            value={appId}
            onChange={(e) => onAppIdChange(e.target.value)}
            placeholder="cli_xxxxxxxxxxxxxxxx"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lark App Secret
          </label>
          <input
            type="password"
            value={appSecret}
            onChange={(e) => onAppSecretChange(e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-gray-600 text-sm">
          💡 この設定はスキップ可能です。スキップした場合、Lark → Slack方向の送信はできません。
        </p>
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <button onClick={onPrev} className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-100">
          ← 戻る
        </button>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md"
        >
          次へ →
        </button>
      </div>
    </div>
  );
}

/**
 * Step 5: Account Link
 */
function StepAccountLink({
  isLinked,
  larkOpenId,
  onLarkOpenIdChange,
  onLinked,
  onNext,
  onPrev,
}: {
  isLinked: boolean;
  larkOpenId: string;
  onLarkOpenIdChange: (id: string) => void;
  onLinked: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [showGuide, setShowGuide] = useState(false);

  const handleLinkAccount = () => {
    if (!larkOpenId.trim()) {
      alert("Lark Open IDを入力してください");
      return;
    }
    // Open Slack OAuth in new window
    localStorage.setItem("lark_open_id", larkOpenId);
    window.open("/link-account", "_blank");
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">アカウント連携</h2>
        <p className="text-gray-600">
          LarkユーザーとSlackアカウントを紐付けます
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-green-900 mb-2">なぜ必要？</h3>
        <p className="text-green-800 text-sm">
          この連携をしないと、Larkから送信したメッセージは「LarkInfo」というBot名で投稿されます。
          連携すると、<strong>あなた自身のSlackアカウント</strong>で投稿されるので、
          お客さんから見て誰が送ったか一目瞭然です。
        </p>
      </div>

      {!isLinked ? (
        <>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-blue-600 hover:underline text-sm font-medium mb-4 block"
          >
            {showGuide ? "手順を隠す" : "Lark Open IDの確認方法"}
          </button>

          {showGuide && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-yellow-900 mb-3">Lark Open IDの確認方法</h3>
              <ol className="text-yellow-800 space-y-2 text-sm">
                <li>1. Lark Developer Consoleでアプリを開く</li>
                <li>2. 「Event Subscriptions」のログを確認</li>
                <li>3. 自分がメッセージを送った時の sender.open_id をコピー</li>
                <li>または、管理者に問い合わせてください</li>
              </ol>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              あなたの Lark Open ID
            </label>
            <input
              type="text"
              value={larkOpenId}
              onChange={(e) => onLarkOpenIdChange(e.target.value)}
              placeholder="ou_xxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            onClick={handleLinkAccount}
            disabled={!larkOpenId.trim()}
            className="w-full bg-[#4A154B] hover:bg-[#611f69] text-white font-semibold py-4 rounded-lg disabled:opacity-50 mb-4"
          >
            Slackアカウントと連携
          </button>

          <div className="text-center">
            <button
              onClick={onLinked}
              className="text-blue-600 hover:underline text-sm"
            >
              連携が完了したらここをクリック
            </button>
          </div>
        </>
      ) : (
        <div className="text-center mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 inline-block">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-800 font-semibold">アカウント連携が完了しました！</p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-gray-600 text-sm">
          💡 この設定はスキップ可能です。スキップした場合、メッセージは「LarkInfo」Bot名で送信されます。
        </p>
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <button onClick={onPrev} className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-100">
          ← 戻る
        </button>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md"
        >
          次へ →
        </button>
      </div>
    </div>
  );
}

/**
 * Step 6: Complete
 */
function StepComplete({
  state,
  onComplete,
  onPrev,
  isComplete,
}: {
  state: WizardState;
  onComplete: () => void;
  onPrev: () => void;
  isComplete: boolean;
}) {
  if (isComplete) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-6 animate-bounce">🎉</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">設定が完了しました！</h2>
        <p className="text-lg text-gray-600 mb-8">
          SlackとLarkの双方向連携が有効になりました。
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left max-w-xl mx-auto">
          <h3 className="font-semibold text-green-900 mb-3">設定サマリー</h3>
          <ul className="space-y-2 text-green-800 text-sm">
            <li>✅ Slack連携: {state.slackConnected ? "完了" : "未設定"}</li>
            <li>✅ Slack → Lark: {state.larkWebhookTested ? "テスト済み" : state.larkWebhookUrl ? "設定済み" : "未設定"}</li>
            <li>✅ Lark → Slack: {state.larkAppId ? "設定済み" : "未設定（Bot名で送信）"}</li>
            <li>✅ アカウント連携: {state.accountLinked ? "完了" : "未設定（Bot名で送信）"}</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left max-w-xl mx-auto">
          <h3 className="font-semibold text-blue-900 mb-3">次のステップ</h3>
          <ol className="space-y-2 text-blue-800 text-sm">
            <li>1. Slackでテストメッセージを送信 → Larkに届くか確認</li>
            <li>2. LarkでSlackに返信 → Slackに投稿されるか確認</li>
            <li>3. 環境変数をVercelに設定（本番運用時）</li>
          </ol>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md"
          >
            ホームに戻る
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3 rounded-lg border-2 border-gray-300"
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
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">設定確認</h2>
        <p className="text-gray-600">設定内容を確認して完了してください</p>
      </div>

      <div className="space-y-4 mb-8">
        <div className={`p-4 rounded-lg border-2 ${state.slackConnected ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">Slack連携</span>
            <span className={state.slackConnected ? "text-green-600" : "text-gray-400"}>
              {state.slackConnected ? "✅ 完了" : "⏳ 未設定"}
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-lg border-2 ${state.larkWebhookUrl ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">Slack → Lark（受信）</span>
            <span className={state.larkWebhookUrl ? "text-green-600" : "text-gray-400"}>
              {state.larkWebhookTested ? "✅ テスト済み" : state.larkWebhookUrl ? "✅ 設定済み" : "⏳ 未設定"}
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-lg border-2 ${state.larkAppId ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">Lark → Slack（送信）</span>
            <span className={state.larkAppId ? "text-green-600" : "text-yellow-600"}>
              {state.larkAppId ? "✅ 設定済み" : "⚠️ 未設定（オプション）"}
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-lg border-2 ${state.accountLinked ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">アカウント連携</span>
            <span className={state.accountLinked ? "text-green-600" : "text-yellow-600"}>
              {state.accountLinked ? "✅ 完了" : "⚠️ 未設定（オプション）"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <button onClick={onPrev} className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-100">
          ← 戻る
        </button>
        <button
          onClick={onComplete}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md"
        >
          設定を完了する
        </button>
      </div>
    </div>
  );
}
