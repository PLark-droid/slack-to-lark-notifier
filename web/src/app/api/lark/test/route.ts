import { NextRequest, NextResponse } from "next/server";

/**
 * Lark Webhook Test API
 *
 * Tests if a Lark webhook URL is valid by sending a test message.
 *
 * @route POST /api/lark/test
 * @body { webhookUrl: string } - The Lark webhook URL to test
 * @returns { success: boolean, error?: string } - Test result
 */

interface TestWebhookRequest {
  webhookUrl: string;
}

interface LarkWebhookResponse {
  code: number;
  msg: string;
  StatusCode?: number;
  StatusMessage?: string;
}

/**
 * Validates if the URL is a valid Lark webhook URL
 */
function isValidLarkWebhookUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.hostname === "open.larksuite.com" ||
        urlObj.hostname === "open.feishu.cn") &&
      urlObj.pathname.startsWith("/open-apis/bot/v2/hook/")
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/lark/test
 *
 * Tests a Lark webhook URL by sending a test message
 */
export async function POST(request: NextRequest) {
  try {
    const body: TestWebhookRequest = await request.json();
    const { webhookUrl } = body;

    // Validate webhook URL presence
    if (!webhookUrl || typeof webhookUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Webhook URLが指定されていません" },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    if (!isValidLarkWebhookUrl(webhookUrl)) {
      return NextResponse.json(
        {
          success: false,
          error: "無効なLark Webhook URLです。URLを確認してください。",
        },
        { status: 400 }
      );
    }

    // Send test message to Lark
    const testMessage = {
      msg_type: "text",
      content: {
        text: "🧪 テストメッセージ\n\nこのメッセージが表示されていれば、Webhook設定は正常です！",
      },
    };

    console.log(`Testing Lark webhook: ${webhookUrl.substring(0, 50)}...`);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testMessage),
    });

    const result: LarkWebhookResponse = await response.json();

    console.log(
      `Lark webhook test response:`,
      JSON.stringify(result, null, 2)
    );

    // Check if the webhook call was successful
    // Lark returns { code: 0 } for success
    if (result.code === 0) {
      return NextResponse.json({
        success: true,
        message: "テストメッセージを送信しました。Larkグループを確認してください。",
      });
    } else {
      // Lark returned an error
      const errorMessage =
        result.msg || result.StatusMessage || "Webhook URLが無効です";
      console.error(`Lark webhook test failed: ${errorMessage}`);

      return NextResponse.json(
        {
          success: false,
          error: `送信に失敗しました: ${errorMessage}`,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Lark webhook test error:", error);

    // Handle network errors or invalid responses
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";

    return NextResponse.json(
      {
        success: false,
        error: `通信エラーが発生しました: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lark/test
 *
 * Returns API information
 */
export async function GET() {
  return NextResponse.json({
    service: "Lark Webhook Test API",
    endpoint: "/api/lark/test",
    method: "POST",
    body: {
      webhookUrl: "string (required)",
    },
    description: "Tests a Lark webhook URL by sending a test message",
  });
}
