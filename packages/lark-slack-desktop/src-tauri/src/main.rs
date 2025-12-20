// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Config {
    slack_bot_token: String,
    slack_app_token: String,
    lark_webhook_url: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            slack_bot_token: String::new(),
            slack_app_token: String::new(),
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
}

impl Default for BridgeStatus {
    fn default() -> Self {
        Self {
            is_running: false,
            slack_connected: false,
            lark_connected: false,
            message_stats: MessageStats::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct MessageStats {
    slack_to_lark: u32,
    lark_to_slack: u32,
}

struct AppState {
    config: Mutex<Config>,
    status: Mutex<BridgeStatus>,
    config_path: PathBuf,
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

#[tauri::command]
fn get_config(state: tauri::State<AppState>) -> Config {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn save_config(config: Config, state: tauri::State<AppState>) -> Result<(), String> {
    save_config_to_file(&config, &state.config_path)?;
    *state.config.lock().unwrap() = config;
    Ok(())
}

#[tauri::command]
fn get_status(state: tauri::State<AppState>) -> BridgeStatus {
    state.status.lock().unwrap().clone()
}

#[tauri::command]
fn start_bridge(state: tauri::State<AppState>) -> Result<BridgeStatus, String> {
    let mut status = state.status.lock().unwrap();
    status.is_running = true;
    status.slack_connected = true;
    status.lark_connected = true;
    Ok(status.clone())
}

#[tauri::command]
fn stop_bridge(state: tauri::State<AppState>) -> Result<BridgeStatus, String> {
    let mut status = state.status.lock().unwrap();
    status.is_running = false;
    status.slack_connected = false;
    status.lark_connected = false;
    Ok(status.clone())
}

#[tauri::command]
async fn test_lark_webhook(url: String) -> Result<(), String> {
    if url.is_empty() {
        return Err("Webhook URL is empty".to_string());
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

fn main() {
    let config_path = get_config_path();
    let config = load_config(&config_path);

    tauri::Builder::default()
        .manage(AppState {
            config: Mutex::new(config),
            status: Mutex::new(BridgeStatus::default()),
            config_path,
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            get_status,
            start_bridge,
            stop_bridge,
            test_lark_webhook,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
