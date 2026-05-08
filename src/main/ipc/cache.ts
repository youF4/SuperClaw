/**
 * IPC 处理 - 缓存
 */

import { ipcMain } from 'electron'
import { CacheManager, CachedMessage, CachedSession } from '../store'
import { createLogger } from '../logger'

const log = createLogger('IPC-Cache')

/**
 * 注册缓存相关 IPC 处理
 */
export function registerCacheIPC() {
  // 获取会话列表
  ipcMain.handle('cache:get-sessions', () => {
    log.debug('获取会话列表')
    return CacheManager.getSessions()
  })

  // 保存会话
  ipcMain.handle('cache:save-session', (_, session: CachedSession) => {
    log.debug(`保存会话: ${session.key}`)
    CacheManager.saveSession(session)
  })

  // 删除会话
  ipcMain.handle('cache:delete-session', (_, sessionKey: string) => {
    log.debug(`删除会话: ${sessionKey}`)
    CacheManager.deleteSession(sessionKey)
  })

  // 获取消息历史
  ipcMain.handle('cache:get-messages', (_, sessionKey: string) => {
    log.debug(`获取消息历史: ${sessionKey}`)
    return CacheManager.getMessages(sessionKey)
  })

  // 保存消息历史
  ipcMain.handle('cache:save-messages', (_, sessionKey: string, messages: CachedMessage[]) => {
    log.debug(`保存消息历史: ${sessionKey} (${messages.length} 条)`)
    CacheManager.saveMessages(sessionKey, messages)
  })

  // 追加消息
  ipcMain.handle('cache:append-message', (_, sessionKey: string, message: CachedMessage) => {
    log.debug(`追加消息: ${sessionKey} - ${message.id}`)
    CacheManager.appendMessage(sessionKey, message)
  })

  // 获取最后同步时间
  ipcMain.handle('cache:get-last-sync', (_, sessionKey: string) => {
    return CacheManager.getLastSyncAt(sessionKey)
  })

  // 更新最后同步时间
  ipcMain.handle('cache:update-last-sync', (_, sessionKey: string) => {
    CacheManager.updateLastSyncAt(sessionKey)
  })

  // 获取当前会话
  ipcMain.handle('cache:get-current-session', () => {
    return CacheManager.getCurrentSessionKey()
  })

  // 设置当前会话
  ipcMain.handle('cache:set-current-session', (_, sessionKey: string | null) => {
    CacheManager.setCurrentSessionKey(sessionKey)
  })

  // 清空缓存
  ipcMain.handle('cache:clear', () => {
    log.info('清空缓存')
    CacheManager.clear()
  })

  // 获取缓存大小
  ipcMain.handle('cache:get-size', () => {
    return CacheManager.getCacheSize()
  })

  // 清理旧缓存
  ipcMain.handle('cache:clean-old', (_, keepCount: number) => {
    log.info(`清理旧缓存，保留 ${keepCount} 个会话`)
    CacheManager.cleanOldCache(keepCount)
  })

  log.info('缓存 IPC 已注册')
}
