"use client";

import { useState, useEffect } from "react";

/**
 * Channel data structure from Slack API
 */
export interface Channel {
  id: string;
  name: string;
  is_private: boolean;
}

/**
 * Props for SlackChannelSelector component
 */
export interface SlackChannelSelectorProps {
  teamId: string;
  teamName: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

/**
 * SlackChannelSelector Component
 *
 * Displays a list of Slack channels and allows users to select
 * which channels to monitor for message forwarding to Lark.
 *
 * @param teamId - Slack team/workspace ID
 * @param teamName - Slack team/workspace name
 * @param onComplete - Callback when channel selection is saved successfully
 * @param onError - Callback when an error occurs
 */
export default function SlackChannelSelector({
  teamId,
  teamName,
  onComplete,
  onError,
}: SlackChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Fetch available channels from temporary storage
   */
  useEffect(() => {
    async function loadChannels() {
      try {
        const response = await fetch(`/api/oauth/slack/channels?team_id=${teamId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load channels");
        }

        const data = await response.json();
        setChannels(data.channels || []);
      } catch (err) {
        console.error("Failed to load channels:", err);
        onError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadChannels();
  }, [teamId, onError]);

  /**
   * Toggle channel selection
   */
  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  /**
   * Select all visible channels
   */
  const selectAll = () => {
    const filtered = getFilteredChannels();
    setSelectedChannels(new Set(filtered.map(ch => ch.id)));
  };

  /**
   * Deselect all channels
   */
  const deselectAll = () => {
    setSelectedChannels(new Set());
  };

  /**
   * Filter channels by search query
   */
  const getFilteredChannels = () => {
    if (!searchQuery.trim()) {
      return channels;
    }
    const query = searchQuery.toLowerCase();
    return channels.filter(ch =>
      ch.name.toLowerCase().includes(query)
    );
  };

  /**
   * Save selected channels configuration
   */
  const handleSave = async () => {
    if (selectedChannels.size === 0) {
      onError("少なくとも1つのチャンネルを選択してください");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/oauth/slack/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_id: teamId,
          channel_ids: Array.from(selectedChannels),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save configuration");
      }

      console.log("Channel configuration saved successfully");
      onComplete();
    } catch (err) {
      console.error("Failed to save configuration:", err);
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const filteredChannels = getFilteredChannels();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">チャンネル情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          チャンネルを選択
        </h2>
        <p className="text-gray-600 text-sm">
          <span className="font-medium">{teamName}</span> で監視するチャンネルを選択してください
        </p>
        <p className="text-gray-500 text-xs mt-1">
          選択したチャンネルの新着メッセージがLarkに転送されます
        </p>
      </div>

      {/* Search and Actions */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="チャンネル名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            全て選択
          </button>
          <button
            onClick={deselectAll}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            全て解除
          </button>
        </div>
      </div>

      {/* Selected Count */}
      <div className="mb-4 text-sm text-gray-600">
        {selectedChannels.size > 0 ? (
          <span className="font-medium text-blue-600">
            {selectedChannels.size}個のチャンネルを選択中
          </span>
        ) : (
          <span>チャンネルを選択してください</span>
        )}
      </div>

      {/* Channel List */}
      <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto mb-6">
        {filteredChannels.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? "検索結果が見つかりません" : "利用可能なチャンネルがありません"}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredChannels.map((channel) => (
              <label
                key={channel.id}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedChannels.has(channel.id)}
                  onChange={() => toggleChannel(channel.id)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">#</span>
                    <span className="font-medium text-gray-900 truncate">
                      {channel.name}
                    </span>
                    {channel.is_private && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        Private
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    ID: {channel.id}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          後から設定を変更することもできます
        </p>
        <button
          onClick={handleSave}
          disabled={saving || selectedChannels.size === 0}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "保存中..." : "設定を保存"}
        </button>
      </div>
    </div>
  );
}
