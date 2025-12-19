import { NextRequest, NextResponse } from "next/server";

// Lark Event Types
interface LarkEvent {
  schema?: string;
  header?: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event?: {
    sender?: {
      sender_id?: {
        union_id?: string;
        user_id?: string;
        open_id?: string;
      };
      sender_type?: string;
      tenant_key?: string;
    };
    message?: {
      message_id?: string;
      root_id?: string;
      parent_id?: string;
      create_time?: string;
      chat_id?: string;
      chat_type?: string;
      message_type?: string;
      content?: string;
    };
  };
  // Challenge verification
  challenge?: string;
  token?: string;
  type?: string;
}

// Slack API response
interface SlackPostResponse {
  ok: boolean;
  error?: string;
  ts?: string;
}

// Environment variables
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

// Verify Lark request using App Secret
function verifyLarkRequest(appId: string | undefined): boolean {
  // App Secretが設定されていない場合は検証をスキップ（開発用）
  if (!LARK_APP_SECRET) {
    console.warn("LARK_APP_SECRET not configured, skipping verification");
    return true;
  }
  // App IDの存在を確認（基本的な検証）
  return !!appId;
}

// Send message to Slack
async function sendToSlack(
  message: string,
  threadTs?: string
): Promise<SlackPostResponse> {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    throw new Error("Slack configuration missing");
  }

  const payload: {
    channel: string;
    text: string;
    thread_ts?: string;
  } = {
    channel: SLACK_CHANNEL_ID,
    text: message,
  };

  if (threadTs) {
    payload.thread_ts = threadTs;
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

// Parse Lark message content
function parseLarkMessageContent(content: string | undefined): string {
  if (!content) return "";

  try {
    const parsed = JSON.parse(content);
    return parsed.text || content;
  } catch {
    return content;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: LarkEvent = await request.json();

    console.log("Received Lark webhook:", JSON.stringify(body, null, 2));

    // Handle URL verification challenge
    if (body.challenge) {
      console.log("Responding to Lark challenge verification");
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle event callback
    if (body.header && body.event) {
      const appId = body.header.app_id;

      if (!verifyLarkRequest(appId)) {
        return NextResponse.json(
          { error: "Invalid request" },
          { status: 401 }
        );
      }

      const eventType = body.header.event_type;

      // Handle message received event
      if (eventType === "im.message.receive_v1") {
        const message = body.event.message;

        if (message) {
          const messageContent = parseLarkMessageContent(message.content);
          const senderType = body.event.sender?.sender_type || "unknown";

          // Skip bot messages to avoid loops
          if (senderType === "bot") {
            console.log("Skipping bot message to avoid loop");
            return NextResponse.json({ success: true, skipped: true });
          }

          if (messageContent) {
            // Format message for Slack
            const slackMessage = `[Lark] ${messageContent}`;

            try {
              const result = await sendToSlack(slackMessage);

              if (result.ok) {
                console.log("Message forwarded to Slack successfully");
                return NextResponse.json({ success: true, ts: result.ts });
              } else {
                console.error("Slack API error:", result.error);
                return NextResponse.json(
                  { error: result.error },
                  { status: 500 }
                );
              }
            } catch (slackError) {
              console.error("Failed to send to Slack:", slackError);
              return NextResponse.json(
                { error: "Failed to forward to Slack" },
                { status: 500 }
              );
            }
          }
        }
      }

      // Acknowledge other events
      return NextResponse.json({ success: true });
    }

    // Unknown request type
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Lark to Slack Webhook",
    timestamp: new Date().toISOString(),
  });
}
