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
}

impl Default for Config {
    fn default() -> Self {
        Self {
            slack_bot_token: String::new(),
            slack_app_token: String::new(),
            slack_signing_secret: String::new(),
            lark_webhook_url: String::new(),
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

    // Find npx
    let npx_path = find_npx_executable().ok_or("Node.js (npx) が見つかりません。Node.jsをインストールしてください。")?;

    // Create config JSON for the bridge process
    let bridge_config = serde_json::json!({
        "slackBotToken": config.slack_bot_token,
        "slackAppToken": config.slack_app_token,
        "slackSigningSecret": config.slack_signing_secret,
        "larkWebhookUrl": config.lark_webhook_url,
        "serverPort": 3456
    });

    // Spawn the bridge process
    let mut child = Command::new(npx_path)
        .arg("lark-slack-desktop")
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
    let mut process_guard = state.bridge_process.lock().unwrap();

    if let Some(mut child) = process_guard.take() {
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
