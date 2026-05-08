/**
 * 前端缓存工具
 * 
 * 封装 electronAPI.cache，提供更易用的接口
 */

import type { CachedMessage, CachedSession } from '../../main/store'

/**
 * 缓存工具
 */
export const cache = {
  /**
   * 获取会话列表
   */
  async getSessions(): Promise<CachedSession[]> {
    return await window.electronAPI.cache.getSessions()
  },

  /**
   * 保存会话
   */
  async saveSession(session: CachedSession): Promise<void> {
    await window.electronAPI.cache.saveSession(session)
  },

  /**
   * 删除会话
   */
  async deleteSession(sessionKey: string): Promise<void> {
    await window.electronAPI.cache.deleteSession(sessionKey)
  },

  /**
   * 获取消息历史
   */
  async getMessages(sessionKey: string): Promise<CachedMessage[]> {
    return await window.electronAPI.cache.getMessages(sessionKey)
  },

  /**
   * 保存消息历史
   */
  async saveMessages(sessionKey: string, messages: CachedMessage[]): Promise<void> {
    await window.electronAPI.cache.saveMessages(sessionKey, messages)
  },

  /**
   * 追加消息
   */
  async appendMessage(sessionKey: string, message: CachedMessage): Promise<void> {
    await window.electronAPI.cache.appendMessage(sessionKey, message)
  },

  /**
   * 获取最后同步时间
   */
  async getLastSync(sessionKey: string): Promise<number> {
    return await window.electronAPI.cache.getLastSync(sessionKey)
  },

  /**
   * 更新最后同步时间
   */
  async updateLastSync(sessionKey: string): Promise<void> {
    await window.electronAPI.cache.updateLastSync(sessionKey)
  },

  /**
   * 获取当前会话
   */
  async getCurrentSession(): Promise<string | null> {
    return await window.electronAPI.cache.getCurrentSession()
  },

  /**
   * 设置当前会话
   */
  async setCurrentSession(sessionKey: string | null): Promise<void> {
    await window.electronAPI.cache.setCurrentSession(sessionKey)
  },

  /**
   * 清空缓存
   */
  async clear(): Promise<void> {
    await window.electronAPI.cache.clear()
  },

  /**
   * 获取缓存大小（字节）
   */
  async getSize(): Promise<number> {
    return await window.electronAPI.cache.getSize()
  },

  /**
   * 清理旧缓存
   */
  async cleanOld(keepCount: number = 10): Promise<void> {
    await window.electronAPI.cache.cleanOld(keepCount)
  }
}

/**
 * 配置工具
 */
export const config = {
  /**
   * 获取主题
   */
  async getTheme(): Promise<'light' | 'dark' | 'system'> {
    return await window.electronAPI.config.getTheme()
  },

  /**
   * 设置主题
   */
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await window.electronAPI.config.setTheme(theme)
  },

  /**
   * 获取语言
   */
  async getLanguage(): Promise<string> {
    return await window.electronAPI.config.getLanguage()
  },

  /**
   * 设置语言
   */
  async setLanguage(language: string): Promise<void> {
    await window.electronAPI.config.setLanguage(language)
  },

  /**
   * 获取 Gateway 配置
   */
  async getGateway() {
    return await window.electronAPI.config.getGateway()
  },

  /**
   * 设置 Gateway 配置
   */
  async setGateway(config: any): Promise<void> {
    await window.electronAPI.config.setGateway(config)
  },

  /**
   * 获取通知设置
   */
  async getNotifications() {
    return await window.electronAPI.config.getNotifications()
  },

  /**
   * 设置通知
   */
  async setNotifications(settings: any): Promise<void> {
    await window.electronAPI.config.setNotifications(settings)
  }
}
