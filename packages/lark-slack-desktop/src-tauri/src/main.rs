// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct Config {
    slack_bot_token: String,
    slack_signing_secret: String,
    slack_app_token: String,
    lark_webhook_url: String,
    auto_start: bool,
    include_channels: String,
    exclude_channels: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct BridgeStatus {
    is_running: bool,
    slack_connected: bool,
    lark_connected: bool,
    message_stats: MessageStats,
    uptime: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct MessageStats {
    slack_to_lark: u32,
    lark_to_slack: u32,
    errors: u32,
}

struct AppState {
    config: Mutex<Config>,
    status: Mutex<BridgeStatus>,
}

#[tauri::command]
fn get_config(state: tauri::State<AppState>) -> Config {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn save_config(config: Config, state: tauri::State<AppState>) -> Result<(), String> {
    *state.config.lock().unwrap() = config;
    Ok(())
}

#[tauri::command]
fn get_status(state: tauri::State<AppState>) -> BridgeStatus {
    state.status.lock().unwrap().clone()
}

#[tauri::command]
async fn start_bridge(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut status = state.status.lock().unwrap();
    status.is_running = true;
    status.slack_connected = true;
    status.lark_connected = true;
    Ok(())
}

#[tauri::command]
async fn stop_bridge(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut status = state.status.lock().unwrap();
    status.is_running = false;
    status.slack_connected = false;
    status.lark_connected = false;
    Ok(())
}

#[tauri::command]
async fn test_lark_webhook(url: String) -> Result<(), String> {
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
    tauri::Builder::default()
        .manage(AppState {
            config: Mutex::new(Config::default()),
            status: Mutex::new(BridgeStatus::default()),
        })
        .setup(|app| {
            // Ensure window is visible on startup
            if let Some(window) = app.get_window("main") {
                println!("Window found, showing...");
                let _ = window.show();
                let _ = window.set_focus();
            } else {
                println!("Window 'main' not found!");
            }
            Ok(())
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
