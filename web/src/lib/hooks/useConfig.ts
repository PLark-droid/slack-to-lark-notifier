/**
 * useConfig Hook
 *
 * クライアントサイドでの設定管理用React Hook
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getConfigFromStorage,
  saveConfigToStorage,
  deleteConfigFromStorage,
  createDefaultConfig,
} from '@/lib/config';
import type { UserConfig } from '@/lib/types/config';

/**
 * useConfig Hook の戻り値
 */
export interface UseConfigResult {
  /** 現在の設定（未ロードの場合はnull） */
  config: UserConfig | null;

  /** ロード中フラグ */
  loading: boolean;

  /** エラー */
  error: string | null;

  /** 設定を保存 */
  saveConfig: (config: UserConfig) => Promise<boolean>;

  /** 設定を削除 */
  deleteConfig: () => Promise<boolean>;

  /** 設定を再読み込み */
  reloadConfig: () => void;
}

/**
 * useConfig Hook
 *
 * ユーザー設定の読み込み・保存を行うReact Hook
 *
 * @param userId - ユーザーID
 * @returns UseConfigResult
 *
 * @example
 * ```tsx
 * const { config, loading, error, saveConfig } = useConfig('user-123');
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * return (
 *   <div>
 *     <p>Slack Channels: {config?.slackChannels.join(', ')}</p>
 *     <button onClick={() => saveConfig({ ...config, slackChannels: ['C123'] })}>
 *       Save
 *     </button>
 *   </div>
 * );
 * ```
 */
export function useConfig(userId: string): UseConfigResult {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 設定を読み込み
   */
  const loadConfig = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      // LocalStorageから取得
      let userConfig = getConfigFromStorage(userId);

      // 見つからない場合はデフォルト設定を作成
      if (!userConfig) {
        userConfig = createDefaultConfig(userId);
        // デフォルト設定を保存
        saveConfigToStorage(userConfig);
      }

      setConfig(userConfig);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load config';
      setError(errorMessage);
      console.error('useConfig loadConfig error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * 設定を保存
   */
  const saveConfig = useCallback(
    async (newConfig: UserConfig): Promise<boolean> => {
      try {
        setError(null);

        // LocalStorageに保存
        const success = saveConfigToStorage(newConfig);

        if (success) {
          setConfig(newConfig);
          return true;
        } else {
          setError('Failed to save config to localStorage');
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to save config';
        setError(errorMessage);
        console.error('useConfig saveConfig error:', err);
        return false;
      }
    },
    []
  );

  /**
   * 設定を削除
   */
  const deleteConfig = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // LocalStorageから削除
      const success = deleteConfigFromStorage(userId);

      if (success) {
        // デフォルト設定にリセット
        const defaultConfig = createDefaultConfig(userId);
        setConfig(defaultConfig);
        return true;
      } else {
        setError('Failed to delete config from localStorage');
        return false;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete config';
      setError(errorMessage);
      console.error('useConfig deleteConfig error:', err);
      return false;
    }
  }, [userId]);

  /**
   * 設定を再読み込み
   */
  const reloadConfig = useCallback(() => {
    loadConfig();
  }, [loadConfig]);

  // 初回マウント時に設定を読み込み
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    saveConfig,
    deleteConfig,
    reloadConfig,
  };
}
