/**
 * Configuration API Route
 *
 * ユーザー設定の保存・取得API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getConfigFromEnv,
  validateConfig,
  createDefaultConfig,
} from '@/lib/config';
import type {
  SaveConfigRequest,
  SaveConfigResponse,
  GetConfigResponse,
} from '@/lib/types/config';

/**
 * GET /api/config
 * 設定を取得
 *
 * クエリパラメータ:
 * - userId: ユーザーID (必須)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      const response: GetConfigResponse = {
        success: false,
        error: 'userId parameter is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // 環境変数から設定を取得
    const config = getConfigFromEnv(userId);

    if (!config) {
      // 設定が見つからない場合はデフォルト設定を返す
      const defaultConfig = createDefaultConfig(userId);
      const response: GetConfigResponse = {
        success: true,
        config: defaultConfig,
      };
      return NextResponse.json(response);
    }

    const response: GetConfigResponse = {
      success: true,
      config,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/config error:', error);
    const response: GetConfigResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/config
 * 設定を保存
 *
 * リクエストボディ:
 * - config: UserConfig
 *
 * 注意: サーバーサイドでは環境変数への書き込みは行わない
 * クライアントサイドのlocalStorageに保存することを想定
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as SaveConfigRequest;

    if (!body.config) {
      const response: SaveConfigResponse = {
        success: false,
        error: 'config is required in request body',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { config } = body;

    // バリデーション
    const validation = validateConfig(config);
    if (!validation.valid) {
      const response: SaveConfigResponse = {
        success: false,
        error: `Validation failed: ${validation.errors?.join(', ')}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // サーバーサイドでは保存処理は行わない
    // (環境変数への書き込みは不可能)
    // クライアントサイドで localStorage に保存することを想定

    const response: SaveConfigResponse = {
      success: true,
      config: {
        ...config,
        updatedAt: new Date().toISOString(),
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/config error:', error);
    const response: SaveConfigResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PUT /api/config
 * 設定を更新
 *
 * POSTと同じ処理
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}

/**
 * DELETE /api/config
 * 設定を削除
 *
 * クエリパラメータ:
 * - userId: ユーザーID (必須)
 *
 * 注意: サーバーサイドでは環境変数の削除は行わない
 * クライアントサイドのlocalStorageから削除することを想定
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId parameter is required',
        },
        { status: 400 }
      );
    }

    // サーバーサイドでは削除処理は行わない
    // クライアントサイドで localStorage から削除することを想定

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('DELETE /api/config error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
