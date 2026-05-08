/**
 * 日志系统
 * 
 * 使用 electron-log 实现日志记录和文件持久化
 */

import log from 'electron-log'
import { app } from 'electron'
import path from 'path'

// 配置日志
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// 日志文件路径
// Windows: %USERPROFILE%\AppData\Roaming\SuperClaw\logs\
// macOS: ~/Library/Logs/SuperClaw/
// Linux: ~/.config/SuperClaw/logs/
const logPath = app.getPath('logs')
log.transports.file.resolvePath = () => path.join(logPath, 'main.log')

// 日志格式
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}'

// 日志文件大小限制（10MB）
log.transports.file.maxSize = 10 * 1024 * 1024

// 日志文件数量限制
log.transports.file.archiveLog = (file) => {
  const info = path.parse(file)
  const date = new Date()
  const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  return path.join(info.dir, `${info.name}-${dateString}${info.ext}`)
}

/**
 * 日志管理器
 */
export class Logger {
  private static context: string

  static setContext(context: string) {
    this.context = context
  }

  static debug(message: string, ...args: any[]) {
    log.debug(`[${this.context}] ${message}`, ...args)
  }

  static info(message: string, ...args: any[]) {
    log.info(`[${this.context}] ${message}`, ...args)
  }

  static warn(message: string, ...args: any[]) {
    log.warn(`[${this.context}] ${message}`, ...args)
  }

  static error(message: string, error?: Error | unknown) {
    if (error instanceof Error) {
      log.error(`[${this.context}] ${message}`, {
        message: error.message,
        stack: error.stack
      })
    } else {
      log.error(`[${this.context}] ${message}`, error)
    }
  }
}

// 创建便捷方法
export const createLogger = (context: string) => {
  Logger.setContext(context)
  return {
    debug: Logger.debug.bind(Logger),
    info: Logger.info.bind(Logger),
    warn: Logger.warn.bind(Logger),
    error: Logger.error.bind(Logger)
  }
}

export default log
