function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>
          <span className="logo">🔗</span>
          Lark-Slack Connector
        </h1>
        <div className="status-badge disconnected">
          <span className="status-dot"></span>
          停止中
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
              <div className="stat-value">0</div>
              <div className="stat-label">Slack → Lark</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">0</div>
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
            <span className="connection-status">❌</span>
          </div>
          <div className="connection-item">
            <div className="connection-info">
              <span className="connection-icon">🐦</span>
              <div>
                <div className="connection-name">Lark</div>
                <div className="connection-detail">Webhook</div>
              </div>
            </div>
            <span className="connection-status">❌</span>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">📝 ログ</h2>
          <div className="log-container">
            <div className="log-entry">アプリが正常に起動しました</div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <button className="btn btn-secondary">
          ⚙️ 設定
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary">
            ▶️ 開始
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
