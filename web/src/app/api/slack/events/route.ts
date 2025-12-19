import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Slack Event Types
interface SlackEvent {
  token?: string;
  challenge?: string;
  type: string;
  event?: {
    type: string;
    channel?: string;
    user?: string;
    text?: string;
    ts?: string;
    thread_ts?: string;
    bot_id?: string;
    subtype?: string;
  };
  event_id?: string;
  event_time?: number;
  team_id?: string;
}

interface SlackChannel {
  id: string;
  name: string;
}

// Environment variables
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const LARK_WEBHOOK_URL = process.env.LARK_WEBHOOK_URL;

// Verify Slack request signature
function verifySlackRequest(
  signature: string | null,
  timestamp: string | null,
  body: string
): boolean {
  if (!SLACK_SIGNING_SECRET || !signature || !timestamp) {
    console.warn("Missing signing secret or headers");
    return false;
  }

  // Check timestamp to prevent replay attacks (5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    console.warn("Timestamp too old");
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", SLACK_SIGNING_SECRET)
      .update(sigBasestring)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

// Get Slack user info
async function getSlackUserInfo(userId: string): Promise<string> {
  if (!SLACK_BOT_TOKEN) return userId;

  try {
    const response = await fetch(
      `https://slack.com/api/users.info?user=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      }
    );
    const data = await response.json();
    if (data.ok && data.user) {
      return data.user.real_name || data.user.name || userId;
    }
  } catch (error) {
    console.error("Failed to get user info:", error);
  }
  return userId;
}

// Get Slack channel info
async function getSlackChannelInfo(channelId: string): Promise<SlackChannel> {
  if (!SLACK_BOT_TOKEN) return { id: channelId, name: channelId };

  try {
    const response = await fetch(
      `https://slack.com/api/conversations.info?channel=${channelId}`,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      }
    );
    const data = await response.json();
    if (data.ok && data.channel) {
      return {
        id: channelId,
        name: data.channel.name || channelId,
      };
    }
  } catch (error) {
    console.error("Failed to get channel info:", error);
  }
  return { id: channelId, name: channelId };
}

// Send message to Lark with channel and thread info
async function sendToLark(
  message: string,
  userName: string,
  channel: SlackChannel,
  threadTs?: string,
  messageTs?: string
): Promise<boolean> {
  if (!LARK_WEBHOOK_URL) {
    console.error("LARK_WEBHOOK_URL not configured");
    return false;
  }

  try {
    // Format: include channel info for reply targeting
    // [Slack #channel-name | C123456 | ts:1234567890.123456]
    const threadInfo = threadTs ? ` (スレッド)` : "";
    const replyInfo = `[${channel.id}|${messageTs || ""}]`;

    const formattedMessage = [
      `📢 #${channel.name}${threadInfo}`,
      `👤 ${userName}`,
      `━━━━━━━━━━━━━━━`,
      message,
      `━━━━━━━━━━━━━━━`,
      `💬 返信: #${channel.name} メッセージ`,
      `🔖 ${replyInfo}`,
    ].join("\n");

    const response = await fetch(LARK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msg_type: "text",
        content: {
          text: formattedMessage,
        },
      }),
    });

    const result = await response.json();
    return result.code === 0 || result.StatusCode === 0;
  } catch (error) {
    console.error("Failed to send to Lark:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body: SlackEvent = JSON.parse(rawBody);

    // Get Slack headers
    const signature = request.headers.get("x-slack-signature");
    const timestamp = request.headers.get("x-slack-request-timestamp");

    console.log("Received Slack event:", body.type);

    // Handle URL verification challenge
    if (body.type === "url_verification") {
      console.log("Responding to Slack URL verification");
      return NextResponse.json({ challenge: body.challenge });
    }

    // Verify request signature for event callbacks
    if (body.type === "event_callback") {
      if (!verifySlackRequest(signature, timestamp, rawBody)) {
        console.error("Invalid Slack signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }

      const event = body.event;
      if (!event) {
        return NextResponse.json({ ok: true });
      }

      // Handle message events
      if (event.type === "message") {
        // Skip bot messages and message subtypes (edits, deletes, etc.)
        if (event.bot_id || event.subtype) {
          console.log("Skipping bot message or subtype");
          return NextResponse.json({ ok: true });
        }

        const text = event.text;
        const userId = event.user;
        const channelId = event.channel;
        const threadTs = event.thread_ts;
        const messageTs = event.ts;

        if (text && userId && channelId) {
          // Get user and channel info
          const [userName, channelInfo] = await Promise.all([
            getSlackUserInfo(userId),
            getSlackChannelInfo(channelId),
          ]);

          // Send to Lark with full context
          const success = await sendToLark(
            text,
            userName,
            channelInfo,
            threadTs,
            messageTs
          );

          if (success) {
            console.log(`Message forwarded to Lark from #${channelInfo.name}`);
          } else {
            console.error("Failed to forward message to Lark");
          }
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Slack webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Slack to Lark Webhook",
    timestamp: new Date().toISOString(),
  });
}
