// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Config {
    slack_bot_token: String,
    slack_app_token: String,
    slack_signing_secret: String,
    lark_webhook_url: String,
    // Lark App credentials for bidirectional communication
    #[serde(default)]
    lark_app_id: String,
    #[serde(default)]
    lark_app_secret: String,
    // Slack User Token for sending as user
    #[serde(default)]
    slack_user_token: String,
    // Default Slack channel for Lark→Slack
    #[serde(default)]
    default_slack_channel: String,
    // Send as user instead of bot
    #[serde(default)]
    send_as_user: bool,
    // Slack OAuth credentials (for multi-user auth)
    #[serde(default)]
    slack_client_id: String,
    #[serde(default)]
    slack_client_secret: String,
    // Authenticated user info
    #[serde(default)]
    slack_user_name: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            slack_bot_token: String::new(),
            slack_app_token: String::new(),
            slack_signing_secret: String::new(),
            lark_webhook_url: String::new(),
            lark_app_id: String::new(),
            lark_app_secret: String::new(),
            slack_user_token: String::new(),
            default_slack_channel: String::new(),
            send_as_user: false,
            slack_client_id: String::new(),
            slack_client_secret: String::new(),
            slack_user_name: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeStatus {
    is_running: bool,
    slack_connected: bool,
    lark_connected: bool,
    message_stats: MessageStats,
    server_port: Option<u16>,
}

impl Default for BridgeStatus {
    fn default() -> Self {
        Self {
            is_running: false,
            slack_connected: false,
            lark_connected: false,
            message_stats: MessageStats::default(),
            server_port: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct MessageStats {
    slack_to_lark: u32,
    lark_to_slack: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LogEntry {
    level: String,
    message: String,
    timestamp: String,
}

struct AppState {
    config: Mutex<Config>,
    status: Mutex<BridgeStatus>,
    config_path: PathBuf,
    bridge_process: Mutex<Option<Child>>,
}

fn get_config_path() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("lark-slack-connector");
    fs::create_dir_all(&path).ok();
    path.push("config.json");
    path
}

fn load_config(path: &PathBuf) -> Config {
    if path.exists() {
        match fs::read_to_string(path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => Config::default(),
        }
    } else {
        Config::default()
    }
}

fn save_config_to_file(config: &Config, path: &PathBuf) -> Result<(), String> {
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn find_node_executable() -> Option<PathBuf> {
    // Try to find node in PATH
    if let Ok(path) = which::which("node") {
        return Some(path);
    }

    // Common locations on macOS
    let common_paths = [
        "/usr/local/bin/node",
        "/opt/homebrew/bin/node",
        "/usr/bin/node",
    ];

    for path in common_paths {
        let p = PathBuf::from(path);
        if p.exists() {
            return Some(p);
        }
    }

    None
}

fn find_npx_executable() -> Option<PathBuf> {
    if let Ok(path) = which::which("npx") {
        return Some(path);
    }

    let common_paths = [
        "/usr/local/bin/npx",
        "/opt/homebrew/bin/npx",
        "/usr/bin/npx",
    ];

    for path in common_paths {
        let p = PathBuf::from(path);
        if p.exists() {
            return Some(p);
        }
    }

    None
}

#[tauri::command]
fn get_config(state: State<AppState>) -> Config {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn save_config(config: Config, state: State<AppState>) -> Result<(), String> {
    save_config_to_file(&config, &state.config_path)?;
    *state.config.lock().unwrap() = config;
    Ok(())
}

#[tauri::command]
fn get_status(state: State<AppState>) -> BridgeStatus {
    state.status.lock().unwrap().clone()
}

#[tauri::command]
async fn start_bridge(app: AppHandle, state: State<'_, AppState>) -> Result<BridgeStatus, String> {
    // Check if already running
    {
        let process = state.bridge_process.lock().unwrap();
        if process.is_some() {
            return Err("ブリッジは既に実行中です".to_string());
        }
    }

    // Get config
    let config = state.config.lock().unwrap().clone();

    // Validate config
    if config.slack_bot_token.is_empty() {
        return Err("Slack Bot Tokenが設定されていません".to_string());
    }
    if config.slack_app_token.is_empty() {
        return Err("Slack App Tokenが設定されていません".to_string());
    }
    if config.lark_webhook_url.is_empty() {
        return Err("Lark Webhook URLが設定されていません".to_string());
    }

    // Find node
    let node_path = find_node_executable().ok_or("Node.js が見つかりません。Node.jsをインストールしてください。")?;

    // Find the local CLI script
    let exe_dir = std::env::current_exe()
        .map_err(|e| format!("実行ファイルパス取得エラー: {}", e))?
        .parent()
        .ok_or("親ディレクトリが見つかりません")?
        .to_path_buf();

    // Try to find the connector CLI in various locations
    let possible_paths = vec![
        // Development: relative to Tauri target dir
        exe_dir.join("../../../../lark-slack-connector/dist/cli/desktop.js"),
        exe_dir.join("../../../lark-slack-connector/dist/cli/desktop.js"),
        // Production: bundled with the app
        exe_dir.join("../Resources/cli/desktop.js"),
        // Monorepo structure
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../lark-slack-connector/dist/cli/desktop.js"),
    ];

    let cli_path = possible_paths
        .iter()
        .find(|p| p.exists())
        .cloned()
        .ok_or_else(|| {
            format!(
                "CLIスクリプトが見つかりません。lark-slack-connectorをビルドしてください。\n検索パス: {:?}",
                possible_paths
            )
        })?;

    // Create config JSON for the bridge process
    let bridge_config = serde_json::json!({
        "slackBotToken": config.slack_bot_token,
        "slackAppToken": config.slack_app_token,
        "slackSigningSecret": config.slack_signing_secret,
        "slackUserToken": config.slack_user_token,
        "larkWebhookUrl": config.lark_webhook_url,
        "larkAppId": config.lark_app_id,
        "larkAppSecret": config.lark_app_secret,
        "defaultSlackChannel": config.default_slack_channel,
        "sendAsUser": config.send_as_user,
        "serverPort": 3456
    });

    // Spawn the bridge process using node directly
    let mut child = Command::new(node_path)
        .arg(cli_path)
        .arg(format!("--config={}", bridge_config.to_string()))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("ブリッジプロセス起動エラー: {}", e))?;

    // Read stdout in a separate thread
    let stdout = child.stdout.take().ok_or("stdout取得エラー")?;
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                // Parse the line
                if line.starts_with("STATUS:") {
                    let json_str = &line[7..];
                    if let Ok(status_update) = serde_json::from_str::<serde_json::Value>(json_str) {
                        if let Some(data) = status_update.get("data") {
                            // Update status
                            if let Some(state) = app_handle.try_state::<AppState>() {
                                let mut status = state.status.lock().unwrap();
                                if let Some(is_running) = data.get("isRunning").and_then(|v| v.as_bool()) {
                                    status.is_running = is_running;
                                }
                                if let Some(slack_connected) = data.get("slackConnected").and_then(|v| v.as_bool()) {
                                    status.slack_connected = slack_connected;
                                }
                                if let Some(lark_connected) = data.get("larkConnected").and_then(|v| v.as_bool()) {
                                    status.lark_connected = lark_connected;
                                }
                                if let Some(stats) = data.get("messageStats") {
                                    if let Some(s2l) = stats.get("slackToLark").and_then(|v| v.as_u64()) {
                                        status.message_stats.slack_to_lark = s2l as u32;
                                    }
                                    if let Some(l2s) = stats.get("larkToSlack").and_then(|v| v.as_u64()) {
                                        status.message_stats.lark_to_slack = l2s as u32;
                                    }
                                }
                            }
                            // Emit status update event
                            let _ = app_handle.emit_all("bridge-status", data.clone());
                        }
                    }
                } else if line.starts_with("LOG:") {
                    let json_str = &line[4..];
                    if let Ok(log_entry) = serde_json::from_str::<LogEntry>(json_str) {
                        let _ = app_handle.emit_all("bridge-log", log_entry);
                    }
                } else if line.starts_with("ERROR:") {
                    let json_str = &line[6..];
                    if let Ok(error) = serde_json::from_str::<serde_json::Value>(json_str) {
                        let _ = app_handle.emit_all("bridge-error", error);
                    }
                } else if line.starts_with("READY:") {
                    let json_str = &line[6..];
                    if let Ok(ready) = serde_json::from_str::<serde_json::Value>(json_str) {
                        if let Some(port) = ready.get("port").and_then(|v| v.as_u64()) {
                            if let Some(state) = app_handle.try_state::<AppState>() {
                                let mut status = state.status.lock().unwrap();
                                status.server_port = Some(port as u16);
                            }
                        }
                        let _ = app_handle.emit_all("bridge-ready", ready);
                    }
                }
            }
        }
    });

    // Store the process handle
    *state.bridge_process.lock().unwrap() = Some(child);

    // Update initial status
    let mut status = state.status.lock().unwrap();
    status.is_running = true;

    Ok(status.clone())
}

#[tauri::command]
async fn stop_bridge(state: State<'_, AppState>) -> Result<BridgeStatus, String> {
    // Take the child process without holding the lock across await
    let child_opt = {
        let mut process_guard = state.bridge_process.lock().unwrap();
        process_guard.take()
    };

    if let Some(mut child) = child_opt {
        // Try graceful shutdown first via HTTP
        let client = reqwest::Client::new();
        let _ = client.post("http://127.0.0.1:3456/stop").send().await;

        // Give it a moment to shut down gracefully
        std::thread::sleep(std::time::Duration::from_millis(500));

        // Force kill if still running
        let _ = child.kill();
        let _ = child.wait();
    }

    // Update status
    let mut status = state.status.lock().unwrap();
    status.is_running = false;
    status.slack_connected = false;
    status.lark_connected = false;
    status.server_port = None;

    Ok(status.clone())
}

#[tauri::command]
async fn test_lark_webhook(url: String) -> Result<(), String> {
    if url.is_empty() {
        return Err("Webhook URLが空です".to_string());
    }

    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "msg_type": "text",
        "content": {
            "text": "🔗 Lark-Slack Connector テストメッセージ"
        }
    });

    let response = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("HTTP {}", response.status()))
    }
}

#[tauri::command]
fn check_node_installed() -> Result<String, String> {
    if let Some(path) = find_node_executable() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Err("Node.jsがインストールされていません".to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SlackOAuthResponse {
    ok: bool,
    access_token: Option<String>,
    authed_user: Option<AuthedUser>,
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthedUser {
    id: String,
    access_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SlackUserInfo {
    ok: bool,
    user: Option<SlackUser>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SlackUser {
    id: String,
    name: String,
    real_name: Option<String>,
}

// OAuth Worker URL - Cloudflare Worker that handles OAuth callbacks
// This can be overridden at build time via environment variable
const DEFAULT_OAUTH_WORKER_URL: &str = "https://lark-slack-oauth.plark-droid.workers.dev";
const EMBEDDED_OAUTH_WORKER_URL: Option<&str> = option_env!("OAUTH_WORKER_URL");

fn get_oauth_worker_url() -> String {
    EMBEDDED_OAUTH_WORKER_URL
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| DEFAULT_OAUTH_WORKER_URL.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct OAuthRetrieveResponse {
    code: Option<String>,
    error: Option<String>,
}

/// Check OAuth Worker status
#[tauri::command]
async fn check_oauth_worker_status() -> Result<String, String> {
    let worker_url = get_oauth_worker_url();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(format!("{}/health", worker_url))
        .send()
        .await
        .map_err(|_| "OAuth Workerに接続できません".to_string())?;

    if response.status().is_success() {
        Ok(worker_url)
    } else {
        Err("OAuth Workerが応答しません".to_string())
    }
}

// Embedded Slack OAuth credentials (set at build time via environment variables)
// These are for the LarkInfo Slack App
const EMBEDDED_CLIENT_ID: Option<&str> = option_env!("SLACK_CLIENT_ID");
const EMBEDDED_CLIENT_SECRET: Option<&str> = option_env!("SLACK_CLIENT_SECRET");

fn get_oauth_credentials(config: &Config) -> (String, String) {
    // Priority: embedded (build-time) > config file
    let client_id = EMBEDDED_CLIENT_ID
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| config.slack_client_id.clone());

    let client_secret = EMBEDDED_CLIENT_SECRET
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| config.slack_client_secret.clone());

    (client_id, client_secret)
}

/// Check if OAuth credentials are configured
#[tauri::command]
fn has_oauth_credentials(state: State<AppState>) -> bool {
    let config = state.config.lock().unwrap();
    let (client_id, client_secret) = get_oauth_credentials(&config);
    !client_id.is_empty() && !client_secret.is_empty()
}

/// Start Slack OAuth flow - opens browser for user authorization
#[tauri::command]
async fn start_slack_oauth(state: State<'_, AppState>) -> Result<String, String> {
    let config = state.config.lock().unwrap().clone();
    let (client_id, _) = get_oauth_credentials(&config);

    if client_id.is_empty() {
        return Err("Slack認証情報が設定されていません。管理者に連絡してください。".to_string());
    }

    // Get OAuth Worker URL
    let worker_url = get_oauth_worker_url();
    let redirect_uri = format!("{}/oauth/callback", worker_url);

    // Generate state token for security (prevents CSRF)
    let state_token = uuid::Uuid::new_v4().to_string();

    // Build OAuth URL with user scopes
    let oauth_url = format!(
        "https://slack.com/oauth/v2/authorize?client_id={}&user_scope=chat:write&redirect_uri={}&state={}",
        client_id,
        urlencoding::encode(&redirect_uri),
        state_token
    );

    // Open browser
    if let Err(e) = open::that(&oauth_url) {
        return Err(format!("ブラウザを開けませんでした: {}", e));
    }

    // Return state token and redirect_uri for polling
    Ok(format!("{}|{}", state_token, redirect_uri))
}

/// Wait for OAuth callback and exchange code for token
/// Polls the OAuth Worker to retrieve the authorization code
#[tauri::command]
async fn complete_slack_oauth(
    state_token: String,
    redirect_uri: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let config = state.config.lock().unwrap().clone();
    let worker_url = get_oauth_worker_url();
    let retrieve_url = format!("{}/oauth/retrieve?state={}", worker_url, state_token);

    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Poll the worker for up to 120 seconds (2 minutes)
    let mut code: Option<String> = None;
    for _ in 0..120 {
        let response = http_client.get(&retrieve_url).send().await;

        match response {
            Ok(resp) => {
                if resp.status().is_success() {
                    let retrieve_response: OAuthRetrieveResponse = resp
                        .json()
                        .await
                        .map_err(|e| format!("レスポンス解析エラー: {}", e))?;

                    if let Some(c) = retrieve_response.code {
                        code = Some(c);
                        break;
                    }
                }
                // 404 means code not yet available, continue polling
            }
            Err(_) => {
                // Network error, continue polling
            }
        }

        // Wait 1 second before next poll
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }

    let code = code.ok_or("認証がタイムアウトしました。再度お試しください。")?;

    // Exchange the code for an access token
    let (client_id, client_secret) = get_oauth_credentials(&config);
    let http_client = reqwest::Client::new();
    let response = http_client
        .post("https://slack.com/api/oauth.v2.access")
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", code.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
        ])
        .send()
        .await
        .map_err(|e| format!("トークン取得エラー: {}", e))?;

    let oauth_response: SlackOAuthResponse = response
        .json()
        .await
        .map_err(|e| format!("レスポンス解析エラー: {}", e))?;

    if !oauth_response.ok {
        return Err(format!(
            "Slack認証エラー: {}",
            oauth_response.error.unwrap_or_else(|| "不明なエラー".to_string())
        ));
    }

    // Get the user token from authed_user
    let user_token = oauth_response
        .authed_user
        .and_then(|u| u.access_token)
        .ok_or("ユーザートークンが取得できませんでした")?;

    // Get user info to display the name
    let user_info_response = http_client
        .get("https://slack.com/api/users.identity")
        .header("Authorization", format!("Bearer {}", user_token))
        .send()
        .await
        .ok();

    let user_name = if let Some(resp) = user_info_response {
        #[derive(Deserialize)]
        struct IdentityResponse {
            ok: bool,
            user: Option<IdentityUser>,
        }
        #[derive(Deserialize)]
        struct IdentityUser {
            name: String,
        }

        resp.json::<IdentityResponse>()
            .await
            .ok()
            .and_then(|r| if r.ok { r.user.map(|u| u.name) } else { None })
            .unwrap_or_else(|| "認証済みユーザー".to_string())
    } else {
        "認証済みユーザー".to_string()
    };

    // Update config with the new token
    {
        let mut config = state.config.lock().unwrap();
        config.slack_user_token = user_token.clone();
        config.slack_user_name = user_name.clone();
        config.send_as_user = true;

        // Save config
        if let Err(e) = save_config_to_file(&config, &state.config_path) {
            eprintln!("設定保存エラー: {}", e);
        }
    }

    // Emit event to update UI
    let _ = app.emit_all("slack-oauth-complete", serde_json::json!({
        "userName": user_name,
        "success": true
    }));

    Ok(user_name)
}

fn main() {
    let config_path = get_config_path();
    let config = load_config(&config_path);

    tauri::Builder::default()
        .manage(AppState {
            config: Mutex::new(config),
            status: Mutex::new(BridgeStatus::default()),
            config_path,
            bridge_process: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            get_status,
            start_bridge,
            stop_bridge,
            test_lark_webhook,
            check_node_installed,
            has_oauth_credentials,
            check_oauth_worker_status,
            start_slack_oauth,
            complete_slack_oauth,
        ])
        .on_window_event(|event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                // Clean up bridge process when window is closed
                if let Some(state) = event.window().try_state::<AppState>() {
                    if let Some(mut child) = state.bridge_process.lock().unwrap().take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
