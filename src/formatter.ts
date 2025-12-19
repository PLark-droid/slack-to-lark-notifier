import type { FormattedMessage } from './lark.js';

interface SlackMessage {
  channel?: string;
  user?: string;
  text?: string;
  ts?: string;
  messageLink?: string;
  [key: string]: unknown;
}

export function formatSlackMessage(message: SlackMessage): FormattedMessage {
  const timestamp = message.ts
    ? new Date(parseFloat(message.ts) * 1000).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
      })
    : new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  return {
    channel: message.channel || 'unknown',
    user: message.user || 'unknown',
    text: message.text || '',
    timestamp,
    messageLink: message.messageLink,
  };
}
