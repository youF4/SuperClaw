// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod gateway;
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
    // 初始化日志
    println!("[SuperClaw] Starting application...");
    
    // 检查 WebView2
    #[cfg(target_os = "windows")]
    {
        println!("[SuperClaw] Checking WebView2...");
    }
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            println!("[SuperClaw] Setup phase...");
            
            // 设置系统托盘
            tray::setup_tray(app)?;
            
            // 自动启动 Gateway
            println!("[SuperClaw] Auto-starting Gateway...");
            tauri::async_runtime::spawn(async move {
                // 直接调用 gateway 模块的函数，而不是 Tauri command
                match gateway::start_gateway().await {
                    Ok(msg) => println!("[SuperClaw] Gateway started: {}", msg),
                    Err(e) => eprintln!("[SuperClaw] Failed to start gateway: {}", e),
                }
            });
            
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
