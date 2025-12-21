import { EventEmitter } from 'events';
import { SlackClient } from './slack';
import { LarkClient } from './lark';
import {
  BridgeConfig,
  BridgeStatus,
  BridgeEvent,
  BridgeEventType,
  SlackMessage,
  LarkMessage,
  ChannelMapping,
} from './types';
import { validateConfig } from './config';

export interface BridgeOptions {
  config: BridgeConfig;
}

export class LarkSlackBridge extends EventEmitter {
  private config: BridgeConfig;
  private slackClients: Map<string, SlackClient> = new Map();
  private larkClient: LarkClient;
  private isRunning = false;
  private startedAt?: Date;
  private stats = {
    slackToLark: 0,
    larkToSlack: 0,
    errors: 0,
  };
  // Track processed message IDs to prevent duplicates
  private processedMessageIds: Set<string> = new Set();
  // Track messages sent from Lark to Slack to prevent loops
  private sentToSlackMessages: Set<string> = new Set();

  constructor(options: BridgeOptions) {
    super();

    // Validate configuration
    const validation = validateConfig(options.config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    this.config = options.config;

    // Initialize Lark client
    this.larkClient = new LarkClient({
      config: options.config.lark,
      logLevel: options.config.options?.logLevel,
    });

    // Initialize Slack clients for each workspace
    for (const workspace of options.config.slack.workspaces) {
      const client = new SlackClient({
        workspace,
        socketMode: options.config.slack.socketMode,
        logLevel: options.config.options?.logLevel,
        senderConfig: options.config.sender,
      });

      // Set up message forwarding
      client.onMessage(async (message) => {
        await this.handleSlackMessage(message, workspace.id || 'default');
      });

      this.slackClients.set(workspace.id || 'default', client);
    }

    // Set up Lark message handling
    this.larkClient.onMessage(async (message) => {
      await this.handleLarkMessage(message);
    });
  }

  private async handleSlackMessage(message: SlackMessage, workspaceId: string): Promise<void> {
    this.emitEvent('slack:message', { message, workspaceId });

    // Apply filters
    if (!this.shouldForwardSlackMessage(message)) {
      return;
    }

    // Find channel mapping or use default behavior
    const mapping = this.findChannelMapping(message.channel, 'slack-to-lark');

    try {
      const formattedMessage = this.formatSlackToLark(message);

      if (mapping?.larkChat && this.larkClient.hasAppClient()) {
        // Send to specific Lark chat
        await this.larkClient.sendMessage(mapping.larkChat, formattedMessage);
      } else if (this.larkClient.hasWebhook()) {
        // Send via webhook
        const title = message.channelName
          ? `#${message.channelName} - ${message.userName || message.user}`
          : undefined;
        await this.larkClient.sendWebhook(formattedMessage, title);
      }

      this.stats.slackToLark++;
      this.emitEvent('bridge:forward', {
        direction: 'slack-to-lark',
        message,
        workspaceId,
      });
    } catch (error) {
      this.stats.errors++;
      this.emitEvent('bridge:error', {
        direction: 'slack-to-lark',
        message,
        error,
      });
      this.log('error', `Failed to forward Slack message: ${error}`);
    }
  }

  private async handleLarkMessage(message: LarkMessage): Promise<void> {
    // Check for duplicate messages
    if (message.messageId && this.processedMessageIds.has(message.messageId)) {
      this.log('info', `[handleLarkMessage] Skipping duplicate message: ${message.messageId}`);
      return;
    }

    // Track this message ID (keep only last 100 to prevent memory leak)
    if (message.messageId) {
      this.processedMessageIds.add(message.messageId);
      if (this.processedMessageIds.size > 100) {
        const firstId = this.processedMessageIds.values().next().value;
        if (firstId) this.processedMessageIds.delete(firstId);
      }
    }

    this.log('info', `[handleLarkMessage] Received message from Lark: ${message.content.slice(0, 50)}...`);
    this.emitEvent('lark:message', { message });

    // Find channel mapping or use default channel
    const mapping = this.findChannelMapping(message.chatId, 'lark-to-slack');
    const defaultChannel = this.config.options?.defaultSlackChannel;

    this.log('info', `[handleLarkMessage] chatId: ${message.chatId}, mapping: ${mapping?.slackChannel}, defaultChannel: ${defaultChannel}`);

    const targetChannel = mapping?.slackChannel || defaultChannel;

    if (!targetChannel) {
      this.log('warn', `[handleLarkMessage] No mapping or default channel for Lark chat: ${message.chatId}. Please set defaultSlackChannel.`);
      return;
    }

    try {
      const formattedMessage = this.formatLarkToSlack(message);
      this.log('info', `[handleLarkMessage] Formatted message: ${formattedMessage.slice(0, 100)}...`);

      const slackClient = this.slackClients.values().next().value as SlackClient | undefined;

      if (slackClient) {
        // Send as user if configured (松井大樹アカウントで送信)
        const sendAsUser = this.config.sender?.sendAsUser ?? false;
        const hasUserToken = slackClient.hasUserToken();
        this.log('info', `[handleLarkMessage] sendAsUser: ${sendAsUser}, hasUserToken: ${hasUserToken}`);

        if (sendAsUser && hasUserToken) {
          this.log('info', `[handleLarkMessage] Sending to Slack as user to channel: ${targetChannel}`);
          await slackClient.sendMessageAsUser(targetChannel, formattedMessage);
          this.log('info', `[handleLarkMessage] Successfully forwarded Lark message to Slack as user: ${targetChannel}`);
        } else {
          this.log('info', `[handleLarkMessage] Sending to Slack as bot to channel: ${targetChannel}`);
          await slackClient.sendMessage(targetChannel, formattedMessage);
          this.log('info', `[handleLarkMessage] Successfully forwarded Lark message to Slack: ${targetChannel}`);
        }

        // Track this message to prevent loop (Slack→Lark→Slack)
        this.sentToSlackMessages.add(formattedMessage);
        // Clean up old entries (keep last 50)
        if (this.sentToSlackMessages.size > 50) {
          const firstMsg = this.sentToSlackMessages.values().next().value;
          if (firstMsg) this.sentToSlackMessages.delete(firstMsg);
        }

        this.stats.larkToSlack++;
        this.emitEvent('bridge:forward', {
          direction: 'lark-to-slack',
          message,
          targetChannel,
        });
      } else {
        this.log('error', '[handleLarkMessage] No Slack client available');
      }
    } catch (error) {
      this.stats.errors++;
      this.emitEvent('bridge:error', {
        direction: 'lark-to-slack',
        message,
        error,
      });
      this.log('error', `[handleLarkMessage] Failed to forward Lark message: ${error}`);
    }
  }

  private shouldForwardSlackMessage(message: SlackMessage): boolean {
    // Skip messages that were sent from Lark (to prevent loops)
    if (message.text && this.sentToSlackMessages.has(message.text)) {
      this.log('info', `[shouldForwardSlackMessage] Skipping message sent from Lark: ${message.text.slice(0, 30)}...`);
      return false;
    }

    const filters = this.config.filters;
    if (!filters) return true;

    // Check channel inclusion
    if (filters.includeChannels?.length) {
      const included = filters.includeChannels.some(
        (ch) => ch === message.channel || ch === message.channelName
      );
      if (!included) return false;
    }

    // Check channel exclusion
    if (filters.excludeChannels?.length) {
      const excluded = filters.excludeChannels.some(
        (ch) => ch === message.channel || ch === message.channelName
      );
      if (excluded) return false;
    }

    // Check user inclusion
    if (filters.includeUsers?.length) {
      if (!filters.includeUsers.includes(message.user)) return false;
    }

    // Check user exclusion
    if (filters.excludeUsers?.length) {
      if (filters.excludeUsers.includes(message.user)) return false;
    }

    // Check pattern inclusion
    if (filters.includePatterns?.length) {
      const matched = filters.includePatterns.some((pattern) =>
        new RegExp(pattern).test(message.text)
      );
      if (!matched) return false;
    }

    // Check pattern exclusion
    if (filters.excludePatterns?.length) {
      const matched = filters.excludePatterns.some((pattern) =>
        new RegExp(pattern).test(message.text)
      );
      if (matched) return false;
    }

    return true;
  }

  private findChannelMapping(
    channelId: string,
    direction: 'slack-to-lark' | 'lark-to-slack'
  ): ChannelMapping | undefined {
    return this.config.channelMappings?.find((mapping) => {
      const matches =
        direction === 'slack-to-lark'
          ? mapping.slackChannel === channelId
          : mapping.larkChat === channelId;

      const directionMatches =
        mapping.direction === 'bidirectional' || mapping.direction === direction;

      return matches && directionMatches;
    });
  }

  private formatSlackToLark(message: SlackMessage): string {
    const options = this.config.options ?? {
      includeChannelName: true,
      includeUserName: true,
      includeTimestamp: true,
      timezone: 'Asia/Tokyo',
    };
    const parts: string[] = [];

    if (options.includeChannelName !== false && message.channelName) {
      parts.push(`[#${message.channelName}]`);
    }

    if (options.includeUserName !== false && message.userName) {
      parts.push(`${message.userName}:`);
    } else if (message.user) {
      parts.push(`<@${message.user}>:`);
    }

    parts.push(message.text);

    if (options.includeTimestamp !== false) {
      const date = new Date(parseFloat(message.ts) * 1000);
      const formatted = date.toLocaleString('ja-JP', {
        timeZone: options.timezone ?? 'Asia/Tokyo',
      });
      parts.push(`\n📅 ${formatted}`);
    }

    return parts.join(' ');
  }

  private formatLarkToSlack(message: LarkMessage): string {
    // Clean the content - remove @mentions like @_user_1
    let cleanContent = message.content.replace(/@_user_\d+\s*/g, '').trim();
    // Also remove @_all mentions
    cleanContent = cleanContent.replace(/@_all\s*/g, '').trim();

    // Simple format - just the message content
    // The sender info is not needed since we're sending as the user
    return cleanContent || message.content;
  }

  private emitEvent<T>(type: BridgeEventType, data: T): void {
    const event: BridgeEvent<T> = {
      type,
      timestamp: new Date(),
      data,
    };
    this.emit(type, event);
    this.emit('*', event);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const configLevel = this.config.options?.logLevel || 'info';
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) >= levels.indexOf(configLevel)) {
      console[level](`[LarkSlackBridge] ${message}`);
    }
  }

  /**
   * Start the bridge
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Bridge is already running');
    }

    this.log('info', 'Starting bridge...');

    // Start all Slack clients
    for (const [id, client] of this.slackClients) {
      try {
        await client.start();
        this.log('info', `Slack workspace ${id} connected`);
      } catch (error) {
        this.log('error', `Failed to start Slack workspace ${id}: ${error}`);
        throw error;
      }
    }

    this.isRunning = true;
    this.startedAt = new Date();
    this.emitEvent('bridge:connected', { workspaces: this.slackClients.size });
    this.log('info', 'Bridge started successfully');
  }

  /**
   * Stop the bridge
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.log('info', 'Stopping bridge...');

    // Stop all Slack clients
    for (const [id, client] of this.slackClients) {
      try {
        await client.stop();
        this.log('info', `Slack workspace ${id} disconnected`);
      } catch (error) {
        this.log('warn', `Error stopping Slack workspace ${id}: ${error}`);
      }
    }

    this.isRunning = false;
    this.emitEvent('bridge:disconnected', {});
    this.log('info', 'Bridge stopped');
  }

  /**
   * Get bridge status
   */
  getStatus(): BridgeStatus {
    const workspaces = Array.from(this.slackClients.entries()).map(([id, client]) => ({
      id,
      name: client.getWorkspace().name || id,
      connected: this.isRunning,
    }));

    return {
      isRunning: this.isRunning,
      slackConnected: this.isRunning && this.slackClients.size > 0,
      larkConnected: this.larkClient.hasWebhook() || this.larkClient.hasAppClient(),
      workspaces,
      messageStats: { ...this.stats },
      startedAt: this.startedAt,
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : undefined,
    };
  }

  /**
   * Handle incoming Lark webhook event
   */
  async handleLarkWebhook(event: Record<string, unknown>): Promise<{ challenge?: string } | void> {
    // Handle URL verification challenge
    const challenge = this.larkClient.getChallengeResponse(event);
    if (challenge) {
      return challenge;
    }

    // Handle message event
    await this.larkClient.handleEvent(event);
  }

  /**
   * Get Slack client for a workspace
   */
  getSlackClient(workspaceId?: string): SlackClient | undefined {
    if (workspaceId) {
      return this.slackClients.get(workspaceId);
    }
    return this.slackClients.values().next().value as SlackClient | undefined;
  }

  /**
   * Get Lark client
   */
  getLarkClient(): LarkClient {
    return this.larkClient;
  }
}
