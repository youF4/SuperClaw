/**
 * 本地持久化存储
 * 
 * 使用 electron-store 实现配置和缓存的本地持久化
 */

import Store from 'electron-store'
import type { BrowserWindow } from 'electron'

// 消息类型
export interface CachedMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
  attachments?: Array<{
    type: string
    name: string
    url: string
  }>
}

// 会话类型
export interface CachedSession {
  key: string
  agentId?: string
  createdAt: number
  lastMessageAt?: number
  messageCount: number
  title?: string
}

// 缓存存储结构
interface CacheSchema {
  // 会话列表
  sessions: Record<string, CachedSession>
  // 消息记录 key: sessionKey
  messages: Record<string, CachedMessage[]>
  // 最后同步时间 key: sessionKey
  lastSyncAt: Record<string, number>
  // 当前会话
  currentSessionKey: string | null
}

// 配置存储结构
interface ConfigSchema {
  // 主题
  theme: 'light' | 'dark' | 'system'
  // 语言
  language: string
  // Gateway 配置
  gateway: {
    host: string
    port: number
    autoStart: boolean
  }
  // 窗口状态
  window: {
    width: number
    height: number
    x?: number
    y?: number
    isMaximized: boolean
  }
  // 通知设置
  notifications: {
    enabled: boolean
    sound: boolean
  }
  // 最后检查更新时间
  lastCheckUpdateAt: number
}

// 创建缓存存储
export const cacheStore = new Store<CacheSchema>({
  name: 'cache',
  defaults: {
    sessions: {},
    messages: {},
    lastSyncAt: {},
    currentSessionKey: null
  }
})

// 创建配置存储
export const configStore = new Store<ConfigSchema>({
  name: 'config',
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
    },
    lastCheckUpdateAt: 0
  }
})

/**
 * 缓存管理器
 */
export class CacheManager {
  /**
   * 获取会话列表
   */
  static getSessions(): CachedSession[] {
    const sessions = cacheStore.get('sessions')
    return Object.values(sessions).sort((a, b) => 
      (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt)
    )
  }

  /**
   * 保存会话
   */
  static saveSession(session: CachedSession) {
    cacheStore.set(`sessions.${session.key}`, session)
  }

  /**
   * 删除会话
   */
  static deleteSession(sessionKey: string) {
    cacheStore.delete(`sessions.${sessionKey}`)
    cacheStore.delete(`messages.${sessionKey}`)
    cacheStore.delete(`lastSyncAt.${sessionKey}`)
  }

  /**
   * 获取消息历史
   */
  static getMessages(sessionKey: string): CachedMessage[] {
    return cacheStore.get(`messages.${sessionKey}`) || []
  }

  /**
   * 保存消息历史
   */
  static saveMessages(sessionKey: string, messages: CachedMessage[]) {
    cacheStore.set(`messages.${sessionKey}`, messages)
    
    // 更新会话统计
    const session = cacheStore.get(`sessions.${sessionKey}`)
    if (session) {
      session.messageCount = messages.length
      session.lastMessageAt = messages.length > 0 
        ? messages[messages.length - 1].createdAt 
        : undefined
      cacheStore.set(`sessions.${sessionKey}`, session)
    }
  }

  /**
   * 追加消息
   */
  static appendMessage(sessionKey: string, message: CachedMessage) {
    const messages = this.getMessages(sessionKey)
    
    // 去重
    if (messages.some(m => m.id === message.id)) {
      return
    }
    
    messages.push(message)
    this.saveMessages(sessionKey, messages)
  }

  /**
   * 获取最后同步时间
   */
  static getLastSyncAt(sessionKey: string): number {
    return cacheStore.get(`lastSyncAt.${sessionKey}`) || 0
  }

  /**
   * 更新最后同步时间
   */
  static updateLastSyncAt(sessionKey: string) {
    cacheStore.set(`lastSyncAt.${sessionKey}`, Date.now())
  }

  /**
   * 获取当前会话
   */
  static getCurrentSessionKey(): string | null {
    return cacheStore.get('currentSessionKey')
  }

  /**
   * 设置当前会话
   */
  static setCurrentSessionKey(sessionKey: string | null) {
    cacheStore.set('currentSessionKey', sessionKey)
  }

  /**
   * 清空缓存
   */
  static clear() {
    cacheStore.clear()
  }

  /**
   * 获取缓存大小（字节）
   */
  static getCacheSize(): number {
    const messages = cacheStore.get('messages')
    return JSON.stringify(messages).length
  }

  /**
   * 清理旧缓存（保留最近 N 个会话）
   */
  static cleanOldCache(keepCount: number = 10) {
    const sessions = this.getSessions()
    
    if (sessions.length <= keepCount) {
      return
    }
    
    const toDelete = sessions.slice(keepCount)
    for (const session of toDelete) {
      this.deleteSession(session.key)
    }
  }

  /**
   * 检查并清理缓存（自动维护缓存大小）
   */
  static checkAndCleanCache() {
    const sessions = this.getSessions()
    const messages = cacheStore.get('messages')
    
    let cleaned = false
    
    // 1. 清理过期会话（最多保留 50 个）
    if (sessions.length > this.MAX_SESSIONS) {
      // 按最后消息时间排序
      const sorted = [...sessions].sort((a, b) => 
        (a.lastMessageAt || 0) - (b.lastMessageAt || 0)
      )
      
      const toDelete = sorted.slice(0, sessions.length - this.MAX_SESSIONS)
      for (const session of toDelete) {
        this.deleteSession(session.key)
      }
      cleaned = true
      console.log(`[Cache] 清理了 ${toDelete.length} 个旧会话`)
    }
    
    // 2. 清理每个会话的消息（每个会话最多 1000 条）
    const currentMessages = cacheStore.get('messages')
    for (const [sessionKey, msgs] of Object.entries(currentMessages)) {
      if (msgs.length > this.MAX_MESSAGES_PER_SESSION) {
        // 只保留最新的消息
        currentMessages[sessionKey] = msgs.slice(-this.MAX_MESSAGES_PER_SESSION)
        cleaned = true
      }
    }
    
    if (cleaned) {
      cacheStore.set('messages', currentMessages)
      console.log('[Cache] 缓存清理完成')
    }
    
    // 3. 检查缓存大小（最大 100MB）
    const sizeMB = this.getCacheSizeMB()
    if (sizeMB > this.MAX_CACHE_SIZE_MB) {
      console.warn(`[Cache] 缓存大小 ${sizeMB.toFixed(2)}MB 超过限制 ${this.MAX_CACHE_SIZE_MB}MB`)
      // 清理一半的会话
      this.cleanOldCache(Math.floor(this.MAX_SESSIONS / 2))
    }
  }

  /**
   * 获取缓存大小（MB）
   */
  static getCacheSizeMB(): number {
    const messages = cacheStore.get('messages')
    const sessions = cacheStore.get('sessions')
    
    // 估算：每条消息约 1KB
    const totalMessages = Object.values(messages).reduce((sum, msgs) => sum + msgs.length, 0)
    return (totalMessages * 1) / 1024  // KB to MB
  }

  // 缓存限制常量
  private static MAX_SESSIONS = 50  // 最多缓存 50 个会话
  private static MAX_MESSAGES_PER_SESSION = 1000  // 每个会话最多 1000 条消息
  private static MAX_CACHE_SIZE_MB = 100  // 最大缓存大小 100MB
}

/**
 * 配置管理器
 */
export class ConfigManager {
  /**
   * 获取主题
   */
  static getTheme(): 'light' | 'dark' | 'system' {
    return configStore.get('theme')
  }

  /**
   * 设置主题
   */
  static setTheme(theme: 'light' | 'dark' | 'system') {
    configStore.set('theme', theme)
  }

  /**
   * 获取语言
   */
  static getLanguage(): string {
    return configStore.get('language')
  }

  /**
   * 设置语言
   */
  static setLanguage(language: string) {
    configStore.set('language', language)
  }

  /**
   * 获取 Gateway 配置
   */
  static getGatewayConfig() {
    return configStore.get('gateway')
  }

  /**
   * 设置 Gateway 配置
   */
  static setGatewayConfig(config: Partial<ConfigSchema['gateway']>) {
    const current = this.getGatewayConfig()
    configStore.set('gateway', { ...current, ...config })
  }

  /**
   * 获取窗口状态
   */
  static getWindowState() {
    return configStore.get('window')
  }

  /**
   * 保存窗口状态
   */
  static saveWindowState(window: BrowserWindow) {
    const bounds = window.getBounds()
    const isMaximized = window.isMaximized()
    
    configStore.set('window', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized
    })
  }

  /**
   * 恢复窗口状态
   */
  static restoreWindowState(window: BrowserWindow) {
    const state = this.getWindowState()
    
    if (state.x !== undefined && state.y !== undefined) {
      window.setPosition(state.x, state.y)
    }
    
    window.setSize(state.width, state.height)
    
    if (state.isMaximized) {
      window.maximize()
    }
  }

  /**
   * 获取通知设置
   */
  static getNotificationSettings() {
    return configStore.get('notifications')
  }

  /**
   * 设置通知
   */
  static setNotificationSettings(settings: Partial<ConfigSchema['notifications']>) {
    const current = this.getNotificationSettings()
    configStore.set('notifications', { ...current, ...settings })
  }

  /**
   * 获取最后检查更新时间
   */
  static getLastCheckUpdateAt(): number {
    return configStore.get('lastCheckUpdateAt')
  }

  /**
   * 更新最后检查更新时间
   */
  static updateLastCheckUpdateAt() {
    configStore.set('lastCheckUpdateAt', Date.now())
  }
}
