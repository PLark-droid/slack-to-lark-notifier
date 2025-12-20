import { useState, useEffect } from 'react';
import Settings from './components/Settings';

// Dynamic import for Tauri API to handle cases where it might not be available
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  if (!isTauri) {
    console.warn('Tauri not available, using mock');
    return {} as T;
  }
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/tauri');
  return tauriInvoke<T>(cmd, args);
};

const listen = async <T,>(event: string, handler: (event: { payload: T }) => void) => {
  if (!isTauri) {
    return () => {};
  }
  const { listen: tauriListen } = await import('@tauri-apps/api/event');
  return tauriListen<T>(event, handler);
};

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

function App() {
  const [status, setStatus] = useState<BridgeStatus>({
    isRunning: false,
    slackConnected: false,
    larkConnected: false,
    messageStats: { slackToLark: 0, larkToSlack: 0, errors: 0 },
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Listen for status updates from Tauri backend
    const unlisten = listen<BridgeStatus>('bridge-status', (event) => {
      setStatus(event.payload);
    });

    // Listen for log messages
    const unlistenLogs = listen<LogEntry>('bridge-log', (event) => {
      setLogs((prev) => [...prev.slice(-99), event.payload]);
    });

    // Get initial status
    invoke<BridgeStatus>('get_status').then(setStatus).catch(console.error);

    return () => {
      unlisten.then((f) => f());
      unlistenLogs.then((f) => f());
    };
  }, []);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await invoke('start_bridge');
      addLog('ブリッジを起動しました', 'success');
    } catch (error) {
      addLog(`起動エラー: ${error}`, 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      await invoke('stop_bridge');
      addLog('ブリッジを停止しました', 'info');
    } catch (error) {
      addLog(`停止エラー: ${error}`, 'error');
    }
  };

  const addLog = (message: string, type: LogEntry['type']) => {
    const time = new Date().toLocaleTimeString('ja-JP');
    setLogs((prev) => [...prev.slice(-99), { time, message, type }]);
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
        {/* Stats Card */}
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

        {/* Connections Card */}
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

        {/* Logs Card */}
        <div className="card">
          <h2 className="card-title">📝 ログ</h2>
          <div className="log-container">
            {logs.length === 0 ? (
              <div className="log-entry">ログがありません</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`log-entry ${log.type}`}>
                  <span className="log-time">{log.time}</span>
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <button className="btn btn-secondary" onClick={() => setShowSettings(true)}>
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

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
