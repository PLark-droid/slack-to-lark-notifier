import { describe, it, expect } from 'vitest';
import {
  BridgeConfigSchema,
  SlackWorkspaceSchema,
  LarkConfigSchema,
  ChannelMappingSchema,
  MessageFilterSchema,
} from '../types';

describe('SlackWorkspaceSchema', () => {
  it('should validate valid workspace', () => {
    const result = SlackWorkspaceSchema.safeParse({
      botToken: 'xoxb-test-token',
      signingSecret: 'test-secret',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty bot token', () => {
    const result = SlackWorkspaceSchema.safeParse({
      botToken: '',
      signingSecret: 'test-secret',
    });

    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const result = SlackWorkspaceSchema.safeParse({
      id: 'T123456',
      name: 'Test Workspace',
      botToken: 'xoxb-test-token',
      signingSecret: 'test-secret',
      appToken: 'xapp-test-token',
      userToken: 'xoxp-user-token',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('T123456');
      expect(result.data.appToken).toBe('xapp-test-token');
    }
  });
});

describe('LarkConfigSchema', () => {
  it('should validate webhook URL', () => {
    const result = LarkConfigSchema.safeParse({
      webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const result = LarkConfigSchema.safeParse({
      webhookUrl: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });

  it('should accept app credentials', () => {
    const result = LarkConfigSchema.safeParse({
      appId: 'cli_xxx',
      appSecret: 'secret_xxx',
      verificationToken: 'token_xxx',
    });

    expect(result.success).toBe(true);
  });
});

describe('ChannelMappingSchema', () => {
  it('should validate channel mapping', () => {
    const result = ChannelMappingSchema.safeParse({
      slackChannel: 'C123456',
      larkChat: 'oc_xxx',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.direction).toBe('bidirectional'); // default
    }
  });

  it('should accept direction options', () => {
    const slackToLark = ChannelMappingSchema.safeParse({
      slackChannel: 'C123456',
      larkChat: 'oc_xxx',
      direction: 'slack-to-lark',
    });

    expect(slackToLark.success).toBe(true);

    const larkToSlack = ChannelMappingSchema.safeParse({
      slackChannel: 'C123456',
      larkChat: 'oc_xxx',
      direction: 'lark-to-slack',
    });

    expect(larkToSlack.success).toBe(true);
  });

  it('should reject invalid direction', () => {
    const result = ChannelMappingSchema.safeParse({
      slackChannel: 'C123456',
      larkChat: 'oc_xxx',
      direction: 'invalid',
    });

    expect(result.success).toBe(false);
  });
});

describe('MessageFilterSchema', () => {
  it('should validate empty filter', () => {
    const result = MessageFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate channel filters', () => {
    const result = MessageFilterSchema.safeParse({
      includeChannels: ['general', 'announcements'],
      excludeChannels: ['random'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeChannels).toHaveLength(2);
      expect(result.data.excludeChannels).toHaveLength(1);
    }
  });

  it('should validate user filters', () => {
    const result = MessageFilterSchema.safeParse({
      includeUsers: ['U123', 'U456'],
      excludeUsers: ['U789'],
    });

    expect(result.success).toBe(true);
  });

  it('should validate pattern filters', () => {
    const result = MessageFilterSchema.safeParse({
      includePatterns: ['urgent:', 'important:'],
      excludePatterns: ['ignore:', 'skip:'],
    });

    expect(result.success).toBe(true);
  });
});

describe('BridgeConfigSchema', () => {
  it('should validate full configuration', () => {
    const result = BridgeConfigSchema.safeParse({
      slack: {
        workspaces: [
          {
            botToken: 'xoxb-test',
            signingSecret: 'secret',
            appToken: 'xapp-test',
          },
        ],
        socketMode: true,
      },
      lark: {
        webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx',
      },
      channelMappings: [
        {
          slackChannel: 'C123',
          larkChat: 'oc_xxx',
        },
      ],
      filters: {
        includeChannels: ['general'],
      },
      options: {
        includeChannelName: true,
        includeUserName: true,
        timezone: 'Asia/Tokyo',
        logLevel: 'info',
      },
    });

    expect(result.success).toBe(true);
  });

  it('should apply default options', () => {
    const result = BridgeConfigSchema.safeParse({
      slack: {
        workspaces: [
          {
            botToken: 'xoxb-test',
            signingSecret: 'secret',
          },
        ],
      },
      lark: {
        webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slack.socketMode).toBe(true);
    }
  });
});
