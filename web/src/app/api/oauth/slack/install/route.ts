import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

/**
 * Slack OAuth response for Bot installation
 */
interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  error?: string;
}

/**
 * Slack Channel list response
 */
interface SlackChannelsResponse {
  ok: boolean;
  channels?: Array<{
    id: string;
    name: string;
    is_channel: boolean;
    is_archived: boolean;
    is_private: boolean;
  }>;
  error?: string;
}

/**
 * Bot installation data stored in KV
 */
export interface BotInstallation {
  team_id: string;
  team_name: string;
  bot_token: string;
  bot_user_id: string;
  app_id: string;
  authed_user_id: string;
  scope: string;
  installed_at: string;
  updated_at: string;
}

/**
 * Channel configuration stored in KV
 */
export interface ChannelConfig {
  team_id: string;
  channel_ids: string[];
  channel_names: Record<string, string>;
  updated_at: string;
}

// Environment variables
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Exchange OAuth code for access token
 */
async function exchangeCodeForToken(code: string): Promise<SlackOAuthResponse> {
  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID || "",
      client_secret: SLACK_CLIENT_SECRET || "",
      code,
      redirect_uri: `${APP_URL}/api/oauth/slack/install`,
    }),
  });

  return response.json();
}

/**
 * Fetch list of channels from Slack
 */
async function fetchChannelList(token: string): Promise<SlackChannelsResponse> {
  const response = await fetch(
    "https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=1000",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.json();
}

/**
 * GET /api/oauth/slack/install
 * OAuth callback handler for Slack Bot installation
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle OAuth error
  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(
      `${APP_URL}/setup-wizard?error=${encodeURIComponent(error)}`
    );
  }

  // Validate code parameter
  if (!code) {
    return NextResponse.redirect(
      `${APP_URL}/setup-wizard?error=no_code`
    );
  }

  // Validate environment variables
  if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
    console.error("Missing Slack OAuth credentials");
    return NextResponse.redirect(
      `${APP_URL}/setup-wizard?error=missing_credentials`
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(code);

    if (!tokenResponse.ok || !tokenResponse.access_token) {
      console.error("OAuth token exchange failed:", tokenResponse.error);
      return NextResponse.redirect(
        `${APP_URL}/setup-wizard?error=${encodeURIComponent(tokenResponse.error || "oauth_failed")}`
      );
    }

    const { access_token, team, bot_user_id, app_id, authed_user, scope } = tokenResponse;

    if (!team || !bot_user_id || !app_id || !authed_user) {
      console.error("Invalid OAuth response: missing required fields");
      return NextResponse.redirect(
        `${APP_URL}/setup-wizard?error=invalid_response`
      );
    }

    // Fetch available channels
    const channelsResponse = await fetchChannelList(access_token);

    if (!channelsResponse.ok) {
      console.error("Failed to fetch channels:", channelsResponse.error);
      return NextResponse.redirect(
        `${APP_URL}/setup-wizard?error=${encodeURIComponent(channelsResponse.error || "channels_fetch_failed")}`
      );
    }

    // Store bot installation in KV
    const installation: BotInstallation = {
      team_id: team.id,
      team_name: team.name,
      bot_token: access_token,
      bot_user_id: bot_user_id,
      app_id: app_id,
      authed_user_id: authed_user.id,
      scope: scope || "",
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(`bot:install:${team.id}`, installation);

    // Store channels list temporarily for selection UI
    const channels = channelsResponse.channels || [];
    const channelsData = {
      team_id: team.id,
      channels: channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private,
      })),
      expires_at: Date.now() + 600000, // 10 minutes
    };

    await kv.set(`channels:temp:${team.id}`, channelsData, { ex: 600 });

    console.log(`Bot installed for team ${team.name} (${team.id})`);
    console.log(`Found ${channels.length} channels`);

    // Redirect to channel selection page
    return NextResponse.redirect(
      `${APP_URL}/setup-wizard?team_id=${team.id}&team_name=${encodeURIComponent(team.name)}&success=true`
    );

  } catch (err) {
    console.error("OAuth processing error:", err);
    return NextResponse.redirect(
      `${APP_URL}/setup-wizard?error=server_error`
    );
  }
}

/**
 * POST /api/oauth/slack/install
 * Save selected channels configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team_id, channel_ids } = body;

    if (!team_id || !Array.isArray(channel_ids) || channel_ids.length === 0) {
      return NextResponse.json(
        { error: "Missing team_id or channel_ids" },
        { status: 400 }
      );
    }

    // Retrieve temporary channels data
    const channelsData = await kv.get<{
      team_id: string;
      channels: Array<{ id: string; name: string; is_private: boolean }>;
      expires_at: number;
    }>(`channels:temp:${team_id}`);

    if (!channelsData) {
      return NextResponse.json(
        { error: "Channel data expired. Please reinstall." },
        { status: 410 }
      );
    }

    // Create channel name mapping
    const channelNames: Record<string, string> = {};
    channelsData.channels.forEach(ch => {
      if (channel_ids.includes(ch.id)) {
        channelNames[ch.id] = ch.name;
      }
    });

    // Store channel configuration
    const config: ChannelConfig = {
      team_id,
      channel_ids,
      channel_names: channelNames,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`channels:config:${team_id}`, config);

    // Clean up temporary data
    await kv.del(`channels:temp:${team_id}`);

    console.log(`Channel configuration saved for team ${team_id}:`, channel_ids);

    return NextResponse.json({
      success: true,
      team_id,
      channel_count: channel_ids.length,
    });

  } catch (err) {
    console.error("Failed to save channel configuration:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
