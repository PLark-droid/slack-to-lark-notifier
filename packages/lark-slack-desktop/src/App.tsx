import { useState, useEffect } from 'react';

interface BridgeStatus {
  isRunning: boolean;
  slackConnected: boolean;
  larkConnected: boolean;
  messageStats: {
    slackToLark: number;
    larkToSlack: number;
    errors: number;
  };
  uptime?: number;
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

// Safe invoke wrapper - only call Tauri when available
const safeInvoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T | null> => {
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { invoke } = await import('@tauri-apps/api/tauri');
      return await invoke<T>(cmd, args);
    }
  } catch (e) {
    console.error(`Tauri invoke error (${cmd}):`, e);
  }
  return null;
};

function App() {
  const [status, setStatus] = useState<BridgeStatus>({
    isRunning: false,
    slackConnected: false,
    larkConnected: false,
    messageStats: { slackToLark: 0, larkToSlack: 0, errors: 0 },
  });
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: new Date().toLocaleTimeString('ja-JP'), message: 'アプリが正常に起動しました', type: 'info' }
  ]);
  const [isStarting, setIsStarting] = useState(false);

  // Fetch initial status after component mounts
  useEffect(() => {
    const fetchStatus = async () => {
      const result = await safeInvoke<BridgeStatus>('get_status');
      if (result) {
        setStatus(result);
      }
    };

    // Delay the initial fetch to ensure Tauri is ready
    const timer = setTimeout(fetchStatus, 500);
    return () => clearTimeout(timer);
  }, []);

  const addLog = (message: string, type: LogEntry['type']) => {
    const time = new Date().toLocaleTimeString('ja-JP');
    setLogs((prev) => [...prev.slice(-99), { time, message, type }]);
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await safeInvoke('start_bridge');
      const newStatus = await safeInvoke<BridgeStatus>('get_status');
      if (newStatus) setStatus(newStatus);
      addLog('ブリッジを起動しました', 'success');
    } catch (error) {
      addLog(`起動エラー: ${error}`, 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      await safeInvoke('stop_bridge');
      const newStatus = await safeInvoke<BridgeStatus>('get_status');
      if (newStatus) setStatus(newStatus);
      addLog('ブリッジを停止しました', 'info');
    } catch (error) {
      addLog(`停止エラー: ${error}`, 'error');
    }
  };

  const formatUptime = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}時間${minutes % 60}分`;
    if (minutes > 0) return `${minutes}分${seconds % 60}秒`;
    return `${seconds}秒`;
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
              稼働時間: {formatUptime(status.uptime)}
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
        <button className="btn btn-secondary">
          ⚙️ 設定
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {status.isRunning ? (
            <button className="btn btn-danger" onClick={handleStop}>
              ⏹ 停止
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={isStarting}
            >
              {isStarting ? '起動中...' : '▶️ 開始'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
