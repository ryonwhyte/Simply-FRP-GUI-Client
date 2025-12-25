import { contextBridge, ipcRenderer } from 'electron'

export interface Tunnel {
  id: string
  name: string
  type: 'tcp'
  localIP: string
  localPort: number
  remotePort: number
  enabled: boolean
}

export interface AppConfig {
  serverAddr: string
  serverPort: number
  authToken: string
  remotePortMin: number
  remotePortMax: number
  autoStart: boolean
  tunnels: Tunnel[]
}

export interface FrpcStatus {
  running: boolean
  lastError: string | null
}

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('config:get'),
  saveConfig: (config: Partial<AppConfig>): Promise<void> =>
    ipcRenderer.invoke('config:save', config),

  // Tunnels
  addTunnel: (tunnel: Omit<Tunnel, 'id'>): Promise<Tunnel> =>
    ipcRenderer.invoke('tunnels:add', tunnel),
  updateTunnel: (id: string, tunnel: Partial<Tunnel>): Promise<Tunnel> =>
    ipcRenderer.invoke('tunnels:update', id, tunnel),
  removeTunnel: (id: string): Promise<void> =>
    ipcRenderer.invoke('tunnels:remove', id),

  // FRP control
  startFrpc: (): Promise<boolean> => ipcRenderer.invoke('frpc:start'),
  stopFrpc: (): Promise<boolean> => ipcRenderer.invoke('frpc:stop'),
  restartFrpc: (): Promise<boolean> => ipcRenderer.invoke('frpc:restart'),
  getFrpcStatus: (): Promise<FrpcStatus> => ipcRenderer.invoke('frpc:status'),
  testConnection: (host: string, port: number): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('frpc:testConnection', host, port),

  // Config import/export
  exportConfig: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('config:export'),
  importConfig: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('config:import'),

  // Auto-start
  setAutoStart: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('app:setAutoStart', enabled),
  getAutoStart: (): Promise<boolean> =>
    ipcRenderer.invoke('app:getAutoStart'),

  // Open external URL in system browser
  openExternal: (url: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('app:openExternal', url),

  // Event listeners
  onFrpcLog: (callback: (log: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, log: string) => callback(log)
    ipcRenderer.on('frpc:log', handler)
    return () => ipcRenderer.removeListener('frpc:log', handler)
  },
  onFrpcStatus: (callback: (status: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: string) => callback(status)
    ipcRenderer.on('frpc:status', handler)
    return () => ipcRenderer.removeListener('frpc:status', handler)
  },
  onFrpcError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('frpc:error', handler)
    return () => ipcRenderer.removeListener('frpc:error', handler)
  },
  onConfigReload: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('config:reload', handler)
    return () => ipcRenderer.removeListener('config:reload', handler)
  }
})

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<AppConfig>
      saveConfig: (config: Partial<AppConfig>) => Promise<void>
      addTunnel: (tunnel: Omit<Tunnel, 'id'>) => Promise<Tunnel>
      updateTunnel: (id: string, tunnel: Partial<Tunnel>) => Promise<Tunnel>
      removeTunnel: (id: string) => Promise<void>
      startFrpc: () => Promise<boolean>
      stopFrpc: () => Promise<boolean>
      restartFrpc: () => Promise<boolean>
      getFrpcStatus: () => Promise<FrpcStatus>
      testConnection: (host: string, port: number) => Promise<{ success: boolean; error?: string }>
      exportConfig: () => Promise<{ success: boolean; error?: string }>
      importConfig: () => Promise<{ success: boolean; error?: string }>
      setAutoStart: (enabled: boolean) => Promise<boolean>
      getAutoStart: () => Promise<boolean>
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
      onFrpcLog: (callback: (log: string) => void) => () => void
      onFrpcStatus: (callback: (status: string) => void) => () => void
      onFrpcError: (callback: (error: string) => void) => () => void
      onConfigReload: (callback: () => void) => () => void
    }
  }
}
