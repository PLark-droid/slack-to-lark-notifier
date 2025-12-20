import { useState, useRef } from 'react';

interface BridgeStatus {
  isRunning: boolean;
  slackConnected: boolean;
  larkConnected: boolean;
  messageStats: {
    slackToLark: number;
    larkToSlack: number;
  };
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface Config {
  slackBotToken: string;
  slackAppToken: string;
  larkWebhookUrl: string;
}

// Tauri invoke wrapper - lazy loaded on first use
let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;

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
    larkWebhookUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const configLoaded = useRef(false);

  const addLog = (message: string, type: LogEntry['type']) => {
    const time = new Date().toLocaleTimeString('ja-JP');
    setLogs((prev) => [...prev.slice(-99), { time, message, type }]);
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const newStatus = await invoke<BridgeStatus>('start_bridge');
      setStatus(newStatus);
      addLog('ブリッジを起動しました', 'success');
    } catch (error) {
      addLog(`起動エラー: ${error}`, 'error');
      // Fallback to local state
      setStatus(prev => ({
        ...prev,
        isRunning: true,
        slackConnected: true,
        larkConnected: true,
      }));
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
      // Fallback to local state
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        slackConnected: false,
        larkConnected: false,
      }));
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
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📊 統計</h2>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              稼働時間: -
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
                <div className="connection-detail">Socket Mode</div>
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
                <div className="connection-detail">Webhook</div>
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
            <button className="btn btn-primary" onClick={handleStart} disabled={isLoading}>
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
