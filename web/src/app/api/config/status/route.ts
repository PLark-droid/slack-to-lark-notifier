import { NextResponse } from "next/server";

/**
 * GET /api/config/status
 * Returns current configuration status for dashboard
 */
export async function GET() {
  try {
    // Check environment variables for configuration status
    const slackConnected = !!(
      process.env.SLACK_BOT_TOKEN ||
      process.env.SLACK_APP_TOKEN ||
      process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
    );

    const larkWebhookConfigured = !!process.env.LARK_WEBHOOK_URL;
    const larkAppConfigured = !!(
      process.env.LARK_APP_ID &&
      process.env.LARK_APP_SECRET
    );

    // In a real implementation, you would:
    // - Fetch account links from a database
    // - Fetch recent message transfer logs
    // - Get actual Slack workspace info via API
    // - Get actual Lark app info via API

    const status = {
      slack: {
        connected: slackConnected,
        workspace: process.env.SLACK_WORKSPACE_NAME || undefined,
        botName: "Slack to Lark Bot",
        channels: slackConnected ? getConfiguredChannels() : undefined,
      },
      lark: {
        webhookConfigured: larkWebhookConfigured,
        appConfigured: larkAppConfigured,
        appName: process.env.LARK_APP_NAME || undefined,
      },
      accountLinks: getAccountLinks(),
      recentMessages: getRecentMessages(),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching config status:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration status" },
      { status: 500 }
    );
  }
}

/**
 * Get configured Slack channels from environment or config
 */
function getConfiguredChannels(): string[] {
  const channelsEnv = process.env.SLACK_CHANNELS;
  if (channelsEnv) {
    return channelsEnv.split(",").map((ch) => ch.trim());
  }
  return [];
}

/**
 * Get account links from storage
 * In real implementation, this would query a database
 */
function getAccountLinks(): Array<{
  larkOpenId: string;
  slackUserId: string;
  slackUserName: string;
  linkedAt: string;
}> {
  // TODO: Implement database query
  // For now, check if there's a mapping in environment variables
  const mappingEnv = process.env.ACCOUNT_MAPPING;
  if (!mappingEnv) return [];

  try {
    const mapping = JSON.parse(mappingEnv) as Record<string, { userId?: string; userName?: string; linkedAt?: string } | string>;
    return Object.entries(mapping).map(([larkId, slackData]) => ({
      larkOpenId: larkId,
      slackUserId: typeof slackData === 'string' ? slackData : (slackData.userId || ''),
      slackUserName: typeof slackData === 'string' ? "Unknown User" : (slackData.userName || "Unknown User"),
      linkedAt: typeof slackData === 'string' ? new Date().toISOString() : (slackData.linkedAt || new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

/**
 * Get recent message transfer logs
 * In real implementation, this would query a log database or service
 */
function getRecentMessages(): Array<{
  id: string;
  direction: "slack-to-lark" | "lark-to-slack";
  timestamp: string;
  from: string;
  preview: string;
  status: "success" | "failed";
}> {
  // TODO: Implement log storage and retrieval
  // For now, return empty array
  return [];
}
