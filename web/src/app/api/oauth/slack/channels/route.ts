import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

/**
 * Temporary channels data structure
 */
interface ChannelsData {
  team_id: string;
  channels: Array<{
    id: string;
    name: string;
    is_private: boolean;
  }>;
  expires_at: number;
}

/**
 * GET /api/oauth/slack/channels
 * Retrieve temporarily stored channel list for team
 *
 * @param team_id - Query parameter: Slack team/workspace ID
 * @returns List of channels available for selection
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("team_id");

  if (!teamId) {
    return NextResponse.json(
      { error: "Missing team_id parameter" },
      { status: 400 }
    );
  }

  try {
    // Retrieve channels data from KV
    const channelsData = await kv.get<ChannelsData>(`channels:temp:${teamId}`);

    if (!channelsData) {
      return NextResponse.json(
        {
          error: "Channel data not found or expired. Please reinstall the app.",
        },
        { status: 404 }
      );
    }

    // Check if data has expired
    if (Date.now() > channelsData.expires_at) {
      await kv.del(`channels:temp:${teamId}`);
      return NextResponse.json(
        {
          error: "Channel data expired. Please reinstall the app.",
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      team_id: channelsData.team_id,
      channels: channelsData.channels,
    });

  } catch (err) {
    console.error("Failed to retrieve channels:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
