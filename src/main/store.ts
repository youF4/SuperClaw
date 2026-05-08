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
