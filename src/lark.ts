export interface LarkMessage {
  msg_type: 'text' | 'post' | 'interactive';
  content: {
    text?: string;
    post?: LarkPost;
  };
}

export interface LarkPost {
  ja_jp: {
    title: string;
    content: Array<Array<LarkPostContent>>;
  };
}

export interface LarkPostContent {
  tag: 'text' | 'a' | 'at';
  text?: string;
  href?: string;
  user_id?: string;
}

export interface FormattedMessage {
  channel: string;
  user: string;
  text: string;
  timestamp: string;
}

export async function sendToLark(message: FormattedMessage): Promise<void> {
  const webhookUrl = process.env.LARK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('LARK_WEBHOOK_URL is not configured');
  }

  const larkMessage: LarkMessage = {
    msg_type: 'post',
    content: {
      post: {
        ja_jp: {
          title: `📨 Slack通知 - #${message.channel}`,
          content: [
            [
              { tag: 'text', text: `👤 送信者: ${message.user}` },
            ],
            [
              { tag: 'text', text: `💬 メッセージ: ${message.text}` },
            ],
            [
              { tag: 'text', text: `🕐 時刻: ${message.timestamp}` },
            ],
          ],
        },
      },
    },
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(larkMessage),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lark API error: ${response.status} - ${errorText}`);
  }
}
