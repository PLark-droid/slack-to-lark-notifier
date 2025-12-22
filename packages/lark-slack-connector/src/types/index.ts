import { z } from 'zod';

// Slack Workspace Configuration
export const SlackWorkspaceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  botToken: z.string().min(1, 'Slack bot token is required'),
  signingSecret: z.string().min(1, 'Slack signing secret is required'),
  appToken: z.string().optional(), // For Socket Mode
  userToken: z.string().optional(), // For Slack Connect and sending as user
});

// Sender configuration for messages
export const SenderConfigSchema = z.object({
  // Use user token instead of bot token for sending
  sendAsUser: z.boolean().default(false),
  // Slack user token for sending as specific user
  slackUserToken: z.string().optional(),
  // Lark user access token (if available)
  larkUserAccessToken: z.string().optional(),
});

export type SlackWorkspace = z.infer<typeof SlackWorkspaceSchema>;
export type SenderConfig = z.infer<typeof SenderConfigSchema>;

// Lark Configuration
export const LarkConfigSchema = z.object({
  webhookUrl: z.string().url().optional(),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  verificationToken: z.string().optional(),
  encryptKey: z.string().optional(),
});

export type LarkConfig = z.infer<typeof LarkConfigSchema>;

// Channel Mapping
export const ChannelMappingSchema = z.object({
  slackChannel: z.string(),
  larkChat: z.string(),
  direction: z.enum(['slack-to-lark', 'lark-to-slack', 'bidirectional']).default('bidirectional'),
});

export type ChannelMapping = z.infer<typeof ChannelMappingSchema>;

// Mute Time Range (for time-based muting)
export const MuteTimeRangeSchema = z.object({
  enabled: z.boolean().default(false),
  startHour: z.number().min(0).max(23).default(22),
  startMinute: z.number().min(0).max(59).default(0),
  endHour: z.number().min(0).max(23).default(8),
  endMinute: z.number().min(0).max(59).default(0),
});

export type MuteTimeRange = z.infer<typeof MuteTimeRangeSchema>;

// Notification Settings
export const NotificationSettingsSchema = z.object({
  soundEnabled: z.boolean().default(true),
  desktopEnabled: z.boolean().default(true),
});

export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

// Message Filter
export const MessageFilterSchema = z.object({
  includeChannels: z.array(z.string()).optional(),
  excludeChannels: z.array(z.string()).optional(),
  includeUsers: z.array(z.string()).optional(),
  excludeUsers: z.array(z.string()).optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  // Additional filters
  excludeKeywords: z.array(z.string()).optional(),
  excludeUserIds: z.array(z.string()).optional(),
  muteTimeRange: MuteTimeRangeSchema.optional(),
});

export type MessageFilter = z.infer<typeof MessageFilterSchema>;

// Bridge Configuration
export const BridgeConfigSchema = z.object({
  // Slack settings
  slack: z.object({
    workspaces: z.array(SlackWorkspaceSchema).min(1),
    socketMode: z.boolean().default(true),
  }),

  // Lark settings
  lark: LarkConfigSchema,

  // Sender settings (for sending as specific user)
  sender: SenderConfigSchema.optional(),

  // Channel mappings
  channelMappings: z.array(ChannelMappingSchema).optional(),

  // Message filters
  filters: MessageFilterSchema.optional(),

  // Notification settings
  notificationSettings: NotificationSettingsSchema.optional(),

  // Bridge options
  options: z.object({
    // Format options
    includeChannelName: z.boolean().default(true),
    includeUserName: z.boolean().default(true),
    includeTimestamp: z.boolean().default(true),
    timezone: z.string().default('Asia/Tokyo'),

    // Thread handling
    includeThreadReplies: z.boolean().default(true),

    // Polling for Slack Connect
    slackConnectPolling: z.boolean().default(false),
    pollingIntervalMs: z.number().default(5000),

    // Default Slack channel for Lark→Slack messages (when no mapping found)
    defaultSlackChannel: z.string().optional(),

    // Retry settings
    maxRetries: z.number().default(3),
    retryDelayMs: z.number().default(1000),

    // Logging
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }).optional(),
});

export type BridgeConfig = z.infer<typeof BridgeConfigSchema>;

// Message Types
export interface SlackMessage {
  channel: string;
  channelName?: string;
  user: string;
  userName?: string;
  text: string;
  ts: string;
  threadTs?: string;
  files?: Array<{
    name: string;
    url: string;
    mimetype: string;
  }>;
}

export interface LarkMessage {
  chatId: string;
  senderId?: string;
  senderName?: string;
  content: string;
  messageId: string;
  parentId?: string;
}

// Event Types
export type BridgeEventType =
  | 'slack:message'
  | 'lark:message'
  | 'bridge:forward'
  | 'bridge:error'
  | 'bridge:connected'
  | 'bridge:disconnected';

export interface BridgeEvent<T = unknown> {
  type: BridgeEventType;
  timestamp: Date;
  data: T;
}

// Bridge Status
export interface BridgeStatus {
  isRunning: boolean;
  slackConnected: boolean;
  larkConnected: boolean;
  workspaces: Array<{
    id: string;
    name: string;
    connected: boolean;
  }>;
  messageStats: {
    slackToLark: number;
    larkToSlack: number;
    errors: number;
  };
  startedAt?: Date;
  uptime?: number;
}
