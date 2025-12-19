/**
 * User Configuration Types
 *
 * マルチテナント基盤のための設定型定義
 */

/**
 * ユーザーマッピング
 * Lark User ID → Slack User ID のマッピング
 */
export interface UserMapping {
  /** Lark Open ID */
  larkOpenId: string;
  /** Slack User ID */
  slackUserId: string;
}

/**
 * ユーザー設定
 */
export interface UserConfig {
  /** ユニークなユーザーID */
  id: string;

  /** Slack Bot Token (xoxb-...) */
  slackBotToken?: string;

  /** Slack Channel IDs (監視対象チャンネル) */
  slackChannels: string[];

  /** Lark Webhook URL */
  larkWebhookUrl?: string;

  /** ユーザーマッピング (Lark Open ID → Slack User ID) */
  userMappings: Record<string, string>;

  /** 設定作成日時 */
  createdAt?: string;

  /** 設定更新日時 */
  updatedAt?: string;
}

/**
 * 設定の検証結果
 */
export interface ConfigValidationResult {
  /** 検証成功 */
  valid: boolean;

  /** エラーメッセージ（検証失敗時） */
  errors?: string[];
}

/**
 * 設定保存リクエスト
 */
export interface SaveConfigRequest {
  /** 保存する設定 */
  config: UserConfig;
}

/**
 * 設定保存レスポンス
 */
export interface SaveConfigResponse {
  /** 成功フラグ */
  success: boolean;

  /** エラーメッセージ（失敗時） */
  error?: string;

  /** 保存された設定 */
  config?: UserConfig;
}

/**
 * 設定取得レスポンス
 */
export interface GetConfigResponse {
  /** 成功フラグ */
  success: boolean;

  /** エラーメッセージ（失敗時） */
  error?: string;

  /** 取得した設定 */
  config?: UserConfig;
}
