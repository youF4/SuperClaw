import { contextBridge, ipcRenderer } from 'electron'

const api = {
  gateway: {
    start: () => ipcRenderer.invoke('gateway:start'),
    stop: () => ipcRenderer.invoke('gateway:stop'),
    status: () => ipcRenderer.invoke('gateway:status')
  },
  getFileMetadata: (path: string) => ipcRenderer.invoke('file:metadata', path),
  dialog: {
    open: (options: any) => ipcRenderer.invoke('dialog:open', options)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
