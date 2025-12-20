// Main exports
export { LarkSlackBridge } from './bridge';
export type { BridgeOptions } from './bridge';

// Client exports
export { SlackClient } from './slack';
export type { SlackClientOptions } from './slack';
export { LarkClient } from './lark';
export type { LarkClientOptions } from './lark';

// Server exports
export { BridgeServer, startBridgeServer } from './server';
export type { ServerOptions, BridgeServerEvents } from './server';

// Config exports
export { parseConfig, configFromEnv, validateConfig } from './config';

// Type exports
export type {
  BridgeConfig,
  BridgeStatus,
  BridgeEvent,
  BridgeEventType,
  SlackWorkspace,
  LarkConfig,
  SlackMessage,
  LarkMessage,
  ChannelMapping,
  MessageFilter,
} from './types';

// Schema exports for advanced usage
export {
  BridgeConfigSchema,
  SlackWorkspaceSchema,
  LarkConfigSchema,
  ChannelMappingSchema,
  MessageFilterSchema,
} from './types';
