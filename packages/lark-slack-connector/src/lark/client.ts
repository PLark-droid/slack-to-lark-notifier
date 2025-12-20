import * as lark from '@larksuiteoapi/node-sdk';
import { LarkConfig, LarkMessage } from '../types';

export interface LarkClientOptions {
  config: LarkConfig;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class LarkClient {
  private config: LarkConfig;
  private client?: lark.Client;
  private messageHandlers: Array<(message: LarkMessage) => void | Promise<void>> = [];
  private logLevel: string;

  constructor(options: LarkClientOptions) {
    this.config = options.config;
    this.logLevel = options.logLevel || 'info';

    // Initialize Lark SDK client if app credentials provided
    if (options.config.appId && options.config.appSecret) {
      this.client = new lark.Client({
        appId: options.config.appId,
        appSecret: options.config.appSecret,
        loggerLevel: this.getLoggerLevel(),
      });
    }
  }

  private getLoggerLevel(): lark.LoggerLevel {
    const levels: Record<string, lark.LoggerLevel> = {
      debug: lark.LoggerLevel.debug,
      info: lark.LoggerLevel.info,
      warn: lark.LoggerLevel.warn,
      error: lark.LoggerLevel.error,
    };
    return levels[this.logLevel] || lark.LoggerLevel.info;
  }

  /**
   * Send message via webhook
   */
  async sendWebhook(text: string, title?: string): Promise<boolean> {
    if (!this.config.webhookUrl) {
      throw new Error('Lark webhook URL is not configured');
    }

    const payload = title
      ? {
          msg_type: 'interactive',
          card: {
            header: {
              title: {
                tag: 'plain_text',
                content: title,
              },
            },
            elements: [
              {
                tag: 'markdown',
                content: text,
              },
            ],
          },
        }
      : {
          msg_type: 'text',
          content: {
            text,
          },
        };

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lark webhook failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as { code?: number; msg?: string };
    return result.code === 0;
  }

  /**
   * Send message via Lark API (requires app credentials)
   */
  async sendMessage(chatId: string, text: string, replyToMessageId?: string): Promise<string | undefined> {
    if (!this.client) {
      throw new Error('Lark client is not initialized. Provide appId and appSecret.');
    }

    const response = await this.client.im.message.create({
      params: {
        receive_id_type: 'chat_id',
      },
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
        ...(replyToMessageId && { reply_message_id: replyToMessageId }),
      },
    });

    return response.data?.message_id;
  }

  /**
   * Register a message handler for incoming Lark messages
   */
  onMessage(handler: (message: LarkMessage) => void | Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Handle incoming Lark event (for webhook receiver)
   */
  async handleEvent(event: Record<string, unknown>): Promise<void> {
    // Verify event if verification token is configured
    if (this.config.verificationToken) {
      const token = event.token as string | undefined;
      if (token !== this.config.verificationToken) {
        throw new Error('Invalid verification token');
      }
    }

    // Handle challenge for URL verification
    if (event.type === 'url_verification') {
      return;
    }

    // Handle message events
    const eventData = event.event as Record<string, unknown> | undefined;
    if (eventData?.message) {
      const message = eventData.message as Record<string, unknown>;
      const sender = eventData.sender as Record<string, unknown> | undefined;

      const larkMessage: LarkMessage = {
        chatId: message.chat_id as string,
        senderId: sender?.sender_id as string | undefined,
        senderName: sender?.sender_id as string | undefined, // Would need API call to get name
        content: this.extractTextContent(message.content as string),
        messageId: message.message_id as string,
        parentId: message.parent_id as string | undefined,
      };

      for (const handler of this.messageHandlers) {
        await handler(larkMessage);
      }
    }
  }

  private extractTextContent(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return parsed.text || content;
    } catch {
      return content;
    }
  }

  /**
   * Get challenge response for URL verification
   */
  getChallengeResponse(event: Record<string, unknown>): { challenge: string } | null {
    if (event.type === 'url_verification' && event.challenge) {
      return { challenge: event.challenge as string };
    }
    return null;
  }

  /**
   * List chats the bot has access to
   */
  async listChats(): Promise<Array<{ chatId: string; name: string }>> {
    if (!this.client) {
      throw new Error('Lark client is not initialized');
    }

    const chats: Array<{ chatId: string; name: string }> = [];
    let pageToken: string | undefined;

    do {
      const response = await this.client.im.chat.list({
        params: {
          page_size: 100,
          page_token: pageToken,
        },
      });

      for (const chat of response.data?.items || []) {
        chats.push({
          chatId: chat.chat_id!,
          name: chat.name!,
        });
      }

      pageToken = response.data?.page_token;
    } while (pageToken);

    return chats;
  }

  /**
   * Check if webhook is configured
   */
  hasWebhook(): boolean {
    return Boolean(this.config.webhookUrl);
  }

  /**
   * Check if app client is configured
   */
  hasAppClient(): boolean {
    return Boolean(this.client);
  }
}
