import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// Slack OAuth response
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
    scope: string;
    access_token: string;
    token_type: string;
  };
  error?: string;
}

// User mapping stored in KV
export interface UserMapping {
  slack_user_id: string;
  slack_user_token: string;
  slack_team_id: string;
  slack_user_name?: string;
  lark_open_id: string;
  created_at: string;
  updated_at: string;
}

// Environment variables
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://slack-to-lark-notifier.vercel.app";

// Exchange code for tokens
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
      redirect_uri: `${APP_URL}/api/oauth/slack`,
    }),
  });

  return response.json();
}

// Get Slack user info
async function getSlackUserInfo(token: string, userId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://slack.com/api/users.info?user=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    if (data.ok && data.user) {
      return data.user.real_name || data.user.name || null;
    }
  } catch (error) {
    console.error("Failed to get Slack user info:", error);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // Contains lark_open_id
  const error = searchParams.get("error");

  // Handle OAuth error
  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/link-account?error=${encodeURIComponent(error)}`
    );
  }

  // Check for code
  if (!code) {
    return NextResponse.redirect(
      `${APP_URL}/link-account?error=no_code`
    );
  }

  // Check for state (lark_open_id)
  if (!state) {
    return NextResponse.redirect(
      `${APP_URL}/link-account?error=no_lark_id`
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(code);

    if (!tokenResponse.ok || !tokenResponse.authed_user) {
      console.error("OAuth error:", tokenResponse.error);
      return NextResponse.redirect(
        `${APP_URL}/link-account?error=${encodeURIComponent(tokenResponse.error || "oauth_failed")}`
      );
    }

    const { authed_user, team } = tokenResponse;
    const larkOpenId = state;

    // Get user name
    const userName = await getSlackUserInfo(
      authed_user.access_token,
      authed_user.id
    );

    // Create user mapping
    const mapping: UserMapping = {
      slack_user_id: authed_user.id,
      slack_user_token: authed_user.access_token,
      slack_team_id: team?.id || "",
      slack_user_name: userName || undefined,
      lark_open_id: larkOpenId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store mapping in KV (key: lark_open_id)
    await kv.set(`user:lark:${larkOpenId}`, mapping);
    // Also store reverse mapping (slack_user_id -> lark_open_id)
    await kv.set(`user:slack:${authed_user.id}`, larkOpenId);

    console.log(`User mapping created: Lark ${larkOpenId} -> Slack ${authed_user.id}`);

    // Redirect to success page
    return NextResponse.redirect(
      `${APP_URL}/link-account?success=true&slack_user=${encodeURIComponent(userName || authed_user.id)}`
    );

  } catch (err) {
    console.error("OAuth processing error:", err);
    return NextResponse.redirect(
      `${APP_URL}/link-account?error=server_error`
    );
  }
}

// Health check
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
