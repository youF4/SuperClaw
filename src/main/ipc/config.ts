/**
 * IPC 处理 - 配置
 */

import { ipcMain } from 'electron'
import { ConfigManager } from '../store'
import { createLogger } from '../logger'

const log = createLogger('IPC-Config')

/**
 * 注册配置相关 IPC 处理
 */
export function registerConfigIPC() {
  // 获取主题
  ipcMain.handle('config:get-theme', () => {
    return ConfigManager.getTheme()
  })

  // 设置主题
  ipcMain.handle('config:set-theme', (_, theme: 'light' | 'dark' | 'system') => {
    log.info(`设置主题: ${theme}`)
    ConfigManager.setTheme(theme)
  })

  // 获取语言
  ipcMain.handle('config:get-language', () => {
    return ConfigManager.getLanguage()
  })

  // 设置语言
  ipcMain.handle('config:set-language', (_, language: string) => {
    log.info(`设置语言: ${language}`)
    ConfigManager.setLanguage(language)
  })

  // 获取 Gateway 配置
  ipcMain.handle('config:get-gateway', () => {
    return ConfigManager.getGatewayConfig()
  })

  // 设置 Gateway 配置
  ipcMain.handle('config:set-gateway', (_, config: any) => {
    log.info('更新 Gateway 配置')
    ConfigManager.setGatewayConfig(config)
  })

  // 获取通知设置
  ipcMain.handle('config:get-notifications', () => {
    return ConfigManager.getNotificationSettings()
  })

  // 设置通知
  ipcMain.handle('config:set-notifications', (_, settings: any) => {
    log.info('更新通知设置')
    ConfigManager.setNotificationSettings(settings)
  })

  log.info('配置 IPC 已注册')
}
