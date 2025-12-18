import express, { type Express, type Request, type Response } from 'express';
import { SlackSender } from './slack-sender.js';

export interface LarkEventPayload {
  schema?: string;
  header?: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event?: {
    sender?: {
      sender_id?: {
        open_id?: string;
        user_id?: string;
      };
      sender_type?: string;
    };
    message?: {
      message_id?: string;
      root_id?: string;
      parent_id?: string;
      create_time?: string;
      chat_id?: string;
      chat_type?: string;
      message_type?: string;
      content?: string;
    };
  };
  challenge?: string;
  type?: string;
}

export interface LarkReceiverConfig {
  appId: string;
  appSecret: string;
  verificationToken: string;
  encryptKey?: string;
  defaultSlackChannel?: string;
  channelMapping?: Record<string, string>;
}

export interface ParsedCommand {
  channel: string;
  message: string;
}

export class LarkReceiver {
  private app: Express;
  private config: LarkReceiverConfig;
  private slackSender: SlackSender;

  constructor(config: LarkReceiverConfig, slackSender: SlackSender) {
    this.config = config;
    this.slackSender = slackSender;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Lark Event Callback endpoint
    this.app.post('/lark/events', async (req: Request, res: Response) => {
      try {
        const payload = req.body as LarkEventPayload;

        // URL Verification (challenge)
        if (payload.challenge) {
          console.log('Lark URL verification received');
          res.json({ challenge: payload.challenge });
          return;
        }

        // Verify token
        if (payload.header?.token !== this.config.verificationToken) {
          console.error('Invalid verification token');
          res.status(401).json({ error: 'Invalid token' });
          return;
        }

        // Handle message event
        if (payload.header?.event_type === 'im.message.receive_v1') {
          await this.handleMessageEvent(payload);
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Error handling Lark event:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', service: 'lark-receiver' });
    });
  }

  private async handleMessageEvent(payload: LarkEventPayload): Promise<void> {
    const message = payload.event?.message;
    if (!message || message.message_type !== 'text') {
      return;
    }

    const content = message.content;
    if (!content) return;

    let textContent: string;
    try {
      const parsed = JSON.parse(content);
      textContent = parsed.text || '';
    } catch {
      textContent = content;
    }

    // Check for /slack command
    const command = this.parseSlackCommand(textContent);
    if (command) {
      await this.forwardToSlack(command, payload);
      return;
    }

    // Check channel mapping
    const chatId = message.chat_id;
    if (chatId && this.config.channelMapping?.[chatId]) {
      const slackChannel = this.config.channelMapping[chatId];
      await this.slackSender.sendMessage({
        channel: slackChannel,
        text: textContent,
        username: 'Lark User',
      });
      console.log(`Message forwarded to Slack channel: ${slackChannel}`);
      return;
    }

    // Default channel
    if (this.config.defaultSlackChannel) {
      await this.slackSender.sendMessage({
        channel: this.config.defaultSlackChannel,
        text: textContent,
        username: 'Lark User',
      });
      console.log(`Message forwarded to default Slack channel`);
    }
  }

  parseSlackCommand(text: string): ParsedCommand | null {
    // Pattern: /slack #channel message
    // or: /slack channel message
    const match = text.match(/^\/slack\s+#?(\S+)\s+(.+)$/s);
    if (match) {
      return {
        channel: match[1],
        message: match[2].trim(),
      };
    }
    return null;
  }

  private async forwardToSlack(
    command: ParsedCommand,
    payload: LarkEventPayload
  ): Promise<void> {
    try {
      // Find channel ID by name
      let channelId = await this.slackSender.findChannelByName(command.channel);

      if (!channelId) {
        // Try using the channel name directly (might be an ID)
        channelId = command.channel;
      }

      const senderInfo = payload.event?.sender;
      const username = senderInfo?.sender_id?.user_id || 'Lark User';

      await this.slackSender.sendMessage({
        channel: channelId,
        text: command.message,
        username: `Lark: ${username}`,
      });

      console.log(`Command message sent to Slack #${command.channel}`);
    } catch (error) {
      console.error('Failed to forward message to Slack:', error);
      throw error;
    }
  }

  getExpressApp(): Express {
    return this.app;
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🔗 Lark receiver listening on port ${port}`);
        resolve();
      });
    });
  }
}
