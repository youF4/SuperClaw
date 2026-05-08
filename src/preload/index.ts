import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Gateway 管理
  gateway: {
    start: () => ipcRenderer.invoke('gateway:start'),
    stop: () => ipcRenderer.invoke('gateway:stop'),
    status: () => ipcRenderer.invoke('gateway:status')
  },

  // 文件操作
  getFileMetadata: (path: string) => ipcRenderer.invoke('file:metadata', path),

  // 对话框
  dialog: {
    open: (options: any) => ipcRenderer.invoke('dialog:open', options)
  },

  // 缓存管理
  cache: {
    getSessions: () => ipcRenderer.invoke('cache:get-sessions'),
    saveSession: (session: any) => ipcRenderer.invoke('cache:save-session', session),
    deleteSession: (sessionKey: string) => ipcRenderer.invoke('cache:delete-session', sessionKey),
    getMessages: (sessionKey: string) => ipcRenderer.invoke('cache:get-messages', sessionKey),
    saveMessages: (sessionKey: string, messages: any[]) =>
      ipcRenderer.invoke('cache:save-messages', sessionKey, messages),
    appendMessage: (sessionKey: string, message: any) =>
      ipcRenderer.invoke('cache:append-message', sessionKey, message),
    getLastSync: (sessionKey: string) => ipcRenderer.invoke('cache:get-last-sync', sessionKey),
    updateLastSync: (sessionKey: string) => ipcRenderer.invoke('cache:update-last-sync', sessionKey),
    getCurrentSession: () => ipcRenderer.invoke('cache:get-current-session'),
    setCurrentSession: (sessionKey: string | null) =>
      ipcRenderer.invoke('cache:set-current-session', sessionKey),
    clear: () => ipcRenderer.invoke('cache:clear'),
    getSize: () => ipcRenderer.invoke('cache:get-size'),
    cleanOld: (keepCount: number) => ipcRenderer.invoke('cache:clean-old', keepCount)
  },

  // 配置管理
  config: {
    getTheme: () => ipcRenderer.invoke('config:get-theme'),
    setTheme: (theme: 'light' | 'dark' | 'system') =>
      ipcRenderer.invoke('config:set-theme', theme),
    getLanguage: () => ipcRenderer.invoke('config:get-language'),
    setLanguage: (language: string) => ipcRenderer.invoke('config:set-language', language),
    getGateway: () => ipcRenderer.invoke('config:get-gateway'),
    setGateway: (config: any) => ipcRenderer.invoke('config:set-gateway', config),
    getNotifications: () => ipcRenderer.invoke('config:get-notifications'),
    setNotifications: (settings: any) => ipcRenderer.invoke('config:set-notifications', settings)
  },

  // 更新管理
  updater: {
    check: (silent?: boolean) => ipcRenderer.invoke('updater:check', silent),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-available', (_, info) => callback(info))
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      ipcRenderer.on('update-downloaded', (_, info) => callback(info))
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('download-progress', (_, progress) => callback(progress))
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
