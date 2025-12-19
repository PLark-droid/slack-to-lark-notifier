import { WebClient } from '@slack/web-api';
import { sendToLark } from './lark.js';
import { formatSlackMessage } from './formatter.js';

interface PollerConfig {
  userToken: string;
  larkWebhookUrl: string;
  channelIds: string[];
  pollingInterval: number; // ミリ秒
}

interface MessageCache {
  [channelId: string]: string; // 最後に処理したメッセージのts
}

export class SlackConnectPoller {
  private client: WebClient;
  private config: PollerConfig;
  private messageCache: MessageCache = {};
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: PollerConfig) {
    this.config = config;
    this.client = new WebClient(config.userToken);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Poller is already running');
      return;
    }

    console.log('🔄 Starting Slack Connect Poller...');
    console.log(`   監視チャンネル: ${this.config.channelIds.length}個`);
    console.log(`   ポーリング間隔: ${this.config.pollingInterval / 1000}秒`);

    // 初回は現在の最新メッセージのtsを取得（既存メッセージは通知しない）
    await this.initializeCache();

    this.isRunning = true;
    this.intervalId = setInterval(() => this.poll(), this.config.pollingInterval);

    console.log('✅ Slack Connect Poller started');
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('📴 Slack Connect Poller stopped');
  }

  private async initializeCache(): Promise<void> {
    for (const channelId of this.config.channelIds) {
      try {
        const result = await this.client.conversations.history({
          channel: channelId,
          limit: 1,
        });

        if (result.messages && result.messages.length > 0) {
          this.messageCache[channelId] = result.messages[0].ts || '0';
          console.log(`   チャンネル ${channelId}: キャッシュ初期化完了`);
        } else {
          this.messageCache[channelId] = '0';
        }
      } catch (error) {
        console.error(`❌ チャンネル ${channelId} の初期化エラー:`, error);
        this.messageCache[channelId] = '0';
      }
    }
  }

  private async poll(): Promise<void> {
    for (const channelId of this.config.channelIds) {
      try {
        await this.pollChannel(channelId);
      } catch (error) {
        console.error(`❌ チャンネル ${channelId} のポーリングエラー:`, error);
      }
    }
  }

  private async pollChannel(channelId: string): Promise<void> {
    const lastTs = this.messageCache[channelId] || '0';

    const result = await this.client.conversations.history({
      channel: channelId,
      oldest: lastTs,
      limit: 100,
    });

    if (!result.messages || result.messages.length === 0) {
      return;
    }

    // 古い順に処理（APIは新しい順で返すので逆順にする）
    const messages = result.messages.reverse();

    // チャンネル情報を取得
    let channelName = channelId;
    try {
      const channelInfo = await this.client.conversations.info({ channel: channelId });
      channelName = (channelInfo.channel as { name?: string })?.name || channelId;
    } catch {
      // チャンネル名取得失敗時はIDを使用
    }

    for (const message of messages) {
      // 最後に処理したメッセージと同じtsはスキップ
      if (message.ts === lastTs) {
        continue;
      }

      // Bot自身のメッセージはスキップ
      if (message.bot_id) {
        continue;
      }

      // スレッド返信も取得
      if (message.thread_ts && message.thread_ts !== message.ts) {
        // これはスレッド返信
        await this.processMessage(message, channelId, channelName, true);
      } else {
        // 通常メッセージ
        await this.processMessage(message, channelId, channelName, false);
      }

      // キャッシュを更新
      if (message.ts) {
        this.messageCache[channelId] = message.ts;
      }
    }

    // スレッド返信もチェック
    await this.pollThreadReplies(channelId, channelName);
  }

  private async pollThreadReplies(channelId: string, channelName: string): Promise<void> {
    // 最近のメッセージからスレッドを取得
    const result = await this.client.conversations.history({
      channel: channelId,
      limit: 20,
    });

    if (!result.messages) return;

    for (const message of result.messages) {
      if (message.thread_ts && message.reply_count && message.reply_count > 0) {
        await this.pollThread(channelId, channelName, message.thread_ts);
      }
    }
  }

  private threadCache: { [key: string]: string } = {};

  private async pollThread(channelId: string, channelName: string, threadTs: string): Promise<void> {
    const cacheKey = `${channelId}:${threadTs}`;
    const lastReplyTs = this.threadCache[cacheKey] || threadTs;

    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs,
        oldest: lastReplyTs,
        limit: 100,
      });

      if (!result.messages || result.messages.length <= 1) {
        return;
      }

      // 最初のメッセージ（親）をスキップして返信のみ処理
      const replies = result.messages.slice(1).reverse();

      for (const reply of replies) {
        if (reply.ts === lastReplyTs) continue;
        if (reply.bot_id) continue;

        await this.processMessage(reply, channelId, channelName, true);

        if (reply.ts) {
          this.threadCache[cacheKey] = reply.ts;
        }
      }
    } catch {
      // スレッド取得エラーは無視（アクセス権限がない場合など）
    }
  }

  private async processMessage(
    message: { text?: string; user?: string; ts?: string },
    channelId: string,
    channelName: string,
    isThreadReply: boolean
  ): Promise<void> {
    // ユーザー情報を取得
    let userName = message.user || 'Unknown User';
    if (message.user) {
      try {
        const userInfo = await this.client.users.info({ user: message.user });
        const user = userInfo.user as { real_name?: string; name?: string; profile?: { display_name?: string } };
        userName = user?.real_name || user?.profile?.display_name || user?.name || message.user;
      } catch {
        // ユーザー情報取得失敗時はユーザーIDをそのまま使用
        userName = message.user;
      }
    }

    // Slackメッセージへの直接リンクを生成
    const messageLink = message.ts
      ? `https://slack.com/archives/${channelId}/p${message.ts.replace('.', '')}`
      : undefined;

    const prefix = isThreadReply ? '🧵 [スレッド返信] ' : '';
    const formattedMessage = formatSlackMessage({
      channel: channelName,
      user: userName,
      text: prefix + (message.text || ''),
      ts: message.ts,
      messageLink,
    });

    console.log(`📨 新着メッセージ検出: #${channelName} from ${userName}`);

    await sendToLark(formattedMessage, this.config.larkWebhookUrl);
  }

  // 監視チャンネルを動的に追加
  async addChannel(channelId: string): Promise<void> {
    if (!this.config.channelIds.includes(channelId)) {
      this.config.channelIds.push(channelId);
      this.messageCache[channelId] = '0';
      await this.initializeSingleChannel(channelId);
      console.log(`➕ チャンネル追加: ${channelId}`);
    }
  }

  private async initializeSingleChannel(channelId: string): Promise<void> {
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        limit: 1,
      });

      if (result.messages && result.messages.length > 0) {
        this.messageCache[channelId] = result.messages[0].ts || '0';
      }
    } catch (error) {
      console.error(`❌ チャンネル ${channelId} の初期化エラー:`, error);
    }
  }
}
