use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

use crate::gateway;

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let quit = MenuItem::new(app, "退出", true, None::<&str>)?;
    let show = MenuItem::new(app, "显示窗口", true, None::<&str>)?;
    let start = MenuItem::new(app, "启动 Gateway", true, None::<&str>)?;
    let stop = MenuItem::new(app, "停止 Gateway", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show, &start, &stop, &quit])?;

    // TODO: 动态更新菜单项状态（禁用"启动"当 Gateway 运行中，禁用"停止"当未运行）
    // 当前 Tauri 2.0 需要保存 Menu 句柄来动态修改菜单项
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            "start" => {
                tauri::async_runtime::spawn(async move {
                    match gateway::start_gateway().await {
                        Ok(msg) => println!("[Tray] {}", msg),
                        Err(e) => eprintln!("[Tray] Failed to start gateway: {}", e),
                    }
                });
            }
            "stop" => {
                tauri::async_runtime::spawn(async move {
                    match gateway::stop_gateway().await {
                        Ok(()) => println!("[Tray] Gateway stopped"),
                        Err(e) => eprintln!("[Tray] Failed to stop gateway: {}", e),
                    }
                });
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
