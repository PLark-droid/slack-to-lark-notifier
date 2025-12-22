/**
 * Lark-Slack Bridge Worker
 *
 * Cloudflare Worker that receives Lark webhook events
 * and forwards messages to Slack using each user's own token.
 *
 * Endpoints:
 * - POST /lark/webhook - Receives events from Lark Bot
 * - POST /users - Register user mapping (Lark ID → Slack Token)
 * - GET /users - List registered users (masked)
 * - DELETE /users/:lark_id - Remove user mapping
 * - GET /health - Health check
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Lark webhook endpoint
    if (url.pathname === '/lark/webhook') {
      return handleLarkWebhook(request, env);
    }

    // User management endpoints
    if (url.pathname === '/users') {
      if (request.method === 'POST') {
        return handleRegisterUser(request, env);
      }
      if (request.method === 'GET') {
        return handleListUsers(env);
      }
    }

    // Delete user by Lark ID
    if (url.pathname.startsWith('/users/') && request.method === 'DELETE') {
      const larkId = url.pathname.replace('/users/', '');
      return handleDeleteUser(larkId, env);
    }

    // Check if a message was sent by Bridge (for loop prevention)
    if (url.pathname === '/messages/check' && request.method === 'GET') {
      const channel = url.searchParams.get('channel');
      const ts = url.searchParams.get('ts');
      return handleCheckSentMessage(channel, ts, env);
    }

    // Lark OAuth callback
    if (url.pathname === '/lark/oauth/callback') {
      return handleLarkOAuthCallback(url, env);
    }

    // Lark OAuth retrieve (for polling)
    if (url.pathname === '/lark/oauth/retrieve') {
      const state = url.searchParams.get('state');
      return handleLarkOAuthRetrieve(state, env);
    }

    // Config endpoint (for default channel setting)
    if (url.pathname === '/config') {
      if (request.method === 'POST') {
        return handleSaveConfig(request, env);
      }
      if (request.method === 'GET') {
        return handleGetConfig(env);
      }
    }

    // Root path
    if (url.pathname === '/') {
      return new Response(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>Lark-Slack Bridge</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            h1 { color: #4A154B; }
            code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Lark-Slack Bridge</h1>
          <p>This service forwards messages from Lark to Slack using each user's own account.</p>
          <h2>Endpoints</h2>
          <ul>
            <li><code>POST /lark/webhook</code> - Lark event webhook</li>
            <li><code>POST /users</code> - Register user (Lark ID → Slack Token)</li>
            <li><code>GET /users</code> - List registered users</li>
            <li><code>DELETE /users/:lark_id</code> - Remove user</li>
            <li><code>GET /health</code> - Health check</li>
          </ul>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Register user mapping (Lark ID → Slack Token + Channel)
 */
async function handleRegisterUser(request, env) {
  let data;
  try {
    data = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { lark_user_id, lark_open_id, slack_token, slack_channel, slack_user_name } = data;

  // Require at least one Lark identifier
  const larkId = lark_user_id || lark_open_id;
  if (!larkId) {
    return jsonResponse({ error: 'lark_user_id or lark_open_id is required' }, 400);
  }

  if (!slack_token) {
    return jsonResponse({ error: 'slack_token is required' }, 400);
  }

  if (!slack_channel) {
    return jsonResponse({ error: 'slack_channel is required' }, 400);
  }

  // Store user mapping
  const userMapping = {
    lark_user_id: lark_user_id || null,
    lark_open_id: lark_open_id || null,
    slack_token,
    slack_channel,
    slack_user_name: slack_user_name || null,
    registered_at: new Date().toISOString(),
  };

  // Store by both IDs if available for easier lookup
  if (lark_user_id) {
    await env.BRIDGE_CONFIG.put(`user:${lark_user_id}`, JSON.stringify(userMapping));
  }
  if (lark_open_id) {
    await env.BRIDGE_CONFIG.put(`user:${lark_open_id}`, JSON.stringify(userMapping));
  }

  // Also maintain a list of registered users
  const userList = await getUserList(env);
  const existingIndex = userList.findIndex(u => u.lark_id === larkId);
  if (existingIndex >= 0) {
    userList[existingIndex] = { lark_id: larkId, slack_user_name, registered_at: userMapping.registered_at };
  } else {
    userList.push({ lark_id: larkId, slack_user_name, registered_at: userMapping.registered_at });
  }
  await env.BRIDGE_CONFIG.put('user_list', JSON.stringify(userList));

  console.log(`User registered: ${larkId} → ${slack_user_name || 'unknown'}`);

  return jsonResponse({
    ok: true,
    message: 'User registered successfully',
    lark_id: larkId,
  });
}

/**
 * List registered users (masked)
 */
async function handleListUsers(env) {
  const userList = await getUserList(env);

  return jsonResponse({
    users: userList.map(u => ({
      lark_id: u.lark_id,
      slack_user_name: u.slack_user_name,
      registered_at: u.registered_at,
    })),
    count: userList.length,
  });
}

/**
 * Delete user mapping
 */
async function handleDeleteUser(larkId, env) {
  if (!larkId) {
    return jsonResponse({ error: 'lark_id is required' }, 400);
  }

  // Get user mapping to find both IDs
  const userMapping = await getUserMapping(larkId, env);

  if (userMapping) {
    // Delete both ID entries
    if (userMapping.lark_user_id) {
      await env.BRIDGE_CONFIG.delete(`user:${userMapping.lark_user_id}`);
    }
    if (userMapping.lark_open_id) {
      await env.BRIDGE_CONFIG.delete(`user:${userMapping.lark_open_id}`);
    }
  } else {
    // Try to delete directly
    await env.BRIDGE_CONFIG.delete(`user:${larkId}`);
  }

  // Update user list
  const userList = await getUserList(env);
  const filteredList = userList.filter(u => u.lark_id !== larkId);
  await env.BRIDGE_CONFIG.put('user_list', JSON.stringify(filteredList));

  return jsonResponse({ ok: true, message: 'User deleted' });
}

/**
 * Get user list from KV
 */
async function getUserList(env) {
  const listJson = await env.BRIDGE_CONFIG.get('user_list');
  return listJson ? JSON.parse(listJson) : [];
}

/**
 * Get user mapping by Lark ID
 */
async function getUserMapping(larkId, env) {
  const mappingJson = await env.BRIDGE_CONFIG.get(`user:${larkId}`);
  return mappingJson ? JSON.parse(mappingJson) : null;
}

/**
 * Handle Lark webhook events
 */
async function handleLarkWebhook(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  console.log('Lark webhook received:', JSON.stringify(body));

  // Handle Lark URL verification challenge
  if (body.type === 'url_verification') {
    return jsonResponse({ challenge: body.challenge });
  }

  // Handle event callback
  if (body.header && body.header.event_type) {
    return handleLarkEvent(body, env);
  }

  // Legacy format (v1)
  if (body.event && body.event.type) {
    return handleLarkEventV1(body, env);
  }

  return jsonResponse({ ok: true });
}

/**
 * Handle Lark event (v2 format)
 */
async function handleLarkEvent(body, env) {
  const eventType = body.header.event_type;
  const event = body.event;

  console.log('Event type:', eventType);

  // Handle message events
  if (eventType === 'im.message.receive_v1') {
    return handleLarkMessage(event, env);
  }

  return jsonResponse({ ok: true });
}

/**
 * Handle Lark event (v1 format)
 */
async function handleLarkEventV1(body, env) {
  const event = body.event;
  const eventType = event.type;

  console.log('Event type (v1):', eventType);

  if (eventType === 'message') {
    return handleLarkMessageV1(event, env);
  }

  return jsonResponse({ ok: true });
}

/**
 * Clean up Lark-specific @mentions (internal format like @_user_1)
 * Note: User-facing @username mentions are preserved for Slack conversion
 */
function cleanLarkInternalMentions(text) {
  if (!text) return '';

  // Remove Lark internal @mentions like @_user_1, @_all, @_user_xxx
  let cleaned = text.replace(/@_\w+/g, '');

  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Replace Lark internal mention format (@_user_1) with actual usernames (@田中)
 * Uses the mentions array from the Lark message to map internal IDs to names
 */
function replaceLarkMentionsWithNames(text, mentions) {
  if (!text || !mentions || !Array.isArray(mentions) || mentions.length === 0) {
    return text;
  }

  let result = text;

  for (const mention of mentions) {
    // Lark mentions have a key like "@_user_1" and name/id info
    const key = mention.key;
    const name = mention.name;

    if (key && name) {
      // Skip bot mentions (like @Slack2Lark)
      // Bot mentions typically don't need to be forwarded
      const isBotMention = mention.id?.user_id === undefined && mention.id?.open_id === undefined;
      if (isBotMention && mention.tenant_key) {
        // This is likely an app/bot mention, remove it
        result = result.replace(new RegExp(escapeRegExp(key), 'g'), '');
        continue;
      }

      // Replace internal format with @username for Slack conversion
      result = result.replace(new RegExp(escapeRegExp(key), 'g'), `@${name}`);
      console.log(`Replaced Lark mention: ${key} -> @${name}`);
    }
  }

  // Clean up any remaining internal mentions that weren't in the mentions array
  result = result.replace(/@_\w+/g, '');

  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse #channel specification from message
 * Returns { targetChannel, messageText } where targetChannel is the specified channel or null
 */
function parseChannelSpecification(text) {
  if (!text) return { targetChannel: null, messageText: '' };

  // Pattern: #channel at the beginning of the message followed by space
  const match = text.match(/^#(\S+)\s+(.+)$/s);
  if (match) {
    return {
      targetChannel: match[1], // Channel name without #
      messageText: match[2].trim(),
    };
  }

  return { targetChannel: null, messageText: text };
}

/**
 * Fetch Slack users and cache them (5 minute TTL)
 */
async function getSlackUsers(slackToken, env) {
  const cacheKey = `slack_users:${slackToken.slice(-8)}`; // Use last 8 chars as key to avoid storing full token

  // Check cache first
  const cachedUsers = await env.BRIDGE_CONFIG.get(cacheKey);
  if (cachedUsers) {
    return JSON.parse(cachedUsers);
  }

  try {
    const response = await fetch('https://slack.com/api/users.list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('Slack users.list error:', result.error);
      return [];
    }

    // Build a simple username -> user_id map
    const userMap = {};
    for (const member of result.members || []) {
      if (member.deleted || member.is_bot) continue;

      // Map by display_name, real_name, and name
      if (member.profile?.display_name) {
        userMap[member.profile.display_name.toLowerCase()] = member.id;
      }
      if (member.profile?.real_name) {
        userMap[member.profile.real_name.toLowerCase()] = member.id;
      }
      if (member.name) {
        userMap[member.name.toLowerCase()] = member.id;
      }
    }

    // Cache for 5 minutes
    await env.BRIDGE_CONFIG.put(cacheKey, JSON.stringify(userMap), { expirationTtl: 300 });

    console.log(`Cached ${Object.keys(userMap).length} Slack users`);
    return userMap;
  } catch (e) {
    console.error('Failed to fetch Slack users:', e);
    return {};
  }
}

/**
 * Fetch Slack channels and cache them (5 minute TTL)
 */
async function getSlackChannels(slackToken, env) {
  const cacheKey = `slack_channels:${slackToken.slice(-8)}`;

  // Check cache first
  const cachedChannels = await env.BRIDGE_CONFIG.get(cacheKey);
  if (cachedChannels) {
    return JSON.parse(cachedChannels);
  }

  try {
    const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=1000', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('Slack conversations.list error:', result.error);
      return {};
    }

    // Build channel name -> channel_id map
    const channelMap = {};
    for (const channel of result.channels || []) {
      if (channel.is_archived) continue;
      channelMap[channel.name.toLowerCase()] = channel.id;
    }

    // Cache for 5 minutes
    await env.BRIDGE_CONFIG.put(cacheKey, JSON.stringify(channelMap), { expirationTtl: 300 });

    console.log(`Cached ${Object.keys(channelMap).length} Slack channels`);
    return channelMap;
  } catch (e) {
    console.error('Failed to fetch Slack channels:', e);
    return {};
  }
}

/**
 * Transform @username mentions to Slack format <@UXXXX>
 */
async function transformMentions(text, slackToken, env) {
  if (!text) return text;

  // Get user map
  const userMap = await getSlackUsers(slackToken, env);
  if (Object.keys(userMap).length === 0) {
    return text;
  }

  // Pattern: @username (word characters including Japanese)
  // Match @followed by non-space characters
  const mentionPattern = /@([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+)/g;

  const transformed = text.replace(mentionPattern, (match, username) => {
    const lowerUsername = username.toLowerCase();
    const userId = userMap[lowerUsername];

    if (userId) {
      console.log(`Transformed mention: @${username} -> <@${userId}>`);
      return `<@${userId}>`;
    }

    // Keep original if user not found
    console.log(`User not found for mention: @${username}`);
    return match;
  });

  return transformed;
}

/**
 * Handle Lark message and forward to Slack
 */
async function handleLarkMessage(event, env) {
  const message = event.message;
  if (!message) {
    return jsonResponse({ ok: true });
  }

  // Get message content
  let text = '';
  const messageType = message.message_type;

  if (messageType === 'text') {
    try {
      const content = JSON.parse(message.content);
      text = content.text || '';
    } catch (e) {
      text = message.content || '';
    }
  } else if (messageType === 'post') {
    // Rich text messages - extract text from the post structure
    try {
      const content = JSON.parse(message.content);
      text = extractTextFromPost(content);
    } catch (e) {
      text = `[${messageType} message]`;
    }
  } else {
    text = `[${messageType} message]`;
  }

  // Get mentions array from the message (Lark v2 format)
  const mentions = message.mentions || [];
  console.log('Message mentions:', JSON.stringify(mentions));

  // Replace internal Lark mentions (@_user_1) with actual usernames (@高橋央)
  // This uses the mentions array to map internal IDs to names
  if (mentions.length > 0) {
    text = replaceLarkMentionsWithNames(text, mentions);
  } else {
    // Fallback: clean up any internal mentions if no mentions array
    text = cleanLarkInternalMentions(text);
  }

  // Skip empty messages after cleanup
  if (!text) {
    console.log('Skipping empty message after cleanup');
    return jsonResponse({ ok: true, skipped: true });
  }

  // Get sender info - try multiple ID fields
  const sender = event.sender || {};
  const senderId = sender.sender_id || {};

  // Lark may use different ID fields
  const larkUserId = senderId.user_id || senderId.open_id || sender.open_id || null;
  const larkOpenId = senderId.open_id || sender.open_id || null;

  console.log('Sender IDs:', { larkUserId, larkOpenId });

  // Forward to Slack using the sender's token
  return forwardToSlack(text, larkUserId, larkOpenId, env);
}

/**
 * Extract plain text from Lark rich text (post) format
 */
function extractTextFromPost(content) {
  if (!content || !content.post) return '';

  // Try different language keys (ja_jp, zh_cn, en_us, etc.)
  const post = content.post.ja_jp || content.post.zh_cn || content.post.en_us || Object.values(content.post)[0];
  if (!post || !post.content) return post?.title || '';

  let texts = [];
  if (post.title) texts.push(post.title);

  // Extract text from content array
  for (const line of post.content || []) {
    for (const element of line || []) {
      if (element.tag === 'text') {
        texts.push(element.text || '');
      } else if (element.tag === 'at') {
        // @mentions in rich text
        texts.push(element.user_name ? `@${element.user_name}` : '');
      }
    }
  }

  return texts.join(' ').trim();
}

/**
 * Handle Lark message v1 format
 */
async function handleLarkMessageV1(event, env) {
  let text = event.text || event.content || '';
  const larkUserId = event.user_id || null;
  const larkOpenId = event.open_id || null;

  // Clean up Lark internal @mentions, but preserve user-facing @username
  text = cleanLarkInternalMentions(text);

  // Skip empty messages after cleanup
  if (!text) {
    console.log('Skipping empty message after cleanup');
    return jsonResponse({ ok: true, skipped: true });
  }

  return forwardToSlack(text, larkUserId, larkOpenId, env);
}

/**
 * Forward message to Slack using user's own token
 */
async function forwardToSlack(text, larkUserId, larkOpenId, env) {
  // Try to find user mapping by user_id first, then open_id
  let userMapping = null;

  if (larkUserId) {
    userMapping = await getUserMapping(larkUserId, env);
  }
  if (!userMapping && larkOpenId) {
    userMapping = await getUserMapping(larkOpenId, env);
  }

  if (!userMapping) {
    console.log(`No user mapping found for Lark ID: ${larkUserId || larkOpenId}`);

    // Fallback to default config (for backwards compatibility)
    const defaultChannel = await env.BRIDGE_CONFIG.get('default_slack_channel');
    const defaultToken = await env.BRIDGE_CONFIG.get('default_slack_token');

    if (defaultToken && defaultChannel) {
      console.log('Using default config for unmapped user');
      return sendToSlack(text, `[Lark: ${larkUserId || larkOpenId || 'Unknown'}]`, defaultToken, defaultChannel, env);
    }

    return jsonResponse({
      ok: false,
      error: 'User not registered',
      lark_user_id: larkUserId,
      lark_open_id: larkOpenId,
    }, 404);
  }

  const { slack_token, slack_channel, slack_user_name } = userMapping;

  // Parse #channel specification from message
  const { targetChannel, messageText } = parseChannelSpecification(text);

  // Determine target channel (specified channel or default)
  let finalChannel = slack_channel;
  if (targetChannel) {
    // Look up channel ID from channel name
    const channelMap = await getSlackChannels(slack_token, env);
    const channelId = channelMap[targetChannel.toLowerCase()];

    if (channelId) {
      finalChannel = channelId;
      console.log(`Channel specified: #${targetChannel} -> ${channelId}`);
    } else {
      console.log(`Channel not found: #${targetChannel}, using default channel`);
      // Prepend error message about channel not found
      const errorNote = `[⚠️ チャンネル #${targetChannel} が見つかりません。デフォルトチャンネルに送信]\n`;
      text = errorNote + text;
    }
  }

  // Transform @username mentions to Slack format
  const transformedText = await transformMentions(targetChannel ? messageText : text, slack_token, env);

  console.log(`Forwarding message from ${slack_user_name || larkUserId} to channel ${finalChannel}`);

  // Send directly - the message will appear as from the user's account
  return sendToSlack(transformedText, null, slack_token, finalChannel, env);
}

/**
 * Send message to Slack
 */
async function sendToSlack(text, prefix, slackToken, slackChannel, env) {
  const messageText = prefix ? `${prefix}\n${text}` : text;

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: slackChannel,
        text: messageText,
        unfurl_links: false,
        // For user tokens, as_user should be true to post as the user
        as_user: slackToken.startsWith('xoxp-'),
      }),
    });

    const result = await response.json();
    console.log('Slack API response:', JSON.stringify(result));

    if (!result.ok) {
      console.error('Slack API error:', result.error);
      return jsonResponse({ error: result.error }, 500);
    }

    // Record sent message for loop prevention (TTL: 5 minutes)
    if (result.ts && result.channel && env) {
      const key = `sent:${result.channel}:${result.ts}`;
      await env.BRIDGE_CONFIG.put(key, '1', { expirationTtl: 300 });
      console.log(`Recorded sent message: ${key}`);
    }

    return jsonResponse({ ok: true, forwarded: true, ts: result.ts, channel: result.channel });
  } catch (e) {
    console.error('Slack API request failed:', e);
    return jsonResponse({ error: 'Slack API request failed' }, 500);
  }
}

/**
 * Check if a message was sent by Bridge (for loop prevention)
 */
async function handleCheckSentMessage(channel, ts, env) {
  if (!channel || !ts) {
    return jsonResponse({ error: 'channel and ts are required' }, 400);
  }

  const key = `sent:${channel}:${ts}`;
  const exists = await env.BRIDGE_CONFIG.get(key);

  return jsonResponse({
    sent_by_bridge: !!exists,
    channel,
    ts,
  });
}

/**
 * Save default configuration
 */
async function handleSaveConfig(request, env) {
  let config;
  try {
    config = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  // Save default config (fallback for unmapped users)
  if (config.default_slack_token) {
    await env.BRIDGE_CONFIG.put('default_slack_token', config.default_slack_token);
  }
  if (config.default_slack_channel) {
    await env.BRIDGE_CONFIG.put('default_slack_channel', config.default_slack_channel);
  }

  return jsonResponse({ ok: true, message: 'Configuration saved' });
}

/**
 * Get configuration
 */
async function handleGetConfig(env) {
  const [defaultToken, defaultChannel] = await Promise.all([
    env.BRIDGE_CONFIG.get('default_slack_token'),
    env.BRIDGE_CONFIG.get('default_slack_channel'),
  ]);

  return jsonResponse({
    default_slack_token_configured: !!defaultToken,
    default_slack_channel: defaultChannel || null,
  });
}

/**
 * JSON response helper
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

/**
 * Handle Lark OAuth callback
 * Receives the authorization code from Lark and exchanges it for user info
 */
async function handleLarkOAuthCallback(url, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Handle OAuth errors
  if (!code || !state) {
    return new Response(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>認証エラー</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">認証エラー</h1>
        <p>認証コードが取得できませんでした。</p>
        <p>アプリに戻って再度お試しください。</p>
      </body>
      </html>
    `, {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Get app credentials from KV
  const appId = await env.BRIDGE_CONFIG.get('lark_app_id');
  const appSecret = await env.BRIDGE_CONFIG.get('lark_app_secret');

  if (!appId || !appSecret) {
    console.error('Lark app credentials not configured');
    return new Response('Lark app credentials not configured', { status: 500 });
  }

  try {
    // Get app access token first
    const appTokenResponse = await fetch('https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    });
    const appTokenData = await appTokenResponse.json();

    if (appTokenData.code !== 0) {
      console.error('Failed to get Lark app token:', appTokenData);
      throw new Error(appTokenData.msg || 'Failed to get app token');
    }

    const appAccessToken = appTokenData.app_access_token;

    // Exchange code for user access token
    const tokenResponse = await fetch('https://open.larksuite.com/open-apis/authen/v1/oidc/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appAccessToken}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
      }),
    });
    const tokenData = await tokenResponse.json();

    if (tokenData.code !== 0) {
      console.error('Failed to exchange Lark code:', tokenData);
      throw new Error(tokenData.msg || 'Failed to exchange code');
    }

    const userAccessToken = tokenData.data.access_token;
    const openId = tokenData.data.open_id;
    const userId = tokenData.data.user_id;
    const name = tokenData.data.name;

    console.log('Lark OAuth success:', { openId, userId, name });

    // Store the result for polling
    const result = {
      open_id: openId,
      user_id: userId,
      name: name,
      access_token: userAccessToken,
    };

    await env.BRIDGE_CONFIG.put(`lark_oauth:${state}`, JSON.stringify(result), { expirationTtl: 300 });

    // Return success page
    return new Response(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>認証成功</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            text-align: center;
            padding: 50px 20px;
            background: linear-gradient(135deg, #3370ff 0%, #1a56db 100%);
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 400px;
          }
          .success-icon { font-size: 64px; margin-bottom: 20px; }
          h1 { color: #22c55e; margin: 0 0 16px 0; font-size: 24px; }
          p { color: #666; margin: 0; line-height: 1.6; }
          .user-name { font-weight: bold; color: #3370ff; }
          .hint { margin-top: 20px; font-size: 14px; color: #999; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="success-icon">✅</div>
          <h1>Lark認証成功!</h1>
          <p>ようこそ、<span class="user-name">${escapeHtml(name || 'ユーザー')}</span>さん</p>
          <p class="hint">このウィンドウは自動的に閉じます。<br>閉じない場合は手動で閉じてアプリに戻ってください。</p>
        </div>
        <script>
          setTimeout(() => { window.close(); }, 2000);
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (e) {
    console.error('Lark OAuth error:', e);
    return new Response(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>認証エラー</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">認証エラー</h1>
        <p>${escapeHtml(e.message || '不明なエラー')}</p>
        <p>アプリに戻って再度お試しください。</p>
      </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

/**
 * Retrieve Lark OAuth result (polling endpoint)
 */
async function handleLarkOAuthRetrieve(state, env) {
  if (!state) {
    return jsonResponse({ error: 'missing_state' }, 400);
  }

  const resultJson = await env.BRIDGE_CONFIG.get(`lark_oauth:${state}`);

  if (resultJson) {
    // Delete after retrieval (one-time use)
    await env.BRIDGE_CONFIG.delete(`lark_oauth:${state}`);

    const result = JSON.parse(resultJson);
    return jsonResponse(result);
  }

  // Not yet available
  return jsonResponse({ error: 'not_found' }, 404);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
