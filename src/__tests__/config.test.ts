import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig, validateConfig } from '../config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load primary workspace config', () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.SLACK_APP_TOKEN = 'xapp-test-token';
    process.env.SLACK_WORKSPACE_NAME = 'Test Workspace';
    process.env.LARK_WEBHOOK_URL = 'https://lark.example.com/webhook';

    const config = loadConfig();

    expect(config.workspaces).toHaveLength(1);
    expect(config.workspaces[0].botToken).toBe('xoxb-test-token');
    expect(config.workspaces[0].name).toBe('Test Workspace');
  });

  it('should load multiple workspaces', () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-primary';
    process.env.SLACK_SIGNING_SECRET = 'secret-1';
    process.env.SLACK_APP_TOKEN = 'xapp-1';
    process.env.SLACK_WORKSPACE_2_BOT_TOKEN = 'xoxb-secondary';
    process.env.SLACK_WORKSPACE_2_SIGNING_SECRET = 'secret-2';
    process.env.SLACK_WORKSPACE_2_APP_TOKEN = 'xapp-2';
    process.env.SLACK_WORKSPACE_2_NAME = 'Secondary';
    process.env.LARK_WEBHOOK_URL = 'https://lark.example.com/webhook';

    const config = loadConfig();

    expect(config.workspaces).toHaveLength(2);
    expect(config.workspaces[1].name).toBe('Secondary');
  });

  it('should load channel filter settings', () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    process.env.SLACK_SIGNING_SECRET = 'secret';
    process.env.SLACK_APP_TOKEN = 'xapp';
    process.env.WATCH_CHANNEL_IDS = 'C123,C456';
    process.env.EXCLUDE_CHANNEL_IDS = 'C789';
    process.env.INCLUDE_SHARED_CHANNELS = 'true';
    process.env.LARK_WEBHOOK_URL = 'https://lark.example.com/webhook';

    const config = loadConfig();

    expect(config.channelFilter.channelIds).toEqual(['C123', 'C456']);
    expect(config.channelFilter.excludeChannelIds).toEqual(['C789']);
    expect(config.channelFilter.includeSharedChannels).toBe(true);
  });

  it('should default includeSharedChannels to true', () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    process.env.SLACK_SIGNING_SECRET = 'secret';
    process.env.SLACK_APP_TOKEN = 'xapp';
    process.env.LARK_WEBHOOK_URL = 'https://lark.example.com/webhook';

    const config = loadConfig();

    expect(config.channelFilter.includeSharedChannels).toBe(true);
  });
});

const defaultLarkApp = {
  appId: '',
  appSecret: '',
  verificationToken: '',
  enabled: false,
};

describe('validateConfig', () => {
  it('should return error when no workspaces configured', () => {
    const config = {
      workspaces: [],
      channelFilter: { includeSharedChannels: true },
      larkWebhookUrl: 'https://lark.example.com/webhook',
      larkApp: defaultLarkApp,
      port: 3000,
      larkReceiverPort: 3001,
    };

    const errors = validateConfig(config);

    expect(errors).toContain('少なくとも1つのSlack Workspaceの設定が必要です');
  });

  it('should return error when lark webhook url is missing', () => {
    const config = {
      workspaces: [{
        id: 'test',
        name: 'Test',
        botToken: 'xoxb-test',
        signingSecret: 'secret',
        appToken: 'xapp',
      }],
      channelFilter: { includeSharedChannels: true },
      larkWebhookUrl: '',
      larkApp: defaultLarkApp,
      port: 3000,
      larkReceiverPort: 3001,
    };

    const errors = validateConfig(config);

    expect(errors).toContain('LARK_WEBHOOK_URL が未設定です');
  });

  it('should return no errors for valid config', () => {
    const config = {
      workspaces: [{
        id: 'test',
        name: 'Test',
        botToken: 'xoxb-test',
        signingSecret: 'secret',
        appToken: 'xapp',
      }],
      channelFilter: { includeSharedChannels: true },
      larkWebhookUrl: 'https://lark.example.com/webhook',
      larkApp: defaultLarkApp,
      port: 3000,
      larkReceiverPort: 3001,
    };

    const errors = validateConfig(config);

    expect(errors).toHaveLength(0);
  });

  it('should return error when lark receiver enabled but no verification token', () => {
    const config = {
      workspaces: [{
        id: 'test',
        name: 'Test',
        botToken: 'xoxb-test',
        signingSecret: 'secret',
        appToken: 'xapp',
      }],
      channelFilter: { includeSharedChannels: true },
      larkWebhookUrl: 'https://lark.example.com/webhook',
      larkApp: {
        appId: '',
        appSecret: '',
        verificationToken: '',
        enabled: true,
      },
      port: 3000,
      larkReceiverPort: 3001,
    };

    const errors = validateConfig(config);

    expect(errors).toContain('LARK_APP_ID が未設定です（Lark Receiver有効時は必須）');
    expect(errors).toContain('LARK_VERIFICATION_TOKEN が未設定です（Lark Receiver有効時は必須）');
  });
});
