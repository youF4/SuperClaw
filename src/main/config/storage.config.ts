/**
 * 存储配置
 * 
 * 声明式地定义存储行为
 */

import { join } from 'path'
import { app } from 'electron'

/**
 * 存储配置定义
 */
export const storageConfig = {
  /**
   * 缓存存储
   */
  cache: {
    name: 'cache',
    path: join(app.getPath('userData'), 'cache.json'),
    
    defaults: {
      sessions: {},
      messages: {},
      lastSyncAt: {},
      currentSessionKey: null
    },
    
    limits: {
      maxSize: 100 * 1024 * 1024, // 100MB
      maxSessions: 50,
      maxMessagesPerSession: 1000
    }
  },

  /**
   * 配置存储
   */
  config: {
    name: 'config',
    path: join(app.getPath('userData'), 'config.json'),
    
    defaults: {
      theme: 'system',
      language: 'zh-CN',
      gateway: {
        host: '127.0.0.1',
        port: 18789,
        autoStart: true
      },
      window: {
        width: 1200,
        height: 800,
        isMaximized: false
      },
      notifications: {
        enabled: true,
        sound: true
      }
    }
  },

  /**
   * 日志存储
   */
  logs: {
    path: app.getPath('logs'),
    
    rotation: {
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    },
    
    levels: {
      file: 'info',
      console: 'debug'
    }
  },

  /**
   * 缓存清理策略
   */
  cleanup: {
    // 保留最近 N 个会话
    keepRecentSessions: 10,
    // 会话超时时间（毫秒）
    sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30 天
    // 定期清理间隔（毫秒）
    cleanupInterval: 24 * 60 * 60 * 1000 // 1 天
  }
} as const

/**
 * 存储配置类型
 */
export type StorageConfig = typeof storageConfig
