import type { WebClient } from '@slack/web-api';

export interface SlackMessageOptions {
  channel: string;
  text: string;
  threadTs?: string;
  username?: string;
}

export class SlackSender {
  private client: WebClient;

  constructor(client: WebClient) {
    this.client = client;
  }

  async sendMessage(options: SlackMessageOptions): Promise<string | undefined> {
    const result = await this.client.chat.postMessage({
      channel: options.channel,
      text: options.text,
      thread_ts: options.threadTs,
      username: options.username,
    });

    if (!result.ok) {
      throw new Error(`Failed to send message to Slack: ${result.error}`);
    }

    return result.ts;
  }

  async findChannelByName(name: string): Promise<string | undefined> {
    const normalizedName = name.replace(/^#/, '');

    const result = await this.client.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
    });

    if (result.channels) {
      const channel = result.channels.find((ch) => ch.name === normalizedName);
      return channel?.id;
    }

    return undefined;
  }
}
