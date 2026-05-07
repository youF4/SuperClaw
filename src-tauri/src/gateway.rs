use std::process::{Child, Command, ExitStatus, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Mutex;
use std::path::PathBuf;
use std::time::Duration;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tokio::net::TcpStream;
use tokio::time::sleep;

use crate::log;

const CREATE_NO_WINDOW: u32 = 0x08000000;

static GATEWAY_PROCESS: Mutex<Option<Child>> = Mutex::new(None);
static GATEWAY_RUNNING: AtomicBool = AtomicBool::new(false);
static GATEWAY_PID: AtomicU32 = AtomicU32::new(0);

/// 获取 OpenClaw 运行时所在的目录
///
/// 开发模式：exe 在 src-tauri/target/debug/ 或 target/release/ 中，
/// openclaw-dist/ 在项目根目录。回退向上查找 2~3 级。
/// 生产模式：tauri.conf.json 将 ../openclaw-dist 映射为 bundle 中的 openclaw/。
fn get_openclaw_base_dir() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .expect("Failed to get current exe path")
        .parent()
        .expect("Failed to get parent directory")
        .to_path_buf();

    // 开发模式：向上查找项目根目录的 openclaw-dist/
    // exe 层次: WORKSPACE/src-tauri/target/debug/SuperClaw.exe
    let dev_candidates = [
        // target/debug/ → workspace/
        exe_dir.join("..").join("..").join("..").join("openclaw-dist"),
        // target/release/ → workspace/
        exe_dir.join("..").join("..").join("openclaw-dist"),
        // 某些调试场景
        exe_dir.join("..").join("openclaw-dist"),
        // 当前目录
        exe_dir.join("openclaw-dist"),
    ];
    let check_dev = |p: &PathBuf| p.join("node.exe").exists() || p.join("openclaw.mjs").exists();
    for candidate in &dev_candidates {
        if check_dev(candidate) {
            return candidate.clone();
        }
    }

    // 生产模式：资源在 exe 同级 openclaw/ 目录下
    exe_dir.join("openclaw")
}

/// 获取 Node.js 可执行文件路径
fn get_node_path() -> PathBuf {
    get_openclaw_base_dir().join("node.exe")
}

/// 获取 OpenClaw 入口文件路径
fn get_openclaw_entry() -> PathBuf {
    get_openclaw_base_dir().join("openclaw.mjs")
}

/// 获取 OpenClaw 工作目录
fn get_openclaw_cwd() -> PathBuf {
    get_openclaw_base_dir()
}

/// 获取 OpenClaw 数据目录（独立于本地 OpenClaw 安装）
///
/// 开发模式：项目根目录 data/openclaw/
/// 生产模式：%APPDATA%/SuperClaw/data/openclaw/（避免写入 Program Files）
fn get_openclaw_data_dir() -> PathBuf {
    // 开发模式检测：如果 openclaw-dist 在项目根目录旁，使用本地 data/
    let exe_dir = std::env::current_exe()
        .expect("Failed to get current exe path")
        .parent()
        .expect("Failed to get parent directory")
        .to_path_buf();
    let dev_candidates = [
        exe_dir.join("..").join("..").join("..").join("openclaw-dist"),
        exe_dir.join("..").join("..").join("openclaw-dist"),
        exe_dir.join("..").join("openclaw-dist"),
        exe_dir.join("openclaw-dist"),
    ];
    let check_dev = |p: &PathBuf| p.join("node.exe").exists() || p.join("openclaw.mjs").exists();
    for candidate in &dev_candidates {
        if check_dev(candidate) {
            // 开发模式：数据存放在项目根目录的 data/openclaw
            let mut dev_data = candidate.clone();
            dev_data.pop(); // 去掉 openclaw-dist
            dev_data.push("data");
            dev_data.push("openclaw");
            return dev_data;
        }
    }

    // 生产模式：使用 %APPDATA%/SuperClaw/data/openclaw
    let app_data = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| exe_dir);
    app_data.join("SuperClaw").join("data").join("openclaw")
}

/// 启动 OpenClaw Gateway
pub async fn start_gateway() -> Result<String, String> {
    // 在锁内检查运行状态，避免竞态条件
    {
        let mut process = GATEWAY_PROCESS.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        // 双重检查：先检查原子标志，再检查进程是否存活
        if GATEWAY_RUNNING.load(Ordering::SeqCst) {
            // 验证进程是否真的活着
            if let Some(child) = process.as_mut() {
                match child.try_wait() {
                    Ok(Some(_)) => {
                        // 进程已退出，清理状态
                        *process = None;
                        GATEWAY_RUNNING.store(false, Ordering::SeqCst);
                        GATEWAY_PID.store(0, Ordering::SeqCst);
                    }
                    Ok(None) => {
                        // 进程仍在运行
                        return Ok("Gateway already running".to_string());
                    }
                    Err(_) => {
                        // try_wait 出错，重置状态
                        *process = None;
                        GATEWAY_RUNNING.store(false, Ordering::SeqCst);
                        GATEWAY_PID.store(0, Ordering::SeqCst);
                    }
                }
            } else {
                // 有标志但无进程记录，可能是崩溃后没清理
                GATEWAY_RUNNING.store(false, Ordering::SeqCst);
                GATEWAY_PID.store(0, Ordering::SeqCst);
            }
        }
    }

    let node_path = get_node_path();
    let entry_path = get_openclaw_entry();
    let cwd = get_openclaw_cwd();
    
    let data_dir = get_openclaw_data_dir();
    
    log::info(&format!("Starting OpenClaw Gateway..."));
    log::info(&format!("Node path: {:?}", node_path));
    log::info(&format!("Entry path: {:?}", entry_path));
    log::info(&format!("Working directory: {:?}", cwd));
    log::info(&format!("Data directory: {:?}", data_dir));
    
    // 确保数据目录存在
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {}", e))?;

    let data_dir_str = data_dir.to_str().ok_or("Invalid data directory path")?.to_string();
    let mut cmd = Command::new(&node_path);
    cmd
        .arg(&entry_path)
        .arg("gateway")
        .arg("--allow-unconfigured")
        .arg("--port")
        .arg("22333")
        .current_dir(&cwd)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .env("OPENCLAW_STATE_DIR", &data_dir_str);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let child = cmd.spawn()
        .map_err(|e| format!("Failed to start gateway: {} (node: {:?})", e, node_path))?;

    let pid = child.id();
    
    // 在锁内设置所有状态，保证一致性
    {
        let mut process = GATEWAY_PROCESS.lock().map_err(|e| format!("Lock error: {}", e))?;
        *process = Some(child);
    }
    
    GATEWAY_PID.store(pid, Ordering::SeqCst);
    GATEWAY_RUNNING.store(true, Ordering::SeqCst);

    // 健康检查：轮询端口是否可连接（最多等 30 秒，首次启动可能需要安装依赖）
    log::info("Waiting for Gateway to be ready...");
    let mut connected = false;
    for i in 0..60 {
        sleep(Duration::from_millis(500)).await;
        match TcpStream::connect("127.0.0.1:22333").await {
            Ok(_) => {
                connected = true;
                log::info(&format!("Gateway is ready after {} attempts", i + 1));
                break;
            }
            Err(_) => {
                if i == 59 {
                    log::error("Gateway failed to start within timeout");
                }
            }
        }
    }

    if !connected {
        let _ = stop_gateway().await;
        return Err("Gateway failed to start: port 22333 is not responding after 30 seconds".to_string());
    }

    Ok(format!("Gateway started with PID: {}", pid))
}

/// 停止 OpenClaw Gateway
pub async fn stop_gateway() -> Result<(), String> {
    // 在单独的块中获取并释放 MutexGuard，避免跨 await 持有非 Send 的 guard
    let child = {
        let mut process = GATEWAY_PROCESS.lock().map_err(|e| format!("Lock error: {}", e))?;
        process.take()
    };
    
    if let Some(mut child) = child {
        let pid = child.id();
        log::info(&format!("Stopping Gateway (PID: {})...", pid));
        child.kill().ok();
        let result = tokio::task::spawn_blocking(move || -> Result<ExitStatus, String> {
            for _ in 0..50 {
                std::thread::sleep(Duration::from_millis(100));
                match child.try_wait() {
                    Ok(Some(status)) => return Ok(status),
                    Ok(None) => continue,
                    Err(e) => return Err(format!("Failed to wait for gateway: {}", e)),
                }
            }
            log::info("Force waiting for Gateway to exit...");
            child.wait().map_err(|e| format!("Failed to wait for gateway: {}", e))
        })
        .await
        .map_err(|e| format!("Spawn blocking error: {}", e))?
        .map_err(|e| e)?;
        log::info(&format!("Gateway stopped (exit: {:?})", result));
    }

    GATEWAY_RUNNING.store(false, Ordering::SeqCst);
    GATEWAY_PID.store(0, Ordering::SeqCst);

    Ok(())
}

/// 检查 Gateway 是否运行
pub async fn is_running() -> Result<bool, String> {
    // 先检查原子标志
    if !GATEWAY_RUNNING.load(Ordering::SeqCst) {
        return Ok(false);
    }
    
    // 再验证实际进程是否存活（在独立块中释放锁，避免 Send 问题）
    let process_alive = {
        let mut process = GATEWAY_PROCESS.lock().map_err(|e| format!("Lock error: {}", e))?;
        match process.as_mut() {
            Some(child) => match child.try_wait() {
                Ok(Some(_)) => false,
                Ok(None) => true,
                Err(_) => false,
            },
            None => false,
        }
    };
    
    Ok(process_alive)
}

/// 获取 Gateway PID
#[allow(dead_code)]
pub fn get_pid() -> u32 {
    GATEWAY_PID.load(Ordering::SeqCst)
}
