import type { WebClient } from '@slack/web-api';
import type { ChannelFilter } from './config.js';

export interface ChannelInfo {
  id: string;
  name: string;
  isShared: boolean;
  isExtShared: boolean;
  workspaceId: string;
  connectedTeamIds?: string[];
}

export class ChannelManager {
  private channels: Map<string, ChannelInfo> = new Map();
  private filter: ChannelFilter;

  constructor(filter: ChannelFilter) {
    this.filter = filter;
  }

  async loadChannels(client: WebClient, workspaceId: string): Promise<void> {
    try {
      const result = await client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
      });

      if (result.channels) {
        for (const channel of result.channels) {
          if (channel.id && channel.name) {
            // connected_team_ids は Slack Connect チャンネルで利用可能
            const connectedTeamIds = (channel as { connected_team_ids?: string[] }).connected_team_ids;
            this.channels.set(channel.id, {
              id: channel.id,
              name: channel.name,
              isShared: channel.is_shared || false,
              isExtShared: channel.is_ext_shared || false,
              workspaceId,
              connectedTeamIds,
            });
          }
        }
      }

      console.log(`Loaded ${this.channels.size} channels for workspace ${workspaceId}`);
    } catch (error) {
      console.error(`Failed to load channels for workspace ${workspaceId}:`, error);
    }
  }

  shouldProcessChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);

    // 除外リストにあるチャンネルはスキップ
    if (this.filter.excludeChannelIds?.includes(channelId)) {
      return false;
    }

    // 特定のチャンネルIDが指定されている場合
    if (this.filter.channelIds && this.filter.channelIds.length > 0) {
      return this.filter.channelIds.includes(channelId);
    }

    // 特定のチャンネル名が指定されている場合
    if (this.filter.channelNames && this.filter.channelNames.length > 0 && channel) {
      return this.filter.channelNames.includes(channel.name);
    }

    // 共有チャンネルのフィルタリング
    if (channel) {
      if (channel.isShared || channel.isExtShared) {
        return this.filter.includeSharedChannels;
      }
    }

    // デフォルトは全チャンネル処理（フィルタ指定がない場合）
    return true;
  }

  getChannelInfo(channelId: string): ChannelInfo | undefined {
    return this.channels.get(channelId);
  }

  isSharedChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    return channel ? (channel.isShared || channel.isExtShared) : false;
  }

  getSharedChannels(): ChannelInfo[] {
    return Array.from(this.channels.values()).filter(
      (ch) => ch.isShared || ch.isExtShared
    );
  }
}
