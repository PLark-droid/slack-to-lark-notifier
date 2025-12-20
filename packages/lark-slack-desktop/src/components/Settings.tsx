import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface Config {
  slackBotToken: string;
  slackSigningSecret: string;
  slackAppToken: string;
  larkWebhookUrl: string;
  autoStart: boolean;
  includeChannels: string;
  excludeChannels: string;
}

interface SettingsProps {
  onClose: () => void;
}

function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<Config>({
    slackBotToken: '',
    slackSigningSecret: '',
    slackAppToken: '',
    larkWebhookUrl: '',
    autoStart: true,
    includeChannels: '',
    excludeChannels: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    // Load saved config
    invoke<Config>('get_config')
      .then(setConfig)
      .catch(console.error);
  }, []);

  const handleChange = (field: keyof Config, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await invoke('save_config', { config });
      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLark = async () => {
    setTestResult(null);
    try {
      await invoke('test_lark_webhook', { url: config.larkWebhookUrl });
      setTestResult('success');
    } catch (error) {
      setTestResult('error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">⚙️ 設定</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* General */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, marginBottom: 12, color: 'var(--accent)' }}>
              🔧 一般
            </h3>
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={config.autoStart}
                onChange={(e) => handleChange('autoStart', e.target.checked)}
              />
              <span>ログイン時に自動起動</span>
            </label>
          </div>

          {/* Slack */}
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
                onChange={(e) => handleChange('slackBotToken', e.target.value)}
                placeholder="xoxb-..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Signing Secret</label>
              <input
                type="password"
                className="form-input"
                value={config.slackSigningSecret}
                onChange={(e) => handleChange('slackSigningSecret', e.target.value)}
                placeholder="Signing Secret"
              />
            </div>
            <div className="form-group">
              <label className="form-label">App Token (xapp-...)</label>
              <input
                type="password"
                className="form-input"
                value={config.slackAppToken}
                onChange={(e) => handleChange('slackAppToken', e.target.value)}
                placeholder="xapp-..."
              />
            </div>
          </div>

          {/* Lark */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, marginBottom: 12, color: 'var(--accent)' }}>
              🐦 Lark
            </h3>
            <div className="form-group">
              <label className="form-label">Webhook URL</label>
              <input
                type="text"
                className="form-input"
                value={config.larkWebhookUrl}
                onChange={(e) => handleChange('larkWebhookUrl', e.target.value)}
                placeholder="https://open.larksuite.com/..."
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={handleTestLark}
                disabled={!config.larkWebhookUrl}
              >
                テスト送信
              </button>
              {testResult === 'success' && (
                <span style={{ color: 'var(--success)' }}>✅ 成功</span>
              )}
              {testResult === 'error' && (
                <span style={{ color: 'var(--error)' }}>❌ 失敗</span>
              )}
            </div>
          </div>

          {/* Filters */}
          <div>
            <h3 style={{ fontSize: 13, marginBottom: 12, color: 'var(--accent)' }}>
              🔍 フィルター
            </h3>
            <div className="form-group">
              <label className="form-label">監視チャンネル（カンマ区切り、空欄で全て）</label>
              <input
                type="text"
                className="form-input"
                value={config.includeChannels}
                onChange={(e) => handleChange('includeChannels', e.target.value)}
                placeholder="general, announcements"
              />
            </div>
            <div className="form-group">
              <label className="form-label">除外チャンネル（カンマ区切り）</label>
              <input
                type="text"
                className="form-input"
                value={config.excludeChannels}
                onChange={(e) => handleChange('excludeChannels', e.target.value)}
                placeholder="random, test"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
