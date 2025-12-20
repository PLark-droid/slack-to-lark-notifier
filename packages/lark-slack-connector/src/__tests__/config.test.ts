import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseConfig, configFromEnv, validateConfig } from '../config';
import { BridgeConfig } from '../types';

describe('parseConfig', () => {
  it('should parse valid configuration', () => {
    const config = parseConfig({
      slack: {
        workspaces: [
          {
            botToken: 'xoxb-test-token',
            signingSecret: 'test-secret',
          },
        ],
        socketMode: true,
      },
      lark: {
        webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx',
      },
    });

    expect(config.slack.workspaces).toHaveLength(1);
    expect(config.slack.socketMode).toBe(true);
    expect(config.lark.webhookUrl).toBeDefined();
  });

  it('should apply default values', () => {
    const config = parseConfig({
      slack: {
        workspaces: [
          {
            botToken: 'xoxb-test-token',
            signingSecret: 'test-secret',
          },
        ],
      },
      lark: {
        webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx',
      },
    });

    expect(config.slack.socketMode).toBe(true);
  });

  it('should throw on invalid configuration', () => {
    expect(() =>
      parseConfig({
        slack: {
          workspaces: [],
        },
        lark: {},
      })
    ).toThrow();
  });

  it('should parse channel mappings', () => {
    const config = parseConfig({
      slack: {
        workspaces: [
          {
            botToken: 'xoxb-test-token',
            signingSecret: 'test-secret',
          },
        ],
      },
      lark: {
        webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx',
      },
      channelMappings: [
        {
          slackChannel: 'C123456',
          larkChat: 'oc_xxx',
          direction: 'bidirectional',
        },
      ],
    });

    expect(config.channelMappings).toHaveLength(1);
    expect(config.channelMappings![0].direction).toBe('bidirectional');
  });
});

describe('configFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load configuration from environment variables', () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.SLACK_APP_TOKEN = 'xapp-test-token';
    process.env.LARK_WEBHOOK_URL = 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx';

    const config = configFromEnv();

    expect(config.slack.workspaces).toHaveLength(1);
    expect(config.slack.workspaces[0].botToken).toBe('xoxb-test-token');
    expect(config.lark.webhookUrl).toBe('https://open.larksuite.com/open-apis/bot/v2/hook/xxx');
  });

  it('should load multiple workspaces', () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-token-1';
    process.env.SLACK_SIGNING_SECRET = 'secret-1';
    process.env.SLACK_WORKSPACE_2_BOT_TOKEN = 'xoxb-token-2';
    process.env.SLACK_WORKSPACE_2_SIGNING_SECRET = 'secret-2';
    process.env.LARK_WEBHOOK_URL = 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx';

    const config = configFromEnv();

    expect(config.slack.workspaces).toHaveLength(2);
  });

  it('should parse include channels from environment', () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.LARK_WEBHOOK_URL = 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx';
    process.env.INCLUDE_CHANNELS = 'general, random, announcements';

    const config = configFromEnv();

    expect(config.filters?.includeChannels).toEqual(['general', 'random', 'announcements']);
  });
});

describe('validateConfig', () => {
  it('should return valid for correct configuration', () => {
    const config: BridgeConfig = {
      slack: {
        workspaces: [
          {
            botToken: 'xoxb-test-token',
            signingSecret: 'test-secret',
            appToken: 'xapp-test-token',
          },
        ],
        socketMode: true,
      },
      lark: {
        webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx',
      },
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for missing Slack token', () => {
    const config: BridgeConfig = {
      slack: {
        workspaces: [
          {
            botToken: '',
            signingSecret: 'test-secret',
          },
        ],
        socketMode: false,
      },
      lark: {
        webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx',
      },
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Bot token'))).toBe(true);
  });

  it('should return errors for missing Lark configuration', () => {
    const config: BridgeConfig = {
      slack: {
        workspaces: [
          {
            botToken: 'xoxb-test-token',
            signingSecret: 'test-secret',
          },
        ],
        socketMode: false,
      },
      lark: {},
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Lark'))).toBe(true);
  });

  it('should require app token for socket mode', () => {
    const config: BridgeConfig = {
      slack: {
        workspaces: [
          {
            botToken: 'xoxb-test-token',
            signingSecret: 'test-secret',
            // No appToken
          },
        ],
        socketMode: true,
      },
      lark: {
        webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx',
      },
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('App token'))).toBe(true);
  });
});
