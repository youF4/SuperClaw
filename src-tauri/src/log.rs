use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::SystemTime;

static LOG_FILE: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn init() {
    let path = dirs().join("SuperClaw.log");
    if let Ok(mut f) = create_dir_all(dirs()).and_then(|_| {
        OpenOptions::new().create(true).append(true).open(&path)
    }) {
        let _ = writeln!(f, "--- SuperClaw {} ---", env!("CARGO_PKG_VERSION"));
    }
    *LOG_FILE.lock().unwrap() = Some(path);
}

pub fn info(msg: &str) {
    writeln_log("INFO", msg);
}

pub fn error(msg: &str) {
    writeln_log("ERROR", msg);
}

fn dirs() -> PathBuf {
    std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("SuperClaw")
        .join("logs")
}

fn writeln_log(level: &str, msg: &str) {
    let ts = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let line = format!("[{}] [{}] {}\n", ts, level, msg);
    if let Ok(guard) = LOG_FILE.lock() {
        if let Some(ref path) = *guard {
            let _ = OpenOptions::new().create(true).append(true).open(path)
                .and_then(|mut f| f.write_all(line.as_bytes()));
        }
    }
}
