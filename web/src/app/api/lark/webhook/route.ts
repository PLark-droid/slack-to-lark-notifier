import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// User mapping from KV store
interface UserMapping {
  slack_user_id: string;
  slack_user_token: string;
  slack_team_id: string;
  slack_user_name?: string;
  lark_open_id: string;
  created_at: string;
  updated_at: string;
}

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

// Parsed message with channel targeting
interface ParsedMessage {
  channelId: string | null;
  threadTs: string | null;
  message: string;
}

// Environment variables
const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_DEFAULT_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

// Cache for Lark tenant access token
let larkAccessToken: string | null = null;
let larkTokenExpiry: number = 0;

// Get Lark tenant access token
async function getLarkAccessToken(): Promise<string | null> {
  if (larkAccessToken && Date.now() < larkTokenExpiry) {
    return larkAccessToken;
  }

  if (!LARK_APP_ID || !LARK_APP_SECRET) {
    console.warn("LARK_APP_ID or LARK_APP_SECRET not configured");
    return null;
  }

  try {
    const response = await fetch(
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: LARK_APP_ID,
          app_secret: LARK_APP_SECRET,
        }),
      }
    );

    const data = await response.json();
    if (data.code === 0) {
      larkAccessToken = data.tenant_access_token;
      larkTokenExpiry = Date.now() + (data.expire - 300) * 1000; // Refresh 5 min early
      return larkAccessToken;
    }
  } catch (error) {
    console.error("Failed to get Lark access token:", error);
  }
  return null;
}

// Get Lark user info - try multiple methods
async function getLarkUserName(openId: string): Promise<string> {
  const token = await getLarkAccessToken();
  if (!token) {
    console.log("No Lark access token available");
    return openId;
  }

  // Method 1: Try contact API
  try {
    const response = await fetch(
      `https://open.larksuite.com/open-apis/contact/v3/users/${openId}?user_id_type=open_id`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    console.log("Lark user info response:", JSON.stringify(data));

    if (data.code === 0 && data.data?.user) {
      return data.data.user.name || data.data.user.en_name || openId;
    }

    // If contact API fails, try to get user from IM API
    if (data.code !== 0) {
      console.log(`Contact API failed with code ${data.code}: ${data.msg}`);
    }
  } catch (error) {
    console.error("Failed to get Lark user info:", error);
  }

  // Method 2: Try IM chat member info (batch get)
  try {
    const batchResponse = await fetch(
      `https://open.larksuite.com/open-apis/contact/v3/users/batch?user_ids=${openId}&user_id_type=open_id`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const batchData = await batchResponse.json();
    console.log("Lark batch user info response:", JSON.stringify(batchData));

    if (batchData.code === 0 && batchData.data?.items?.[0]) {
      const user = batchData.data.items[0];
      return user.name || user.en_name || openId;
    }
  } catch (error) {
    console.error("Failed to get Lark user info (batch):", error);
  }

  return openId;
}

// Cache for Slack users (for @mention resolution)
let slackUsersCache: Map<string, string> | null = null;
let slackUsersCacheExpiry: number = 0;

// Get Slack users for @mention resolution
async function getSlackUsers(): Promise<Map<string, string>> {
  if (slackUsersCache && Date.now() < slackUsersCacheExpiry) {
    return slackUsersCache;
  }

  if (!SLACK_BOT_TOKEN) {
    return new Map();
  }

  try {
    const response = await fetch(
      "https://slack.com/api/users.list?limit=1000",
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      }
    );

    const data = await response.json();
    if (data.ok && data.members) {
      const userMap = new Map<string, string>();
      for (const member of data.members) {
        if (!member.deleted && !member.is_bot) {
          // Map various name formats to user ID
          const userId = member.id;
          const displayName = member.profile?.display_name?.toLowerCase();
          const realName = member.profile?.real_name?.toLowerCase();
          const name = member.name?.toLowerCase();

          if (displayName) userMap.set(displayName, userId);
          if (realName) userMap.set(realName, userId);
          if (name) userMap.set(name, userId);
        }
      }
      slackUsersCache = userMap;
      slackUsersCacheExpiry = Date.now() + 5 * 60 * 1000; // Cache for 5 minutes
      return userMap;
    }
  } catch (error) {
    console.error("Failed to get Slack users:", error);
  }

  return new Map();
}

// Convert @mentions in message to Slack format
async function convertMentionsToSlack(message: string): Promise<string> {
  const mentionPattern = /@([\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+)/g;
  const mentions = message.match(mentionPattern);

  if (!mentions) return message;

  const slackUsers = await getSlackUsers();
  let convertedMessage = message;

  for (const mention of mentions) {
    const username = mention.slice(1).toLowerCase(); // Remove @ and lowercase
    const slackUserId = slackUsers.get(username);

    if (slackUserId) {
      convertedMessage = convertedMessage.replace(mention, `<@${slackUserId}>`);
    }
  }

  return convertedMessage;
}

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

// Parse message for channel targeting
// Formats:
// - "#channel-name メッセージ" → send to channel by name
// - "C1234567890 メッセージ" → send to channel by ID
// - "[C1234567890|1234567890.123456] メッセージ" → reply to thread
// - "メッセージ" → send to default channel
function parseMessage(content: string): ParsedMessage {
  let channelId: string | null = null;
  let threadTs: string | null = null;
  let message = content.trim();

  // Pattern 1: Thread reply format [C1234567890|1234567890.123456]
  const threadMatch = message.match(/^\[([A-Z][A-Z0-9]+)\|(\d+\.\d+)\]\s*([\s\S]*)/);
  if (threadMatch) {
    channelId = threadMatch[1];
    threadTs = threadMatch[2];
    message = threadMatch[3].trim();
    return { channelId, threadTs, message };
  }

  // Pattern 2: Channel ID format (C1234567890 message)
  const channelIdMatch = message.match(/^([A-Z][A-Z0-9]{8,})\s+([\s\S]+)/);
  if (channelIdMatch) {
    channelId = channelIdMatch[1];
    message = channelIdMatch[2].trim();
    return { channelId, threadTs, message };
  }

  // Pattern 3: Channel name format (#channel-name message)
  const channelNameMatch = message.match(/^#([\w-]+)\s+([\s\S]+)/);
  if (channelNameMatch) {
    // Will need to resolve channel name to ID
    const channelName = channelNameMatch[1];
    message = channelNameMatch[2].trim();
    return { channelId: `#${channelName}`, threadTs, message };
  }

  // Default: no channel specified
  return { channelId: null, threadTs, message };
}

// Resolve channel name to ID
async function resolveChannelId(channelRef: string): Promise<string | null> {
  if (!SLACK_BOT_TOKEN) return null;

  // Already a channel ID
  if (channelRef.startsWith("C") && !channelRef.startsWith("#")) {
    return channelRef;
  }

  // Channel name (remove # prefix)
  const channelName = channelRef.replace(/^#/, "");

  try {
    // List channels to find by name
    const response = await fetch(
      `https://slack.com/api/conversations.list?limit=1000&types=public_channel,private_channel`,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      }
    );
    const data = await response.json();

    if (data.ok && data.channels) {
      const channel = data.channels.find(
        (ch: { name: string; id: string }) => ch.name === channelName
      );
      if (channel) {
        return channel.id;
      }
    }
  } catch (error) {
    console.error("Failed to resolve channel name:", error);
  }

  return null;
}

// Get user mapping from KV store
async function getUserMapping(larkOpenId: string): Promise<UserMapping | null> {
  try {
    const mapping = await kv.get<UserMapping>(`user:lark:${larkOpenId}`);
    if (mapping) {
      console.log(`Found user mapping for Lark ${larkOpenId} -> Slack ${mapping.slack_user_id}`);
      return mapping;
    }
  } catch (error) {
    console.error("Failed to get user mapping from KV:", error);
  }
  return null;
}

// Send message to Slack (supports both Bot token and User token)
async function sendToSlack(
  message: string,
  channelId: string,
  threadTs?: string | null,
  userToken?: string | null
): Promise<SlackPostResponse> {
  // Use user token if available, otherwise fall back to bot token
  const token = userToken || SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("No Slack token available");
  }

  const payload: {
    channel: string;
    text: string;
    thread_ts?: string;
  } = {
    channel: channelId,
    text: message,
  };

  if (threadTs) {
    payload.thread_ts = threadTs;
  }

  console.log(`Sending to Slack with ${userToken ? "USER token" : "BOT token"}`);

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
          const rawContent = parseLarkMessageContent(message.content);
          const senderType = body.event.sender?.sender_type || "unknown";

          // Skip bot messages to avoid loops
          if (senderType === "bot") {
            console.log("Skipping bot message to avoid loop");
            return NextResponse.json({ success: true, skipped: true });
          }

          if (rawContent) {
            // Get sender info
            const senderId = body.event.sender?.sender_id?.open_id;

            // Check if user has linked their Slack account
            const userMapping = senderId ? await getUserMapping(senderId) : null;

            // Get sender name (for fallback mode)
            const senderName = userMapping?.slack_user_name
              || (senderId ? await getLarkUserName(senderId) : "Unknown");

            // Parse message for channel targeting
            const parsed = parseMessage(rawContent);

            // Determine target channel
            let targetChannelId: string | null = null;

            if (parsed.channelId) {
              // Resolve channel reference to ID
              targetChannelId = await resolveChannelId(parsed.channelId);
              if (!targetChannelId) {
                console.error(`Could not resolve channel: ${parsed.channelId}`);
                // Fall back to default channel
                targetChannelId = SLACK_DEFAULT_CHANNEL_ID || null;
              }
            } else {
              // Use default channel
              targetChannelId = SLACK_DEFAULT_CHANNEL_ID || null;
            }

            if (!targetChannelId) {
              console.error("No target channel available");
              return NextResponse.json(
                { error: "No target channel configured" },
                { status: 400 }
              );
            }

            // Convert @mentions
            const convertedMessage = await convertMentionsToSlack(parsed.message);

            // Determine message format based on whether user has linked account
            // If linked: send as the user directly (no prefix)
            // If not linked: send via bot with [Lark - name] prefix
            const slackMessage = userMapping
              ? convertedMessage
              : `[Lark - ${senderName}] ${convertedMessage}`;

            // Use user token if available
            const userToken = userMapping?.slack_user_token || null;

            try {
              const result = await sendToSlack(
                slackMessage,
                targetChannelId,
                parsed.threadTs,
                userToken
              );

              if (result.ok) {
                const replyType = parsed.threadTs ? "thread reply" : "message";
                const tokenType = userMapping ? "as USER" : "via BOT";
                console.log(`${replyType} sent to Slack channel ${targetChannelId} (${tokenType})`);
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
