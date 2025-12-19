/**
 * Configuration Management Utility
 *
 * 環境変数とlocalStorageを組み合わせたマルチテナント設定管理
 */

import type {
  UserConfig,
  ConfigValidationResult,
} from './types/config';

/**
 * LocalStorage Key Prefix
 */
const STORAGE_KEY_PREFIX = 'slack-to-lark-config';

/**
 * 設定のバリデーション
 *
 * @param config - 検証する設定
 * @returns 検証結果
 */
export function validateConfig(config: UserConfig): ConfigValidationResult {
  const errors: string[] = [];

  // IDは必須
  if (!config.id || config.id.trim() === '') {
    errors.push('User ID is required');
  }

  // Slack Channelsは配列である必要がある
  if (!Array.isArray(config.slackChannels)) {
    errors.push('Slack Channels must be an array');
  }

  // User Mappingsはオブジェクトである必要がある
  if (typeof config.userMappings !== 'object' || config.userMappings === null) {
    errors.push('User Mappings must be an object');
  }

  // Slack Bot Tokenの形式チェック（オプショナル）
  if (config.slackBotToken && !config.slackBotToken.startsWith('xoxb-')) {
    errors.push('Slack Bot Token must start with "xoxb-"');
  }

  // Lark Webhook URLの形式チェック（オプショナル）
  if (config.larkWebhookUrl) {
    try {
      new URL(config.larkWebhookUrl);
    } catch {
      errors.push('Lark Webhook URL must be a valid URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * LocalStorageから設定を取得
 *
 * @param userId - ユーザーID
 * @returns ユーザー設定（見つからない場合はnull）
 */
export function getConfigFromStorage(userId: string): UserConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const key = `${STORAGE_KEY_PREFIX}:${userId}`;
    const data = localStorage.getItem(key);

    if (!data) {
      return null;
    }

    const config = JSON.parse(data) as UserConfig;
    return config;
  } catch (error) {
    console.error('Failed to get config from localStorage:', error);
    return null;
  }
}

/**
 * LocalStorageに設定を保存
 *
 * @param config - 保存する設定
 * @returns 成功フラグ
 */
export function saveConfigToStorage(config: UserConfig): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // バリデーション
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error('Config validation failed:', validation.errors);
    return false;
  }

  try {
    const key = `${STORAGE_KEY_PREFIX}:${config.id}`;
    const data = JSON.stringify({
      ...config,
      updatedAt: new Date().toISOString(),
    });

    localStorage.setItem(key, data);
    return true;
  } catch (error) {
    console.error('Failed to save config to localStorage:', error);
    return false;
  }
}

/**
 * LocalStorageから設定を削除
 *
 * @param userId - ユーザーID
 * @returns 成功フラグ
 */
export function deleteConfigFromStorage(userId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const key = `${STORAGE_KEY_PREFIX}:${userId}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to delete config from localStorage:', error);
    return false;
  }
}

/**
 * LocalStorageから全ての設定を取得
 *
 * @returns 全ユーザー設定の配列
 */
export function getAllConfigsFromStorage(): UserConfig[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const configs: UserConfig[] = [];
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const config = JSON.parse(data) as UserConfig;
            configs.push(config);
          } catch {
            // Skip invalid JSON
            continue;
          }
        }
      }
    }

    return configs;
  } catch (error) {
    console.error('Failed to get all configs from localStorage:', error);
    return [];
  }
}

/**
 * 環境変数から設定を取得（サーバーサイド）
 *
 * 環境変数のフォーマット:
 * USER_CONFIG_<USER_ID>={"slackBotToken":"xoxb-...","slackChannels":["C123"],...}
 *
 * @param userId - ユーザーID
 * @returns ユーザー設定（見つからない場合はnull）
 */
export function getConfigFromEnv(userId: string): UserConfig | null {
  try {
    const envKey = `USER_CONFIG_${userId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    const envValue = process.env[envKey];

    if (!envValue) {
      return null;
    }

    const config = JSON.parse(envValue) as UserConfig;

    // IDを確実に設定
    config.id = userId;

    return config;
  } catch (error) {
    console.error(`Failed to get config from env for user ${userId}:`, error);
    return null;
  }
}

/**
 * 設定を取得（環境変数優先、フォールバックとしてlocalStorage）
 *
 * @param userId - ユーザーID
 * @returns ユーザー設定（見つからない場合はnull）
 */
export function getConfig(userId: string): UserConfig | null {
  // サーバーサイド: 環境変数から取得
  if (typeof window === 'undefined') {
    return getConfigFromEnv(userId);
  }

  // クライアントサイド: localStorageから取得
  return getConfigFromStorage(userId);
}

/**
 * デフォルト設定を生成
 *
 * @param userId - ユーザーID
 * @returns デフォルト設定
 */
export function createDefaultConfig(userId: string): UserConfig {
  return {
    id: userId,
    slackBotToken: undefined,
    slackChannels: [],
    larkWebhookUrl: undefined,
    userMappings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 設定をマージ
 *
 * @param base - ベース設定
 * @param overrides - 上書き設定
 * @returns マージされた設定
 */
export function mergeConfig(
  base: UserConfig,
  overrides: Partial<UserConfig>
): UserConfig {
  return {
    ...base,
    ...overrides,
    // 配列とオブジェクトは深くマージ
    slackChannels: overrides.slackChannels ?? base.slackChannels,
    userMappings: {
      ...base.userMappings,
      ...(overrides.userMappings ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
}
