import { useState, useRef, useEffect, useCallback } from 'react';

interface BridgeStatus {
  isRunning: boolean;
  slackConnected: boolean;
  larkConnected: boolean;
  messageStats: {
    slackToLark: number;
    larkToSlack: number;
  };
  serverPort?: number;
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface Config {
  slackBotToken: string;
  slackAppToken: string;
  slackSigningSecret: string;
  larkWebhookUrl: string;
}

// Tauri invoke wrapper - lazy loaded on first use
let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let tauriListen: ((event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void>) | null = null;

const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  if (!tauriInvoke) {
    try {
      const tauri = await import('@tauri-apps/api/tauri');
      tauriInvoke = tauri.invoke;
    } catch {
      throw new Error('Tauri not available');
    }
  }
  return tauriInvoke(cmd, args) as Promise<T>;
};

const listen = async (event: string, handler: (event: { payload: unknown }) => void): Promise<() => void> => {
  if (!tauriListen) {
    try {
      const eventModule = await import('@tauri-apps/api/event');
      tauriListen = eventModule.listen;
    } catch {
      throw new Error('Tauri not available');
    }
  }
  return tauriListen(event, handler);
};

function App() {
  const [status, setStatus] = useState<BridgeStatus>({
    isRunning: false,
    slackConnected: false,
    larkConnected: false,
    messageStats: { slackToLark: 0, larkToSlack: 0 },
  });
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: new Date().toLocaleTimeString('ja-JP'), message: 'アプリが正常に起動しました', type: 'info' }
  ]);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<Config>({
    slackBotToken: '',
    slackAppToken: '',
    slackSigningSecret: '',
    larkWebhookUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<'checking' | 'installed' | 'missing'>('checking');
  const configLoaded = useRef(false);
  const unlistenRefs = useRef<Array<() => void>>([]);

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    const time = new Date().toLocaleTimeString('ja-JP');
    setLogs((prev) => [...prev.slice(-99), { time, message, type }]);
  }, []);

  // Set up Tauri event listeners
  useEffect(() => {
    const setupListeners = async () => {
      try {
        // Check Node.js installation
        try {
          await invoke<string>('check_node_installed');
          setNodeStatus('installed');
        } catch {
          setNodeStatus('missing');
          addLog('Node.jsがインストールされていません', 'error');
        }

        // Listen for status updates
        const unlistenStatus = await listen('bridge-status', (event) => {
          const data = event.payload as BridgeStatus;
          setStatus(prev => ({
            ...prev,
            ...data,
          }));
        });
        unlistenRefs.current.push(unlistenStatus);

        // Listen for log messages
        const unlistenLog = await listen('bridge-log', (event) => {
          const data = event.payload as { level: string; message: string };
          const type = data.level === 'error' ? 'error' : data.level === 'info' ? 'info' : 'info';
          addLog(data.message, type as LogEntry['type']);
        });
        unlistenRefs.current.push(unlistenLog);

        // Listen for errors
        const unlistenError = await listen('bridge-error', (event) => {
          const data = event.payload as { error: string };
          addLog(data.error, 'error');
        });
        unlistenRefs.current.push(unlistenError);

        // Listen for ready event
        const unlistenReady = await listen('bridge-ready', (event) => {
          const data = event.payload as { port: number };
          addLog(`Lark Webhook受信サーバー起動 (port: ${data.port})`, 'success');
        });
        unlistenRefs.current.push(unlistenReady);

      } catch (error) {
        // Running outside Tauri (development mode)
        console.log('Running in browser mode:', error);
        setNodeStatus('installed'); // Assume installed in dev mode
      }
    };

    setupListeners();

    return () => {
      unlistenRefs.current.forEach(unlisten => unlisten());
      unlistenRefs.current = [];
    };
  }, [addLog]);

  const handleStart = async () => {
    if (nodeStatus === 'missing') {
      addLog('Node.jsをインストールしてください', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const newStatus = await invoke<BridgeStatus>('start_bridge');
      setStatus(newStatus);
      addLog('ブリッジを起動しました', 'success');
    } catch (error) {
      addLog(`起動エラー: ${error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      const newStatus = await invoke<BridgeStatus>('stop_bridge');
      setStatus(newStatus);
      addLog('ブリッジを停止しました', 'info');
    } catch (error) {
      addLog(`停止エラー: ${error}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSettings = async () => {
    // Load config from backend when opening settings
    if (!configLoaded.current) {
      try {
        const savedConfig = await invoke<Config>('get_config');
        setConfig(savedConfig);
        configLoaded.current = true;
      } catch {
        // Use default config if load fails
      }
    }
    setShowSettings(true);
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      await invoke('save_config', { config });
      addLog('設定を保存しました', 'success');
      setShowSettings(false);
    } catch (error) {
      addLog(`設定の保存に失敗: ${error}`, 'error');
      // Still close modal on error
      setShowSettings(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!config.larkWebhookUrl) {
      addLog('Webhook URLを入力してください', 'error');
      return;
    }
    setIsTesting(true);
    try {
      await invoke('test_lark_webhook', { url: config.larkWebhookUrl });
      addLog('Lark Webhookテスト成功', 'success');
    } catch (error) {
      addLog(`Webhookテスト失敗: ${error}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const getConnectionStatus = () => {
    if (!status.isRunning) return 'disconnected';
    if (status.slackConnected && status.larkConnected) return 'connected';
    return 'connecting';
  };

  const getStatusText = () => {
    const connStatus = getConnectionStatus();
    if (connStatus === 'connected') return '接続中';
    if (connStatus === 'connecting') return '接続中...';
    return '停止中';
  };

  return (
    <div className="app">
      <header className="header">
        <h1>
          <span className="logo">🔗</span>
          Lark-Slack Connector
        </h1>
        <div className={`status-badge ${getConnectionStatus()}`}>
          <span className="status-dot"></span>
          {getStatusText()}
        </div>
      </header>

      <main className="main">
        {nodeStatus === 'missing' && (
          <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
              <span>⚠️</span>
              <div>
                <strong>Node.js が必要です</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.8 }}>
                  ブリッジ機能を使用するには Node.js (v18以上) をインストールしてください
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📊 統計</h2>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {status.serverPort ? `ローカルサーバー: port ${status.serverPort}` : '稼働時間: -'}
            </span>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{status.messageStats.slackToLark}</div>
              <div className="stat-label">Slack → Lark</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{status.messageStats.larkToSlack}</div>
              <div className="stat-label">Lark → Slack</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">🔌 接続状態</h2>
          <div className="connection-item">
            <div className="connection-info">
              <span className="connection-icon">💬</span>
              <div>
                <div className="connection-name">Slack</div>
                <div className="connection-detail">Socket Mode (リアルタイム受信)</div>
              </div>
            </div>
            <span className="connection-status">
              {status.slackConnected ? '✅' : '❌'}
            </span>
          </div>
          <div className="connection-item">
            <div className="connection-info">
              <span className="connection-icon">🐦</span>
              <div>
                <div className="connection-name">Lark</div>
                <div className="connection-detail">Webhook (送信 + 受信サーバー)</div>
              </div>
            </div>
            <span className="connection-status">
              {status.larkConnected ? '✅' : '❌'}
            </span>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">📝 ログ</h2>
          <div className="log-container">
            {logs.map((log, i) => (
              <div key={i} className={`log-entry ${log.type}`}>
                <span className="log-time">{log.time}</span>
                {log.message}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="footer">
        <button className="btn btn-secondary" onClick={handleOpenSettings}>
          ⚙️ 設定
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {status.isRunning ? (
            <button className="btn btn-danger" onClick={handleStop} disabled={isLoading}>
              {isLoading ? '処理中...' : '⏹ 停止'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={isLoading || nodeStatus === 'missing'}
            >
              {isLoading ? '処理中...' : '▶️ 開始'}
            </button>
          )}
        </div>
      </footer>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⚙️ 設定</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, marginBottom: 12, color: 'var(--accent)' }}>
                  💬 Slack
                </h3>
                <div className="form-group">
                  <label className="form-label">Bot Token (xoxb-...)</label>
                  <input
                    type="password"
                    className="form-input"
                    value={config.slackBotToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, slackBotToken: e.target.value }))}
                    placeholder="xoxb-..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">App Token (xapp-...)</label>
                  <input
                    type="password"
                    className="form-input"
                    value={config.slackAppToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, slackAppToken: e.target.value }))}
                    placeholder="xapp-..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Signing Secret (オプション)</label>
                  <input
                    type="password"
                    className="form-input"
                    value={config.slackSigningSecret}
                    onChange={(e) => setConfig(prev => ({ ...prev, slackSigningSecret: e.target.value }))}
                    placeholder="Signing Secret..."
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                    Slack App設定ページの「Basic Information」→「Signing Secret」
                  </small>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 13, marginBottom: 12, color: 'var(--accent)' }}>
                  🐦 Lark
                </h3>
                <div className="form-group">
                  <label className="form-label">Webhook URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={config.larkWebhookUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, larkWebhookUrl: e.target.value }))}
                    placeholder="https://open.larksuite.com/..."
                  />
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={handleTestWebhook}
                  disabled={isTesting || !config.larkWebhookUrl}
                  style={{ marginTop: 8 }}
                >
                  {isTesting ? 'テスト中...' : '🧪 テスト送信'}
                </button>
              </div>

              <div style={{ marginTop: 20, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8 }}>
                <h4 style={{ fontSize: 12, marginBottom: 8, color: 'var(--accent)' }}>
                  📌 双方向通信について
                </h4>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  <strong>Slack → Lark:</strong> Socket Mode で自動受信<br />
                  <strong>Lark → Slack:</strong>
                  ローカルサーバー (port 3456) が起動します。
                  Larkの「Webhook設定」で <code>http://your-ip:3456/lark/webhook</code> を設定してください。
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveConfig}
                disabled={isLoading}
              >
                {isLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
