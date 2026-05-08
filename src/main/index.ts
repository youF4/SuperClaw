/**
 * SuperClaw 主进程入口
 */

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } from 'electron'
import { join } from 'path'
import { fork, ChildProcess } from 'child_process'
import { statSync, mkdirSync } from 'fs'

// 导入新模块
import { registerAllIPC } from './ipc'
import { ConfigManager } from './store'
import { createUpdater } from './updater'
import { createLogger } from './logger'

const log = createLogger('Main')

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let gatewayProcess: ChildProcess | null = null

const GATEWAY_PORT = 22333
const isDev = !app.isPackaged

function getOpenclawDir(): string {
  if (isDev) return join(app.getAppPath(), '..', 'openclaw-dist')
  return join(process.resourcesPath, 'openclaw')
}

function getStateDir(): string {
  return join(app.getPath('userData'), 'data', 'openclaw')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'SuperClaw',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 恢复窗口状态
  ConfigManager.restoreWindowState(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    log.info('窗口已显示')
  })

  mainWindow.on('close', (event) => {
    // 保存窗口状态
    ConfigManager.saveWindowState(mainWindow!)
    
    event.preventDefault()
    mainWindow?.hide()
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '检查更新', click: () => checkForUpdates() },
    { type: 'separator' },
    { label: '退出', click: () => {
      (app as any).isQuitting = true
      app.quit()
    }}
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip('SuperClaw')
  tray.on('click', () => mainWindow?.show())

  log.info('系统托盘已创建')
}

async function startGateway(): Promise<void> {
  const openclawDir = getOpenclawDir()
  const stateDir = getStateDir()
  const entryFile = join(openclawDir, 'openclaw.mjs')

  mkdirSync(stateDir, { recursive: true })

  log.info(`启动 Gateway: ${entryFile}`)
  log.info(`状态目录: ${stateDir}`)

  gatewayProcess = fork(entryFile, ['gateway', '--allow-unconfigured', '--port', String(GATEWAY_PORT)], {
    cwd: openclawDir,
    env: { ...process.env, OPENCLAW_STATE_DIR: stateDir },
    stdio: 'pipe'
  })

  gatewayProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[openclaw] ${data.toString().trim()}`)
  })

  gatewayProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[openclaw] ${data.toString().trim()}`)
  })

  gatewayProcess.on('exit', (code) => {
    log.warn(`Gateway 已退出，退出码: ${code}`)
    gatewayProcess = null
  })

  log.info('Gateway 已启动')
}

function stopGateway(): void {
  if (gatewayProcess) {
    log.info('停止 Gateway...')
    gatewayProcess.kill('SIGTERM')
    gatewayProcess = null
  }
}

/**
 * 检查更新
 */
async function checkForUpdates() {
  if (!mainWindow) return
  
  try {
    const updater = createUpdater(mainWindow)
    await updater.checkForUpdates(false)
  } catch (error) {
    log.error('检查更新失败', error)
    dialog.showErrorBox('检查更新失败', String(error))
  }
}

// IPC Handlers
ipcMain.handle('gateway:start', async () => {
  if (gatewayProcess && !gatewayProcess.killed) return 'already running'
  await startGateway()
  return 'started'
})

ipcMain.handle('gateway:stop', () => {
  stopGateway()
  return 'stopped'
})

ipcMain.handle('gateway:status', () => {
  return gatewayProcess !== null && !gatewayProcess.killed
})

ipcMain.handle('file:metadata', (_event, path: string) => {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
})

ipcMain.handle('dialog:open', async (_event, options: Electron.OpenDialogOptions) => {
  const result = await dialog.showOpenDialog(mainWindow!, options)
  return result.canceled ? null : result.filePaths
})

// 更新相关 IPC
ipcMain.handle('updater:check', async (_event, silent: boolean = true) => {
  if (!mainWindow) return
  const updater = createUpdater(mainWindow)
  await updater.checkForUpdates(silent)
})

ipcMain.handle('updater:download', async () => {
  if (!mainWindow) return
  const updater = createUpdater(mainWindow)
  await updater.downloadUpdate()
})

ipcMain.handle('updater:install', () => {
  if (!mainWindow) return
  const updater = createUpdater(mainWindow)
  updater.quitAndInstall()
})

app.whenReady().then(() => {
  log.info('应用启动')
  
  // 注册 IPC
  registerAllIPC()
  
  // 创建窗口
  createWindow()
  
  // 创建托盘
  createTray()
  
  // 启动 Gateway
  const gatewayConfig = ConfigManager.getGatewayConfig()
  if (gatewayConfig.autoStart) {
    startGateway()
  }

  // 检查更新（启动 10 秒后）
  setTimeout(() => {
    if (!isDev && mainWindow) {
      checkForUpdates()
    }
  }, 10000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopGateway()
    app.quit()
  }
})

app.on('before-quit', () => {
  stopGateway()
  log.info('应用退出')
})
