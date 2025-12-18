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
  isSharedChannel?: boolean;
  workspaceName?: string;
  connectedTeams?: string[];
  isMention?: boolean;
}

export async function sendToLark(message: FormattedMessage): Promise<void> {
  const webhookUrl = process.env.LARK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('LARK_WEBHOOK_URL is not configured');
  }

  // タイトルを構築
  const titleParts: string[] = [];
  if (message.isMention) {
    titleParts.push('📣');
  } else {
    titleParts.push('📨');
  }
  titleParts.push('Slack通知');
  if (message.isSharedChannel) {
    titleParts.push('(共有チャンネル)');
  }
  titleParts.push(`- #${message.channel}`);

  // コンテンツを構築
  const contentRows: Array<Array<LarkPostContent>> = [];

  // Workspace情報（複数Workspace対応時）
  if (message.workspaceName) {
    contentRows.push([
      { tag: 'text', text: `🏢 Workspace: ${message.workspaceName}` },
    ]);
  }

  contentRows.push([
    { tag: 'text', text: `👤 送信者: ${message.user}` },
  ]);

  contentRows.push([
    { tag: 'text', text: `💬 メッセージ: ${message.text}` },
  ]);

  contentRows.push([
    { tag: 'text', text: `🕐 時刻: ${message.timestamp}` },
  ]);

  // 共有チャンネルの接続先チーム情報
  if (message.connectedTeams && message.connectedTeams.length > 0) {
    contentRows.push([
      { tag: 'text', text: `🔗 接続チーム: ${message.connectedTeams.join(', ')}` },
    ]);
  }

  const larkMessage: LarkMessage = {
    msg_type: 'post',
    content: {
      post: {
        ja_jp: {
          title: titleParts.join(' '),
          content: contentRows,
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
