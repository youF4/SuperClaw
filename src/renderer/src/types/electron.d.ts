/**
 * Electron API 类型声明
 */

export interface ElectronAPI {
  // Gateway 管理
  gateway: {
    start: () => Promise<string>
    stop: () => Promise<string>
    status: () => Promise<boolean>
  }

  // 文件操作
  getFileMetadata: (path: string) => Promise<number>

  // 对话框
  dialog: {
    open: (options: Electron.OpenDialogOptions) => Promise<string[] | null>
  }

  // 缓存管理
  cache: {
    getSessions: () => Promise<any[]>
    saveSession: (session: any) => Promise<void>
    deleteSession: (sessionKey: string) => Promise<void>
    getMessages: (sessionKey: string) => Promise<any[]>
    saveMessages: (sessionKey: string, messages: any[]) => Promise<void>
    appendMessage: (sessionKey: string, message: any) => Promise<void>
    getLastSync: (sessionKey: string) => Promise<number>
    updateLastSync: (sessionKey: string) => Promise<void>
    getCurrentSession: () => Promise<string | null>
    setCurrentSession: (sessionKey: string | null) => Promise<void>
    clear: () => Promise<void>
    getSize: () => Promise<number>
    cleanOld: (keepCount: number) => Promise<void>
  }

  // 配置管理
  config: {
    getTheme: () => Promise<'light' | 'dark' | 'system'>
    setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>
    getLanguage: () => Promise<string>
    setLanguage: (language: string) => Promise<void>
    getGateway: () => Promise<any>
    setGateway: (config: any) => Promise<void>
    getNotifications: () => Promise<any>
    setNotifications: (settings: any) => Promise<void>
  }

  // 更新管理
  updater: {
    check: (silent?: boolean) => Promise<void>
    download: () => Promise<void>
    install: () => void
    onUpdateAvailable: (callback: (info: any) => void) => void
    onUpdateDownloaded: (callback: (info: any) => void) => void
    onDownloadProgress: (callback: (progress: any) => void) => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
