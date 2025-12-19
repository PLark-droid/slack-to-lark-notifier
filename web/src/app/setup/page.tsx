"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Config {
  slack: {
    botToken: string;
    appToken: string;
    signingSecret: string;
    userToken: string;
    workspaceName: string;
  };
  lark: {
    webhookUrl: string;
    receiverEnabled: boolean;
    appId: string;
    verificationToken: string;
  };
  slackConnect: {
    enabled: boolean;
    channelIds: string;
    pollingInterval: number;
  };
}

const initialConfig: Config = {
  slack: {
    botToken: "",
    appToken: "",
    signingSecret: "",
    userToken: "",
    workspaceName: "",
  },
  lark: {
    webhookUrl: "",
    receiverEnabled: false,
    appId: "",
    verificationToken: "",
  },
  slackConnect: {
    enabled: false,
    channelIds: "",
    pollingInterval: 5000,
  },
};

function SetupForm() {
  const searchParams = useSearchParams();
  const isAdvancedMode = searchParams.get("mode") === "advanced";

  const [config, setConfig] = useState<Config>(initialConfig);
  const [errors, setErrors] = useState<string[]>([]);
  const [showEnv, setShowEnv] = useState(false);

  useEffect(() => {
    if (isAdvancedMode) {
      setConfig((prev) => ({
        ...prev,
        lark: { ...prev.lark, receiverEnabled: true },
      }));
    }
  }, [isAdvancedMode]);

  const validate = (): string[] => {
    const errs: string[] = [];

    if (!config.slack.botToken) {
      errs.push("Bot Token は必須です");
    } else if (!config.slack.botToken.startsWith("xoxb-")) {
      errs.push("Bot Token は xoxb- で始まる必要があります");
    }

    if (!config.slack.appToken) {
      errs.push("App Token は必須です");
    } else if (!config.slack.appToken.startsWith("xapp-")) {
      errs.push("App Token は xapp- で始まる必要があります");
    }

    if (!config.slack.signingSecret) {
      errs.push("Signing Secret は必須です");
    }

    if (!config.lark.webhookUrl) {
      errs.push("Lark Webhook URL は必須です");
    } else if (!config.lark.webhookUrl.includes("larksuite.com")) {
      errs.push("Lark Webhook URL は larksuite.com のURLである必要があります");
    }

    if (config.lark.receiverEnabled) {
      if (!config.lark.appId) {
        errs.push("双方向通信を使う場合、Lark App ID は必須です");
      }
      if (!config.lark.verificationToken) {
        errs.push("双方向通信を使う場合、Verification Token は必須です");
      }
    }

    if (config.slackConnect.enabled) {
      if (!config.slack.userToken) {
        errs.push("Slack Connect を使う場合、User Token は必須です");
      } else if (!config.slack.userToken.startsWith("xoxp-")) {
        errs.push("User Token は xoxp- で始まる必要があります");
      }
      if (!config.slackConnect.channelIds) {
        errs.push("Slack Connect を使う場合、チャンネルID は必須です");
      }
    }

    return errs;
  };

  const handleGenerate = () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.length === 0) {
      setShowEnv(true);
    }
  };

  const generateEnvContent = () => {
    const lines: string[] = [
      "# Slack Configuration",
      `SLACK_BOT_TOKEN=${config.slack.botToken}`,
      `SLACK_APP_TOKEN=${config.slack.appToken}`,
      `SLACK_SIGNING_SECRET=${config.slack.signingSecret}`,
    ];

    if (config.slack.workspaceName) {
      lines.push(`SLACK_WORKSPACE_NAME=${config.slack.workspaceName}`);
    }

    lines.push("");
    lines.push("# Lark Configuration");
    lines.push(`LARK_WEBHOOK_URL=${config.lark.webhookUrl}`);

    if (config.lark.receiverEnabled) {
      lines.push(`LARK_RECEIVER_ENABLED=true`);
      lines.push(`LARK_APP_ID=${config.lark.appId}`);
      lines.push(`LARK_VERIFICATION_TOKEN=${config.lark.verificationToken}`);
    }

    if (config.slackConnect.enabled) {
      lines.push("");
      lines.push("# Slack Connect Configuration");
      lines.push(`SLACK_USER_TOKEN=${config.slack.userToken}`);
      lines.push(`SLACK_CONNECT_ENABLED=true`);
      lines.push(`SLACK_CONNECT_CHANNEL_IDS=${config.slackConnect.channelIds}`);
      lines.push(`SLACK_CONNECT_POLLING_INTERVAL=${config.slackConnect.pollingInterval}`);
    }

    return lines.join("\n");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateEnvContent());
    alert("クリップボードにコピーしました！");
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
            設定を入力
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            取得した情報を入力して .env ファイルを生成します
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <h3 className="text-red-800 font-medium mb-2">入力エラー</h3>
            <ul className="text-red-700 text-sm space-y-1">
              {errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {!showEnv ? (
          <>
            {/* Slack Section */}
            <section className="bg-white rounded-xl p-6 shadow-md mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">💬</span>
                Slack 設定
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bot Token <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="xoxb-..."
                    value={config.slack.botToken}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        slack: { ...config.slack, botToken: e.target.value },
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    OAuth & Permissions ページから取得
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    App Token <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="xapp-..."
                    value={config.slack.appToken}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        slack: { ...config.slack, appToken: e.target.value },
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Socket Mode ページで生成
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signing Secret <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="abc123..."
                    value={config.slack.signingSecret}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        slack: { ...config.slack, signingSecret: e.target.value },
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Basic Information ページから取得
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace Name（任意）
                  </label>
                  <input
                    type="text"
                    placeholder="My Workspace"
                    value={config.slack.workspaceName}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        slack: { ...config.slack, workspaceName: e.target.value },
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Lark Section */}
            <section className="bg-white rounded-xl p-6 shadow-md mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🐦</span>
                Lark 設定
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..."
                    value={config.lark.webhookUrl}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lark: { ...config.lark, webhookUrl: e.target.value },
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Advanced: Bidirectional */}
                <div className="pt-4 border-t">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.lark.receiverEnabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          lark: { ...config.lark, receiverEnabled: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      双方向通信を有効にする（Lark → Slack）
                    </span>
                  </label>
                </div>

                {config.lark.receiverEnabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-purple-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lark App ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="cli_xxxxx"
                        value={config.lark.appId}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lark: { ...config.lark, appId: e.target.value },
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Verification Token <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="xxxxxx"
                        value={config.lark.verificationToken}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lark: { ...config.lark, verificationToken: e.target.value },
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Slack Connect Section */}
            <section className="bg-white rounded-xl p-6 shadow-md mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🔗</span>
                Slack Connect（外部共有チャンネル）
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.slackConnect.enabled}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        slackConnect: {
                          ...config.slackConnect,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Slack Connect チャンネルを監視する
                  </span>
                </label>
                <p className="text-xs text-gray-500">
                  外部パートナーとの共有チャンネルがある場合にチェック
                </p>

                {config.slackConnect.enabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-orange-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User Token <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="xoxp-..."
                        value={config.slack.userToken}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            slack: { ...config.slack, userToken: e.target.value },
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        OAuth & Permissions ページの User OAuth Token
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        監視チャンネルID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="C0123456789,C9876543210"
                        value={config.slackConnect.channelIds}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            slackConnect: {
                              ...config.slackConnect,
                              channelIds: e.target.value,
                            },
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        複数の場合はカンマで区切る
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ポーリング間隔（ミリ秒）
                      </label>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={config.slackConnect.pollingInterval}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            slackConnect: {
                              ...config.slackConnect,
                              pollingInterval: parseInt(e.target.value) || 5000,
                            },
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        デフォルト: 5000ms（5秒）
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                .env ファイルを生成
              </button>
            </div>
          </>
        ) : (
          /* Generated .env */
          <section className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              ✅ 設定ファイルが生成されました
            </h2>
            <p className="text-gray-600 mb-4">
              以下の内容を <code className="bg-gray-100 px-2 py-0.5 rounded">.env</code> ファイルに保存してください。
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4">
              <pre>{generateEnvContent()}</pre>
            </div>
            <div className="flex gap-4">
              <button
                onClick={copyToClipboard}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                クリップボードにコピー
              </button>
              <button
                onClick={() => setShowEnv(false)}
                className="text-gray-600 px-4 py-2 hover:text-gray-800"
              >
                戻る
              </button>
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">次のステップ</h3>
              <ol className="text-blue-700 text-sm space-y-2">
                <li>1. プロジェクトのルートディレクトリに <code className="bg-blue-100 px-1 rounded">.env</code> ファイルを作成</li>
                <li>2. 上記の内容を貼り付けて保存</li>
                <li>3. ターミナルで <code className="bg-blue-100 px-1 rounded">npm run dev</code> を実行</li>
                <li>4. Slackでテストメッセージを送信して動作確認</li>
              </ol>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SetupForm />
    </Suspense>
  );
}
