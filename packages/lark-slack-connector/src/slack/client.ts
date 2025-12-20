import { App, LogLevel } from '@slack/bolt';
import { SlackWorkspace, SlackMessage, SenderConfig } from '../types';

export interface SlackClientOptions {
  workspace: SlackWorkspace;
  socketMode?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  senderConfig?: SenderConfig;
}

export class SlackClient {
  private app: App;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private webClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private userWebClient: any;
  private workspace: SlackWorkspace;
  private senderConfig?: SenderConfig;
  private messageHandlers: Array<(message: SlackMessage) => void | Promise<void>> = [];

  constructor(options: SlackClientOptions) {
    this.workspace = options.workspace;
    this.senderConfig = options.senderConfig;

    const logLevelMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
    };

    this.app = new App({
      token: options.workspace.botToken,
      signingSecret: options.workspace.signingSecret,
      socketMode: options.socketMode ?? true,
      appToken: options.workspace.appToken,
      logLevel: logLevelMap[options.logLevel || 'info'],
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WebClient } = require('@slack/web-api');
    this.webClient = new WebClient(options.workspace.botToken);

    // Create user web client if user token is available
    const userToken = options.senderConfig?.slackUserToken || options.workspace.userToken;
    if (userToken) {
      this.userWebClient = new WebClient(userToken);
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for messages
    this.app.message(async ({ message, client }) => {
      // Ignore bot messages and message changes
      if ('subtype' in message && message.subtype) {
        return;
      }

      const slackMessage = await this.enrichMessage(message as { channel: string; user: string; text: string; ts: string; thread_ts?: string }, client);

      for (const handler of this.messageHandlers) {
        await handler(slackMessage);
      }
    });
  }

  private async enrichMessage(
    message: { channel: string; user: string; text: string; ts: string; thread_ts?: string },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any
  ): Promise<SlackMessage> {
    let channelName: string | undefined;
    let userName: string | undefined;

    try {
      const channelInfo = await client.conversations.info({ channel: message.channel });
      channelName = (channelInfo.channel as { name?: string })?.name;
    } catch {
      // Ignore errors fetching channel info
    }

    try {
      const userInfo = await client.users.info({ user: message.user });
      userName = userInfo.user?.real_name || userInfo.user?.name;
    } catch {
      // Ignore errors fetching user info
    }

    return {
      channel: message.channel,
      channelName,
      user: message.user,
      userName,
      text: message.text || '',
      ts: message.ts,
      threadTs: message.thread_ts,
    };
  }

  /**
   * Register a message handler
   */
  onMessage(handler: (message: SlackMessage) => void | Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Send a message to a Slack channel
   * @param channel - Channel ID or name
   * @param text - Message text
   * @param threadTs - Optional thread timestamp for replies
   * @param asUser - If true, send as user (requires user token)
   */
  async sendMessage(channel: string, text: string, threadTs?: string, asUser?: boolean): Promise<void> {
    const shouldSendAsUser = asUser ?? this.senderConfig?.sendAsUser ?? false;
    const client = shouldSendAsUser && this.userWebClient ? this.userWebClient : this.webClient;

    await client.chat.postMessage({
      channel,
      text,
      thread_ts: threadTs,
    });
  }

  /**
   * Send a message as the configured user (松井大樹)
   */
  async sendMessageAsUser(channel: string, text: string, threadTs?: string): Promise<void> {
    if (!this.userWebClient) {
      throw new Error('User token is not configured. Cannot send as user.');
    }
    await this.userWebClient.chat.postMessage({
      channel,
      text,
      thread_ts: threadTs,
    });
  }

  /**
   * Check if user token is available
   */
  hasUserToken(): boolean {
    return Boolean(this.userWebClient);
  }

  /**
   * Get channel info
   */
  async getChannelInfo(channelId: string): Promise<{ id: string; name: string } | null> {
    try {
      const result = await this.webClient.conversations.info({ channel: channelId });
      const channel = result.channel as { id: string; name: string } | undefined;
      if (channel) {
        return { id: channel.id, name: channel.name };
      }
    } catch {
      // Channel not found or no access
    }
    return null;
  }

  /**
   * List channels the bot has access to
   */
  async listChannels(): Promise<Array<{ id: string; name: string; isShared: boolean }>> {
    const channels: Array<{ id: string; name: string; isShared: boolean }> = [];
    let cursor: string | undefined;

    do {
      const result = await this.webClient.conversations.list({
        types: 'public_channel,private_channel',
        limit: 200,
        cursor,
      });

      for (const channel of result.channels || []) {
        channels.push({
          id: channel.id!,
          name: channel.name!,
          isShared: Boolean(channel.is_shared || channel.is_ext_shared),
        });
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    return channels;
  }

  /**
   * Start the Slack client
   */
  async start(): Promise<void> {
    await this.app.start();
  }

  /**
   * Stop the Slack client
   */
  async stop(): Promise<void> {
    await this.app.stop();
  }

  /**
   * Get workspace info
   */
  getWorkspace(): SlackWorkspace {
    return this.workspace;
  }
}
