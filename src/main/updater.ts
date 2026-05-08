/**
 * 自动更新
 * 
 * 使用 electron-updater 实现应用自动更新
 */

import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { BrowserWindow, dialog } from 'electron'
import { createLogger } from './logger'

const log = createLogger('Updater')

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

export class Updater {
  private mainWindow: BrowserWindow | null = null
  private updateAvailable: boolean = false
  private updateDownloaded: boolean = false

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.setupAutoUpdater()
  }

  /**
   * 配置自动更新
   */
  private setupAutoUpdater() {
    // 不自动下载
    autoUpdater.autoDownload = false
    // 不自动安装
    autoUpdater.autoInstallOnAppQuit = true

    // 检查更新失败
    autoUpdater.on('error', (error) => {
      log.error('检查更新失败', error)
      this.sendMessage('update-error', error.message)
    })

    // 检查更新中
    autoUpdater.on('checking-for-update', () => {
      log.info('正在检查更新...')
      this.sendMessage('checking-for-update')
    })

    // 发现新版本
    autoUpdater.on('update-available', (info) => {
      log.info(`发现新版本: ${info.version}`)
      this.updateAvailable = true
      this.sendMessage('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as string
      } as UpdateInfo)
    })

    // 没有新版本
    autoUpdater.on('update-not-available', (info) => {
      log.info('当前已是最新版本')
      this.sendMessage('update-not-available', {
        version: info.version
      })
    })

    // 下载进度
    autoUpdater.on('download-progress', (progress) => {
      const percent = Math.round(progress.percent)
      log.info(`下载进度: ${percent}% (${progress.transferred}/${progress.total})`)
      this.sendMessage('download-progress', {
        percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      })
    })

    // 下载完成
    autoUpdater.on('update-downloaded', (info) => {
      log.info(`更新已下载: ${info.version}`)
      this.updateDownloaded = true
      this.sendMessage('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as string
      } as UpdateInfo)
    })
  }

  /**
   * 发送消息到渲染进程
   */
  private sendMessage(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  /**
   * 检查更新
   */
  async checkForUpdates(silent: boolean = true): Promise<void> {
    try {
      log.info('检查更新中...')
      await autoUpdater.checkForUpdates()
    } catch (error) {
      if (!silent) {
        log.error('检查更新失败', error)
        throw error
      }
    }
  }

  /**
   * 下载更新
   */
  async downloadUpdate(): Promise<void> {
    if (!this.updateAvailable) {
      throw new Error('没有可用的更新')
    }

    try {
      log.info('开始下载更新...')
      await autoUpdater.downloadUpdate()
    } catch (error) {
      log.error('下载更新失败', error)
      throw error
    }
  }

  /**
   * 安装更新
   */
  quitAndInstall(): void {
    if (!this.updateDownloaded) {
      throw new Error('更新尚未下载完成')
    }

    log.info('安装更新并重启...')
    autoUpdater.quitAndInstall()
  }

  /**
   * 显示更新对话框
   */
  async showUpdateDialog(info: UpdateInfo): Promise<boolean> {
    const result = await dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${info.version}`,
      detail: info.releaseNotes || '是否立即下载更新？',
      buttons: ['立即下载', '稍后提醒'],
      defaultId: 0,
      cancelId: 1
    })

    return result.response === 0
  }

  /**
   * 显示安装对话框
   */
  async showInstallDialog(info: UpdateInfo): Promise<void> {
    const result = await dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: '更新已下载',
      message: `新版本 ${info.version} 已下载完成`,
      detail: '是否立即安装更新？\n（应用将重启）',
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0,
      cancelId: 1
    })

    if (result.response === 0) {
      this.quitAndInstall()
    }
  }
}

/**
 * 创建更新器
 */
export function createUpdater(mainWindow: BrowserWindow): Updater {
  return new Updater(mainWindow)
}
