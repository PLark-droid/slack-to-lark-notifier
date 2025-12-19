import pkg from '@slack/bolt';
const { App } = pkg;
type AppInstance = InstanceType<typeof App>;
import type { WorkspaceConfig, AppConfig } from './config.js';
import { ChannelManager } from './channel-manager.js';
import { sendToLark } from './lark.js';
import { formatSlackMessage } from './formatter.js';

export interface WorkspaceApp {
  config: WorkspaceConfig;
  app: AppInstance;
  channelManager: ChannelManager;
}

export class MultiWorkspaceApp {
  private workspaceApps: WorkspaceApp[] = [];
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    for (const wsConfig of this.config.workspaces) {
      const app = new App({
        token: wsConfig.botToken,
        signingSecret: wsConfig.signingSecret,
        socketMode: true,
        appToken: wsConfig.appToken,
      });

      const channelManager = new ChannelManager(this.config.channelFilter);

      // チャンネル一覧を取得
      await channelManager.loadChannels(app.client, wsConfig.id);

      // メッセージイベントハンドラを設定
      this.setupMessageHandler(app, wsConfig, channelManager);

      // メンションイベントハンドラを設定
      this.setupMentionHandler(app, wsConfig, channelManager);

      // チャンネルID変更イベントをハンドル（Slack Connect用）
      this.setupChannelIdChangedHandler(app, wsConfig, channelManager);

      this.workspaceApps.push({
        config: wsConfig,
        app,
        channelManager,
      });

      console.log(`Initialized workspace: ${wsConfig.name}`);
    }
  }

  private setupMessageHandler(
    app: AppInstance,
    wsConfig: WorkspaceConfig,
    channelManager: ChannelManager
  ): void {
    app.message(async ({ message, client }) => {
      if (message.subtype !== undefined && message.subtype !== 'bot_message') {
        return;
      }

      const channelId = 'channel' in message ? message.channel : undefined;
      if (!channelId) return;

      // チャンネルフィルタリング
      if (!channelManager.shouldProcessChannel(channelId)) {
        return;
      }

      const channelInfo = channelManager.getChannelInfo(channelId);
      const isShared = channelManager.isSharedChannel(channelId);

      // チャンネル名を取得（キャッシュになければAPI呼び出し）
      let channelName = channelInfo?.name || channelId;
      if (!channelInfo) {
        try {
          const info = await client.conversations.info({ channel: channelId });
          channelName = info.channel?.name || channelId;
        } catch {
          // 権限がない場合はIDをそのまま使用
        }
      }

      const formattedMessage = formatSlackMessage({
        ...message,
        channel: channelName,
      });

      // 共有チャンネルの場合は追加情報を付与
      const enrichedMessage = {
        ...formattedMessage,
        isSharedChannel: isShared,
        workspaceName: wsConfig.name,
        connectedTeams: channelInfo?.connectedTeamIds,
      };

      try {
        await sendToLark(enrichedMessage);
        console.log(
          `[${wsConfig.name}] Message forwarded from ${isShared ? 'shared ' : ''}channel #${channelName}`
        );
      } catch (error) {
        console.error(`[${wsConfig.name}] Failed to forward message:`, error);
      }
    });
  }

  private setupMentionHandler(
    app: AppInstance,
    wsConfig: WorkspaceConfig,
    channelManager: ChannelManager
  ): void {
    app.event('app_mention', async ({ event }) => {
      const channelId = event.channel;

      if (!channelManager.shouldProcessChannel(channelId)) {
        return;
      }

      const channelInfo = channelManager.getChannelInfo(channelId);
      const isShared = channelManager.isSharedChannel(channelId);

      const formattedMessage = formatSlackMessage({
        ...event,
        channel: channelInfo?.name || channelId,
      });

      const enrichedMessage = {
        ...formattedMessage,
        isSharedChannel: isShared,
        workspaceName: wsConfig.name,
        isMention: true,
      };

      try {
        await sendToLark(enrichedMessage);
        console.log(`[${wsConfig.name}] Mention forwarded from channel #${channelInfo?.name || channelId}`);
      } catch (error) {
        console.error(`[${wsConfig.name}] Failed to forward mention:`, error);
      }
    });
  }

  private setupChannelIdChangedHandler(
    app: AppInstance,
    wsConfig: WorkspaceConfig,
    channelManager: ChannelManager
  ): void {
    app.event('channel_id_changed', async ({ event }) => {
      console.log(
        `[${wsConfig.name}] Channel ID changed: ${event.old_channel_id} -> ${event.new_channel_id}`
      );
      // チャンネル一覧を再読み込み
      await channelManager.loadChannels(app.client, wsConfig.id);
    });
  }

  async start(): Promise<void> {
    const startPromises = this.workspaceApps.map(async (wa) => {
      await wa.app.start();
      console.log(`Started workspace app: ${wa.config.name}`);
    });

    await Promise.all(startPromises);
    console.log(`⚡️ Slack to Lark Notifier is running with ${this.workspaceApps.length} workspace(s)`);
  }

  async stop(): Promise<void> {
    const stopPromises = this.workspaceApps.map(async (wa) => {
      await wa.app.stop();
      console.log(`Stopped workspace app: ${wa.config.name}`);
    });

    await Promise.all(stopPromises);
  }

  getWorkspaceApps(): WorkspaceApp[] {
    return this.workspaceApps;
  }
}
