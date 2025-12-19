/**
 * Configuration Example Component
 *
 * useConfig Hook の使用例
 */

'use client';

import { useState } from 'react';
import { useConfig } from '@/lib/hooks/useConfig';

export default function ConfigExample() {
  const [userId, setUserId] = useState('user-demo');
  const { config, loading, error, saveConfig, deleteConfig, reloadConfig } =
    useConfig(userId);

  const [formData, setFormData] = useState({
    slackBotToken: '',
    slackChannels: '',
    larkWebhookUrl: '',
  });

  // 設定が読み込まれたらフォームに反映
  if (config && !loading) {
    if (
      formData.slackBotToken === '' &&
      formData.slackChannels === '' &&
      formData.larkWebhookUrl === ''
    ) {
      setFormData({
        slackBotToken: config.slackBotToken || '',
        slackChannels: config.slackChannels.join(', '),
        larkWebhookUrl: config.larkWebhookUrl || '',
      });
    }
  }

  const handleSave = async () => {
    if (!config) return;

    const newConfig = {
      ...config,
      slackBotToken: formData.slackBotToken || undefined,
      slackChannels: formData.slackChannels
        .split(',')
        .map((ch) => ch.trim())
        .filter((ch) => ch.length > 0),
      larkWebhookUrl: formData.larkWebhookUrl || undefined,
    };

    const success = await saveConfig(newConfig);
    if (success) {
      alert('設定を保存しました！');
    } else {
      alert('設定の保存に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (confirm('設定を削除してもよろしいですか？')) {
      const success = await deleteConfig();
      if (success) {
        alert('設定を削除しました');
        setFormData({
          slackBotToken: '',
          slackChannels: '',
          larkWebhookUrl: '',
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-red-600">エラー: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">設定管理</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ユーザーID
        </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Slack Bot Token
        </label>
        <input
          type="password"
          value={formData.slackBotToken}
          onChange={(e) =>
            setFormData({ ...formData, slackBotToken: e.target.value })
          }
          placeholder="xoxb-..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Slack Channels (カンマ区切り)
        </label>
        <input
          type="text"
          value={formData.slackChannels}
          onChange={(e) =>
            setFormData({ ...formData, slackChannels: e.target.value })
          }
          placeholder="C123456, C789012"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lark Webhook URL
        </label>
        <input
          type="text"
          value={formData.larkWebhookUrl}
          onChange={(e) =>
            setFormData({ ...formData, larkWebhookUrl: e.target.value })
          }
          placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          保存
        </button>
        <button
          onClick={reloadConfig}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          再読み込み
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          削除
        </button>
      </div>

      {config && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold mb-2">現在の設定（JSON）</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
