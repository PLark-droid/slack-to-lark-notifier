# lark-slack-connector

Bidirectional message bridge between Slack and Lark (Feishu).

[![npm version](https://badge.fury.io/js/lark-slack-connector.svg)](https://www.npmjs.com/package/lark-slack-connector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Bidirectional Messaging**: Forward messages between Slack and Lark in both directions
- **Multi-Workspace Support**: Connect up to 10 Slack workspaces simultaneously
- **Channel Mapping**: Map specific Slack channels to Lark chats
- **Message Filtering**: Filter messages by channel, user, or content patterns
- **Slack Connect Support**: Monitor shared channels via polling
- **TypeScript**: Full TypeScript support with type definitions
- **CLI & API**: Use as a CLI tool or integrate programmatically

## Installation

```bash
npm install lark-slack-connector
```

## Quick Start

### CLI Usage

```bash
# Set environment variables
export SLACK_BOT_TOKEN=xoxb-your-token
export SLACK_SIGNING_SECRET=your-signing-secret
export SLACK_APP_TOKEN=xapp-your-app-token
export LARK_WEBHOOK_URL=https://open.larksuite.com/open-apis/bot/v2/hook/xxx

# Start the bridge
npx lark-slack-connector start
```

### Programmatic Usage

```typescript
import { LarkSlackBridge, BridgeConfig } from 'lark-slack-connector';

const config: BridgeConfig = {
  slack: {
    workspaces: [
      {
        botToken: process.env.SLACK_BOT_TOKEN!,
        signingSecret: process.env.SLACK_SIGNING_SECRET!,
        appToken: process.env.SLACK_APP_TOKEN,
      },
    ],
    socketMode: true,
  },
  lark: {
    webhookUrl: process.env.LARK_WEBHOOK_URL,
  },
};

const bridge = new LarkSlackBridge({ config });

// Listen for events
bridge.on('bridge:forward', (event) => {
  console.log('Message forwarded:', event.data);
});

// Start the bridge
await bridge.start();
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Slack Bot User OAuth Token |
| `SLACK_SIGNING_SECRET` | Yes | Slack App Signing Secret |
| `SLACK_APP_TOKEN` | Socket Mode | Slack App-Level Token |
| `LARK_WEBHOOK_URL` | One of these | Lark Incoming Webhook URL |
| `LARK_APP_ID` | One of these | Lark App ID |
| `LARK_APP_SECRET` | With App ID | Lark App Secret |
| `INCLUDE_CHANNELS` | No | Comma-separated channels to include |
| `EXCLUDE_CHANNELS` | No | Comma-separated channels to exclude |
| `TIMEZONE` | No | Timezone (default: Asia/Tokyo) |
| `LOG_LEVEL` | No | debug, info, warn, error |

### Configuration Options

```typescript
interface BridgeConfig {
  slack: {
    workspaces: SlackWorkspace[];
    socketMode?: boolean;
  };
  lark: {
    webhookUrl?: string;
    appId?: string;
    appSecret?: string;
  };
  channelMappings?: ChannelMapping[];
  filters?: MessageFilter;
  options?: {
    includeChannelName?: boolean;
    includeUserName?: boolean;
    includeTimestamp?: boolean;
    timezone?: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

### Channel Mappings

Map specific Slack channels to Lark chats:

```typescript
const config = {
  // ...
  channelMappings: [
    {
      slackChannel: 'C123456789',
      larkChat: 'oc_xxxxxxxxx',
      direction: 'bidirectional', // 'slack-to-lark', 'lark-to-slack', or 'bidirectional'
    },
  ],
};
```

### Message Filters

Filter which messages to forward:

```typescript
const config = {
  // ...
  filters: {
    includeChannels: ['general', 'announcements'],
    excludeChannels: ['random'],
    includeUsers: ['U123456'],
    excludePatterns: ['^\\[bot\\]'],
  },
};
```

## Events

The bridge emits events you can listen to:

```typescript
bridge.on('slack:message', (event) => {
  console.log('Received Slack message:', event.data);
});

bridge.on('lark:message', (event) => {
  console.log('Received Lark message:', event.data);
});

bridge.on('bridge:forward', (event) => {
  console.log('Message forwarded:', event.data);
});

bridge.on('bridge:error', (event) => {
  console.error('Error:', event.data);
});

bridge.on('bridge:connected', () => {
  console.log('Bridge connected');
});

bridge.on('bridge:disconnected', () => {
  console.log('Bridge disconnected');
});
```

## Multi-Workspace Setup

Connect multiple Slack workspaces:

```typescript
const config = {
  slack: {
    workspaces: [
      {
        id: 'workspace-1',
        name: 'Primary Workspace',
        botToken: process.env.SLACK_BOT_TOKEN_1!,
        signingSecret: process.env.SLACK_SIGNING_SECRET_1!,
        appToken: process.env.SLACK_APP_TOKEN_1,
      },
      {
        id: 'workspace-2',
        name: 'Secondary Workspace',
        botToken: process.env.SLACK_BOT_TOKEN_2!,
        signingSecret: process.env.SLACK_SIGNING_SECRET_2!,
        appToken: process.env.SLACK_APP_TOKEN_2,
      },
    ],
    socketMode: true,
  },
  // ...
};
```

## Lark Setup Options

### Option 1: Webhook (Simple)

For one-way Slack → Lark forwarding:

1. Create an Incoming Webhook in Lark
2. Set `LARK_WEBHOOK_URL`

### Option 2: Lark App (Bidirectional)

For bidirectional messaging:

1. Create a Lark App
2. Set `LARK_APP_ID` and `LARK_APP_SECRET`
3. Configure event subscription URL

```typescript
// Handle Lark webhook events
app.post('/lark/webhook', async (req, res) => {
  const result = await bridge.handleLarkWebhook(req.body);
  if (result?.challenge) {
    return res.json(result);
  }
  res.sendStatus(200);
});
```

## API Reference

### LarkSlackBridge

```typescript
class LarkSlackBridge {
  constructor(options: BridgeOptions);

  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): BridgeStatus;
  handleLarkWebhook(event: object): Promise<{ challenge?: string } | void>;
  getSlackClient(workspaceId?: string): SlackClient | undefined;
  getLarkClient(): LarkClient;
}
```

### SlackClient

```typescript
class SlackClient {
  onMessage(handler: (message: SlackMessage) => void): void;
  sendMessage(channel: string, text: string, threadTs?: string): Promise<void>;
  getChannelInfo(channelId: string): Promise<{ id: string; name: string } | null>;
  listChannels(): Promise<Array<{ id: string; name: string; isShared: boolean }>>;
}
```

### LarkClient

```typescript
class LarkClient {
  onMessage(handler: (message: LarkMessage) => void): void;
  sendWebhook(text: string, title?: string): Promise<boolean>;
  sendMessage(chatId: string, text: string): Promise<string | undefined>;
  listChats(): Promise<Array<{ chatId: string; name: string }>>;
}
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## Support

- [GitHub Issues](https://github.com/PLark-droid/slack-to-lark-notifier/issues)
- [Documentation](https://github.com/PLark-droid/slack-to-lark-notifier/tree/main/packages/lark-slack-connector)
