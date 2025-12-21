/**
 * Lark-Slack OAuth Proxy Worker
 *
 * Cloudflare Worker that handles Slack OAuth callbacks
 * and provides a secure bridge for desktop app authentication.
 *
 * Endpoints:
 * - GET /oauth/callback - Receives OAuth callback from Slack
 * - GET /oauth/retrieve - Desktop app retrieves the auth code
 * - GET /health - Health check endpoint
 */

// CORS headers for cross-origin requests from desktop app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // OAuth callback endpoint - receives redirect from Slack
    if (url.pathname === '/oauth/callback') {
      return handleOAuthCallback(url, env);
    }

    // Retrieve endpoint - desktop app polls for the auth code
    if (url.pathname === '/oauth/retrieve') {
      return handleRetrieve(url, env);
    }

    // Root path - show info page
    if (url.pathname === '/') {
      return new Response(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Lark-Slack OAuth Proxy</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            h1 { color: #4A154B; }
            code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Lark-Slack OAuth Proxy</h1>
          <p>This service handles OAuth authentication for the Lark-Slack Connector desktop app.</p>
          <h2>Endpoints</h2>
          <ul>
            <li><code>GET /oauth/callback</code> - OAuth callback from Slack</li>
            <li><code>GET /oauth/retrieve?state=xxx</code> - Retrieve auth code</li>
            <li><code>GET /health</code> - Health check</li>
          </ul>
          <p><a href="https://github.com/PLark-droid/slack-to-lark-notifier">GitHub Repository</a></p>
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
 * Handle OAuth callback from Slack
 * Stores the auth code temporarily in KV storage
 */
async function handleOAuthCallback(url, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle OAuth errors from Slack
  if (error) {
    const errorDescription = url.searchParams.get('error_description') || 'Unknown error';
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
        <p>${escapeHtml(errorDescription)}</p>
        <p>アプリに戻って再度お試しください。</p>
      </body>
      </html>
    `, {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Validate required parameters
  if (!code || !state) {
    return new Response(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>パラメータエラー</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">パラメータエラー</h1>
        <p>必要なパラメータが不足しています。</p>
      </body>
      </html>
    `, {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Store the code in KV with 5-minute expiration
  try {
    await env.OAUTH_CODES.put(state, code, { expirationTtl: 300 });
  } catch (e) {
    console.error('KV storage error:', e);
    return new Response('Internal Server Error', { status: 500 });
  }

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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 50px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        .success-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #22c55e;
          margin: 0 0 16px 0;
          font-size: 24px;
        }
        p {
          color: #666;
          margin: 0;
          line-height: 1.6;
        }
        .hint {
          margin-top: 20px;
          font-size: 14px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="success-icon">✅</div>
        <h1>認証成功!</h1>
        <p>Slack認証が完了しました。</p>
        <p class="hint">このウィンドウは自動的に閉じます。<br>閉じない場合は手動で閉じてアプリに戻ってください。</p>
      </div>
      <script>
        // Try to close the window after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      </script>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Handle retrieve request from desktop app
 * Returns the stored auth code and deletes it from storage
 */
async function handleRetrieve(url, env) {
  const state = url.searchParams.get('state');

  if (!state) {
    return new Response(JSON.stringify({ error: 'missing_state' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const code = await env.OAUTH_CODES.get(state);

    if (code) {
      // Delete the code after retrieval (one-time use)
      await env.OAUTH_CODES.delete(state);

      return new Response(JSON.stringify({ code }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Code not found (not yet available or expired)
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    console.error('KV retrieval error:', e);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
