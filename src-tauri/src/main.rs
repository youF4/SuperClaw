// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod gateway;
mod log;
mod tray;

#[tauri::command]
async fn start_gateway() -> Result<String, String> {
    gateway::start_gateway().await
}

#[tauri::command]
async fn stop_gateway() -> Result<(), String> {
    gateway::stop_gateway().await
}

#[tauri::command]
async fn gateway_status() -> Result<bool, String> {
    gateway::is_running().await
}

#[tauri::command]
fn get_file_metadata(path: String) -> Result<u64, String> {
    std::fs::metadata(&path)
        .map(|m| m.len())
        .map_err(|e| format!("Failed to get file metadata: {}", e))
}

fn main() {
    log::init();
    log::info("Starting application...");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        // 未配置 Tauri 更新机制，暂不启用 updater 插件
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            log::info("Setup phase...");
            tray::setup_tray(app).map_err(|e| {
                log::error(&format!("Tray setup failed: {}", e));
                e
            })?;
            log::info("Auto-starting Gateway...");
            tauri::async_runtime::spawn(async move {
                match gateway::start_gateway().await {
                    Ok(msg) => log::info(&format!("Gateway started: {}", msg)),
                    Err(e) => log::error(&format!("Failed to start gateway: {}", e)),
                }
            });
            log::info("Setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_gateway,
            stop_gateway,
            gateway_status,
            get_file_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
