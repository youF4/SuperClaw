import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } from 'electron'
import { join } from 'path'
import { fork, ChildProcess } from 'child_process'
import { statSync, mkdirSync } from 'fs'

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
    width: 1200, height: 800,
    minWidth: 800, minHeight: 600,
    show: false, title: 'SuperClaw',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, contextIsolation: true, nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (event) => { event.preventDefault(); mainWindow?.hide() })

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
    { label: '退出', click: () => { (app as any).isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(contextMenu)
  tray.setToolTip('SuperClaw')
  tray.on('click', () => mainWindow?.show())
}

async function startGateway(): Promise<void> {
  const openclawDir = getOpenclawDir()
  const stateDir = getStateDir()
  const entryFile = join(openclawDir, 'openclaw.mjs')

  mkdirSync(stateDir, { recursive: true })

  gatewayProcess = fork(entryFile, ['gateway', '--allow-unconfigured', '--port', String(GATEWAY_PORT)], {
    cwd: openclawDir,
    env: { ...process.env, OPENCLAW_STATE_DIR: stateDir },
    stdio: 'pipe'
  })

  gatewayProcess.stdout?.on('data', (data: Buffer) => console.log(`[openclaw] ${data.toString().trim()}`))
  gatewayProcess.stderr?.on('data', (data: Buffer) => console.error(`[openclaw] ${data.toString().trim()}`))
  gatewayProcess.on('exit', (code) => { gatewayProcess = null })
}

function stopGateway(): void {
  if (gatewayProcess) { gatewayProcess.kill('SIGTERM'); gatewayProcess = null }
}

// IPC Handlers
ipcMain.handle('gateway:start', async () => {
  if (gatewayProcess && !gatewayProcess.killed) return 'already running'
  await startGateway()
  return 'started'
})

ipcMain.handle('gateway:stop', () => { stopGateway(); return 'stopped' })
ipcMain.handle('gateway:status', () => gatewayProcess !== null && !gatewayProcess.killed)

ipcMain.handle('file:metadata', (_event, path: string) => {
  try { return statSync(path).size } catch { return 0 }
})

ipcMain.handle('dialog:open', async (_event, options: Electron.OpenDialogOptions) => {
  const result = await dialog.showOpenDialog(mainWindow!, options)
  return result.canceled ? null : result.filePaths
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  startGateway()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { stopGateway(); app.quit() }
})

app.on('before-quit', () => stopGateway())
