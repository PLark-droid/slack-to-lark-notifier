export interface WorkspaceConfig {
  id: string;
  name: string;
  botToken: string;
  signingSecret: string;
  appToken: string;
}

export interface ChannelFilter {
  channelIds?: string[];
  channelNames?: string[];
  includeSharedChannels: boolean;
  excludeChannelIds?: string[];
}

export interface AppConfig {
  workspaces: WorkspaceConfig[];
  channelFilter: ChannelFilter;
  larkWebhookUrl: string;
  port: number;
}

export function loadConfig(): AppConfig {
  const workspaces: WorkspaceConfig[] = [];

  // プライマリWorkspace
  if (process.env.SLACK_BOT_TOKEN) {
    workspaces.push({
      id: 'primary',
      name: process.env.SLACK_WORKSPACE_NAME || 'Primary Workspace',
      botToken: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      appToken: process.env.SLACK_APP_TOKEN || '',
    });
  }

  // 追加Workspace（SLACK_WORKSPACE_2_*, SLACK_WORKSPACE_3_*...）
  for (let i = 2; i <= 10; i++) {
    const token = process.env[`SLACK_WORKSPACE_${i}_BOT_TOKEN`];
    if (token) {
      workspaces.push({
        id: `workspace_${i}`,
        name: process.env[`SLACK_WORKSPACE_${i}_NAME`] || `Workspace ${i}`,
        botToken: token,
        signingSecret: process.env[`SLACK_WORKSPACE_${i}_SIGNING_SECRET`] || '',
        appToken: process.env[`SLACK_WORKSPACE_${i}_APP_TOKEN`] || '',
      });
    }
  }

  // チャンネルフィルター設定
  const channelFilter: ChannelFilter = {
    channelIds: process.env.WATCH_CHANNEL_IDS?.split(',').filter(Boolean),
    channelNames: process.env.WATCH_CHANNEL_NAMES?.split(',').filter(Boolean),
    includeSharedChannels: process.env.INCLUDE_SHARED_CHANNELS !== 'false',
    excludeChannelIds: process.env.EXCLUDE_CHANNEL_IDS?.split(',').filter(Boolean),
  };

  return {
    workspaces,
    channelFilter,
    larkWebhookUrl: process.env.LARK_WEBHOOK_URL || '',
    port: parseInt(process.env.PORT || '3000', 10),
  };
}

export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (config.workspaces.length === 0) {
    errors.push('少なくとも1つのSlack Workspaceの設定が必要です');
  }

  for (const ws of config.workspaces) {
    if (!ws.botToken) {
      errors.push(`Workspace "${ws.name}": SLACK_BOT_TOKEN が未設定です`);
    }
    if (!ws.signingSecret) {
      errors.push(`Workspace "${ws.name}": SLACK_SIGNING_SECRET が未設定です`);
    }
    if (!ws.appToken) {
      errors.push(`Workspace "${ws.name}": SLACK_APP_TOKEN が未設定です`);
    }
  }

  if (!config.larkWebhookUrl) {
    errors.push('LARK_WEBHOOK_URL が未設定です');
  }

  return errors;
}
