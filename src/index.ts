import 'dotenv/config';
import { App } from '@slack/bolt';
import { sendToLark } from './lark.js';
import { formatSlackMessage } from './formatter.js';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// メッセージイベントをリッスン
app.message(async ({ message, say }) => {
  if (message.subtype === undefined || message.subtype === 'bot_message') {
    const formattedMessage = formatSlackMessage(message);

    try {
      await sendToLark(formattedMessage);
      console.log('Message forwarded to Lark successfully');
    } catch (error) {
      console.error('Failed to forward message to Lark:', error);
    }
  }
});

// メンションイベントをリッスン
app.event('app_mention', async ({ event }) => {
  const formattedMessage = formatSlackMessage(event);

  try {
    await sendToLark(formattedMessage);
    console.log('Mention forwarded to Lark successfully');
  } catch (error) {
    console.error('Failed to forward mention to Lark:', error);
  }
});

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Slack to Lark Notifier is running on port ${port}`);
})();
