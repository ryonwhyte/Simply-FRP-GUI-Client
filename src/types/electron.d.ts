interface Tunnel {
  id: string
  name: string
  type: 'tcp'
  localIP: string
  localPort: number
  remotePort: number
  enabled: boolean
}

interface AppConfig {
  serverAddr: string
  serverPort: number
  authToken: string
  remotePortMin: number
  remotePortMax: number
  autoStart: boolean
  tunnels: Tunnel[]
}

interface FrpcStatus {
  running: boolean
  lastError: string | null
}

interface ElectronAPI {
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
  onFrpcLog: (callback: (log: string) => void) => () => void
  onFrpcStatus: (callback: (status: string) => void) => () => void
  onFrpcError: (callback: (error: string) => void) => () => void
  onConfigReload: (callback: () => void) => () => void
}

interface Window {
  electronAPI: ElectronAPI
}
