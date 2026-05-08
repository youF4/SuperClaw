/// <reference types="vite/client" />

interface ElectronAPI {
  gateway: {
    start: () => Promise<string>
    stop: () => Promise<string>
    status: () => Promise<boolean>
  }
  getFileMetadata: (path: string) => Promise<number>
  dialog: {
    open: (options: any) => Promise<string[] | null>
  }
}

interface Window {
  electronAPI: ElectronAPI
}
