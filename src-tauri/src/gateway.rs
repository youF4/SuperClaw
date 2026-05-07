use std::process::{Child, Command, ExitStatus};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Mutex;
use std::path::PathBuf;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::sleep;

static GATEWAY_PROCESS: Mutex<Option<Child>> = Mutex::new(None);
static GATEWAY_RUNNING: AtomicBool = AtomicBool::new(false);
static GATEWAY_PID: AtomicU32 = AtomicU32::new(0);

/// 获取 Node.js 可执行文件路径
fn get_node_path() -> PathBuf {
    // 获取应用目录
    let exe_dir = std::env::current_exe()
        .expect("Failed to get current exe path")
        .parent()
        .expect("Failed to get parent directory")
        .to_path_buf();
    
    // 开发模式：检查 openclaw-dist 目录
    let dev_path = exe_dir.join("..").join("openclaw-dist").join("node.exe");
    if dev_path.exists() {
        return dev_path;
    }
    
    // 生产模式：使用应用目录内的 node
    exe_dir.join("openclaw").join("node.exe")
}

/// 获取 OpenClaw 入口文件路径
fn get_openclaw_entry() -> PathBuf {
    // 获取应用目录
    let exe_dir = std::env::current_exe()
        .expect("Failed to get current exe path")
        .parent()
        .expect("Failed to get parent directory")
        .to_path_buf();
    
    // 开发模式：检查 openclaw-dist 目录
    let dev_path = exe_dir.join("..").join("openclaw-dist").join("openclaw.mjs");
    if dev_path.exists() {
        return dev_path;
    }
    
    // 生产模式：使用应用目录内的 openclaw.mjs
    exe_dir.join("openclaw").join("openclaw.mjs")
}

/// 获取 OpenClaw 工作目录
fn get_openclaw_cwd() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .expect("Failed to get current exe path")
        .parent()
        .expect("Failed to get parent directory")
        .to_path_buf();
    
    // 开发模式
    let dev_cwd = exe_dir.join("..").join("openclaw-dist");
    if dev_cwd.exists() {
        return dev_cwd;
    }
    
    // 生产模式
    exe_dir.join("openclaw")
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
    
    println!("[SuperClaw] Starting OpenClaw Gateway...");
    println!("[SuperClaw] Node path: {:?}", node_path);
    println!("[SuperClaw] Entry path: {:?}", entry_path);
    println!("[SuperClaw] Working directory: {:?}", cwd);
    
    let child = Command::new(&node_path)
        .arg(&entry_path)
        .arg("gateway")
        .arg("start")
        .arg("--port")
        .arg("22333")
        .current_dir(&cwd)
        .spawn()
        .map_err(|e| format!("Failed to start gateway: {} (node: {:?})", e, node_path))?;

    let pid = child.id();
    
    // 在锁内设置所有状态，保证一致性
    {
        let mut process = GATEWAY_PROCESS.lock().map_err(|e| format!("Lock error: {}", e))?;
        *process = Some(child);
    }
    
    GATEWAY_PID.store(pid, Ordering::SeqCst);
    GATEWAY_RUNNING.store(true, Ordering::SeqCst);

    // 健康检查：轮询端口是否可连接
    println!("[SuperClaw] Waiting for Gateway to be ready...");
    let mut connected = false;
    for i in 0..20 {
        sleep(Duration::from_millis(500)).await;
        match TcpStream::connect("127.0.0.1:22333").await {
            Ok(_) => {
                connected = true;
                println!("[SuperClaw] Gateway is ready after {} attempts", i + 1);
                break;
            }
            Err(_) => {
                if i == 19 {
                    println!("[SuperClaw] Gateway failed to start within timeout");
                }
            }
        }
    }

    if !connected {
        // 健康检查失败，停止进程并返回错误
        let _ = stop_gateway().await;
        return Err("Gateway failed to start: port 22333 is not responding after 10 seconds".to_string());
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
        println!("[SuperClaw] Stopping Gateway (PID: {})...", pid);
        
        // 先发送终止信号
        child.kill().ok();
        
        // 在 blocking 线程中等待进程退出，避免僵尸进程
        let result = tokio::task::spawn_blocking(move || -> Result<ExitStatus, String> {
            // 等待进程退出，超时 5 秒
            for _ in 0..50 {
                std::thread::sleep(Duration::from_millis(100));
                match child.try_wait() {
                    Ok(Some(status)) => return Ok(status),
                    Ok(None) => continue,
                    Err(e) => return Err(format!("Failed to wait for gateway: {}", e)),
                }
            }
            // 超时后强制等待（阻塞直到退出）
            println!("[SuperClaw] Force waiting for Gateway to exit...");
            child.wait().map_err(|e| format!("Failed to wait for gateway: {}", e))
        })
        .await
        .map_err(|e| format!("Spawn blocking error: {}", e))?
        .map_err(|e| e)?;
        
        println!("[SuperClaw] Gateway stopped (exit: {:?})", result);
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
