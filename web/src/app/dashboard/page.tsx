"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ConfigStatus {
  slack: {
    connected: boolean;
    workspace?: string;
    botName?: string;
    channels?: string[];
  };
  lark: {
    webhookConfigured: boolean;
    appConfigured: boolean;
    appName?: string;
  };
  accountLinks: Array<{
    larkOpenId: string;
    slackUserId: string;
    slackUserName: string;
    linkedAt: string;
  }>;
  recentMessages: Array<{
    id: string;
    direction: "slack-to-lark" | "lark-to-slack";
    timestamp: string;
    from: string;
    preview: string;
    status: "success" | "failed";
  }>;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to fetch config from API
      const res = await fetch("/api/config/status");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        // Fallback to demo data if API not available
        setConfig(getDemoConfig());
      }
    } catch (err) {
      console.error("Failed to load config:", err);
      // Use demo data on error
      setConfig(getDemoConfig());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const getDemoConfig = (): ConfigStatus => {
    // Check environment variables
    const hasSlackToken = !!process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
    const hasLarkWebhook = false; // This would come from API in real scenario

    return {
      slack: {
        connected: hasSlackToken,
        workspace: hasSlackToken ? "Your Workspace" : undefined,
        botName: "Slack to Lark Bot",
        channels: hasSlackToken ? ["#general", "#support"] : undefined,
      },
      lark: {
        webhookConfigured: hasLarkWebhook,
        appConfigured: false,
      },
      accountLinks: [],
      recentMessages: [],
    };
  };

  const getSetupProgress = (): number => {
    if (!config) return 0;
    let progress = 0;
    if (config.slack.connected) progress += 25;
    if (config.lark.webhookConfigured) progress += 25;
    if (config.lark.appConfigured) progress += 25;
    if (config.accountLinks.length > 0) progress += 25;
    return progress;
  };

  const setupProgress = config ? getSetupProgress() : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-3xl hover:opacity-70 transition-opacity">
                🔔
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  ダッシュボード
                </h1>
                <p className="text-sm text-gray-500">
                  設定状態と転送履歴を確認
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadConfig}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
              >
                <span>🔄</span>
                更新
              </button>
            </div>
          </div>
          <nav className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <span>🏠</span>
                <span>ホーム</span>
              </Link>
              <Link
                href="/setup-wizard"
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <span>⚙️</span>
                <span>セットアップ</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-blue-100 text-blue-700 transition-colors"
              >
                <span>📊</span>
                <span>ダッシュボード</span>
              </Link>
              <Link
                href="/help"
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <span>❓</span>
                <span>ヘルプ</span>
              </Link>
            </div>
          </nav>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Setup Progress */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">セットアップ進捗</h2>
            <span className="text-2xl font-bold text-blue-600">{setupProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${setupProgress}%` }}
            />
          </div>
          {setupProgress < 100 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                💡 完全な双方向連携を有効にするには、すべての設定を完了してください
              </p>
              <Link
                href="/setup-wizard"
                className="inline-block mt-2 text-blue-600 hover:underline font-medium text-sm"
              >
                セットアップウィザードを開く →
              </Link>
            </div>
          )}
        </div>

        {/* Connection Status Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Slack Status */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">💬</div>
                <div>
                  <h3 className="font-bold text-gray-900">Slack連携</h3>
                  <p className="text-sm text-gray-500">メッセージ送信元</p>
                </div>
              </div>
              <StatusBadge status={config?.slack.connected ? "connected" : "not-connected"} />
            </div>

            {config?.slack.connected ? (
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1">ワークスペース</div>
                  <div className="font-medium text-gray-900">
                    {config.slack.workspace || "接続済み"}
                  </div>
                </div>
                {config.slack.channels && config.slack.channels.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600 mb-2">監視中のチャンネル</div>
                    <div className="flex flex-wrap gap-2">
                      {config.slack.channels.map((channel, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-white border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                        >
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <Link
                  href="/setup-wizard"
                  className="inline-block text-blue-600 hover:underline text-sm"
                >
                  設定を編集 →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-600 text-sm">
                  Slackワークスペースが接続されていません
                </p>
                <Link
                  href="/setup-wizard"
                  className="inline-flex items-center gap-2 bg-[#4A154B] hover:bg-[#611f69] text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <span>💬</span>
                  Slackに接続
                </Link>
              </div>
            )}
          </div>

          {/* Lark Status */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">📱</div>
                <div>
                  <h3 className="font-bold text-gray-900">Lark連携</h3>
                  <p className="text-sm text-gray-500">メッセージ受信先</p>
                </div>
              </div>
              <StatusBadge
                status={config?.lark.webhookConfigured ? "connected" : "not-connected"}
              />
            </div>

            <div className="space-y-3">
              {/* Webhook Status */}
              <div
                className={`rounded-lg p-3 ${
                  config?.lark.webhookConfigured ? "bg-green-50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Webhook設定（Slack → Lark）
                  </span>
                  <span className="text-xs">
                    {config?.lark.webhookConfigured ? "✅" : "⏳"}
                  </span>
                </div>
              </div>

              {/* App Status */}
              <div
                className={`rounded-lg p-3 ${
                  config?.lark.appConfigured ? "bg-green-50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    App設定（Lark → Slack）
                  </span>
                  <span className="text-xs">
                    {config?.lark.appConfigured ? "✅" : "⚠️ オプション"}
                  </span>
                </div>
              </div>

              <Link
                href="/setup-wizard"
                className="inline-block text-blue-600 hover:underline text-sm"
              >
                設定を編集 →
              </Link>
            </div>
          </div>
        </div>

        {/* Account Links */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔗</div>
              <div>
                <h3 className="font-bold text-gray-900">アカウント連携</h3>
                <p className="text-sm text-gray-500">本人名義でメッセージを送信</p>
              </div>
            </div>
            <Link
              href="/link-account"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              + 連携を追加
            </Link>
          </div>

          {config?.accountLinks && config.accountLinks.length > 0 ? (
            <div className="space-y-2">
              {config.accountLinks.map((link, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{link.slackUserName}</div>
                      <div className="text-xs text-gray-500">
                        Slack ID: {link.slackUserId}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(link.linkedAt).toLocaleDateString("ja-JP")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-3">🔗</div>
              <p className="text-gray-600 mb-4">アカウント連携がまだありません</p>
              <p className="text-sm text-gray-500 mb-4">
                連携することで、Larkから送信したメッセージが本人のSlackアカウントで投稿されます
              </p>
              <Link
                href="/link-account"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                <span>🔗</span>
                アカウント連携を開始
              </Link>
            </div>
          )}
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📨</div>
              <div>
                <h3 className="font-bold text-gray-900">最近の転送履歴</h3>
                <p className="text-sm text-gray-500">過去24時間のメッセージ転送</p>
              </div>
            </div>
          </div>

          {config?.recentMessages && config.recentMessages.length > 0 ? (
            <div className="space-y-2">
              {config.recentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DirectionIcon direction={msg.direction} />
                      <span className="text-sm font-medium text-gray-700">
                        {msg.direction === "slack-to-lark" ? "Slack → Lark" : "Lark → Slack"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageStatusBadge status={msg.status} />
                      <span className="text-xs text-gray-400">
                        {new Date(msg.timestamp).toLocaleTimeString("ja-JP")}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    送信者: <span className="font-medium">{msg.from}</span>
                  </div>
                  <div className="text-sm text-gray-500 truncate">{msg.preview}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-600 mb-2">転送履歴がまだありません</p>
              <p className="text-sm text-gray-500">
                セットアップ完了後、メッセージ転送が開始されます
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Link
            href="/setup-wizard"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <div className="font-semibold text-gray-900">セットアップウィザード</div>
            <div className="text-xs text-gray-500 mt-1">設定を追加・変更</div>
          </Link>
          <Link
            href="/help"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl mb-2">❓</div>
            <div className="font-semibold text-gray-900">ヘルプ・FAQ</div>
            <div className="text-xs text-gray-500 mt-1">よくある質問を見る</div>
          </Link>
          <a
            href="https://github.com/your-repo/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl mb-2">🐛</div>
            <div className="font-semibold text-gray-900">問題を報告</div>
            <div className="text-xs text-gray-500 mt-1">GitHub Issueを作成</div>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <Link href="/" className="text-blue-600 hover:underline font-medium mb-2 inline-block">
            ホームに戻る
          </Link>
          <div className="text-gray-500 text-sm">
            Slack to Lark Notifier v0.1.0
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: "connected" | "not-connected" | "partial" }) {
  const styles = {
    connected: "bg-green-100 text-green-800 border-green-200",
    "not-connected": "bg-gray-100 text-gray-600 border-gray-200",
    partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  const labels = {
    connected: "接続済み",
    "not-connected": "未接続",
    partial: "部分的",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function MessageStatusBadge({ status }: { status: "success" | "failed" }) {
  return status === "success" ? (
    <span className="text-green-600 text-xs">✅</span>
  ) : (
    <span className="text-red-600 text-xs">❌</span>
  );
}

function DirectionIcon({ direction }: { direction: "slack-to-lark" | "lark-to-slack" }) {
  return direction === "slack-to-lark" ? (
    <span className="text-blue-600">→</span>
  ) : (
    <span className="text-purple-600">←</span>
  );
}
