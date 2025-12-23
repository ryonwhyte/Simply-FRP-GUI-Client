import { app, safeStorage } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs'
import { join } from 'path'

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

// Internal storage format with encrypted token
interface StoredConfig {
  serverAddr: string
  serverPort: number
  encryptedToken?: string  // Base64 encoded encrypted token
  authToken?: string       // Legacy plain text (will be migrated)
  remotePortMin: number
  remotePortMax: number
  autoStart: boolean
  tunnels: Tunnel[]
}

const DEFAULT_CONFIG: AppConfig = {
  serverAddr: '',
  serverPort: 7000,
  authToken: '',
  remotePortMin: 6000,
  remotePortMax: 6100,
  autoStart: false,
  tunnels: []
}

export class ConfigManager {
  private configDir: string
  private configPath: string
  private frpcConfigPath: string
  private config: AppConfig

  constructor() {
    this.configDir = join(app.getPath('userData'), 'config')
    this.configPath = join(this.configDir, 'config.json')
    this.frpcConfigPath = join(this.configDir, 'frpc.toml')

    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true })
    }

    this.config = this.loadConfig()
  }

  private loadConfig(): AppConfig {
    try {
      if (existsSync(this.configPath)) {
        const data = readFileSync(this.configPath, 'utf-8')
        const stored: StoredConfig = JSON.parse(data)

        // Decrypt token if encrypted, otherwise use legacy plain text
        let authToken = ''
        if (stored.encryptedToken && safeStorage.isEncryptionAvailable()) {
          try {
            const encrypted = Buffer.from(stored.encryptedToken, 'base64')
            authToken = safeStorage.decryptString(encrypted)
          } catch {
            console.error('Failed to decrypt token, using empty')
          }
        } else if (stored.authToken) {
          // Migrate legacy plain text token
          authToken = stored.authToken
        }

        return {
          ...DEFAULT_CONFIG,
          serverAddr: stored.serverAddr || '',
          serverPort: stored.serverPort || 7000,
          authToken,
          remotePortMin: stored.remotePortMin || 6000,
          remotePortMax: stored.remotePortMax || 6100,
          autoStart: stored.autoStart || false,
          tunnels: stored.tunnels || []
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
    return { ...DEFAULT_CONFIG }
  }

  private saveConfigToFile(): void {
    try {
      // Encrypt token if available
      let encryptedToken: string | undefined
      if (this.config.authToken && safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(this.config.authToken)
        encryptedToken = encrypted.toString('base64')
      }

      const stored: StoredConfig = {
        serverAddr: this.config.serverAddr,
        serverPort: this.config.serverPort,
        encryptedToken,
        remotePortMin: this.config.remotePortMin,
        remotePortMax: this.config.remotePortMax,
        autoStart: this.config.autoStart,
        tunnels: this.config.tunnels
      }

      writeFileSync(this.configPath, JSON.stringify(stored, null, 2))

      // Set file permissions to 600 (owner read/write only)
      chmodSync(this.configPath, 0o600)
    } catch (error) {
      console.error('Failed to save config:', error)
      throw error
    }
  }

  getConfig(): AppConfig {
    return { ...this.config }
  }

  saveConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates }
    this.saveConfigToFile()
  }

  addTunnel(tunnel: Omit<Tunnel, 'id'>): Tunnel {
    const id = randomUUID()
    const newTunnel: Tunnel = {
      ...tunnel,
      id,
      enabled: tunnel.enabled !== undefined ? tunnel.enabled : true
    }

    // Generate name if not provided
    if (!newTunnel.name) {
      newTunnel.name = `tcp-${newTunnel.localPort}`
    }

    this.config.tunnels.push(newTunnel)
    this.saveConfigToFile()
    return newTunnel
  }

  updateTunnel(id: string, updates: Partial<Tunnel>): Tunnel {
    const index = this.config.tunnels.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error(`Tunnel with id ${id} not found`)
    }
    this.config.tunnels[index] = { ...this.config.tunnels[index], ...updates }
    this.saveConfigToFile()
    return this.config.tunnels[index]
  }

  removeTunnel(id: string): void {
    const index = this.config.tunnels.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error(`Tunnel with id ${id} not found`)
    }
    this.config.tunnels.splice(index, 1)
    this.saveConfigToFile()
  }

  generateFrpcConfig(): string {
    const lines: string[] = []

    // Global settings
    lines.push(`serverAddr = "${this.config.serverAddr}"`)
    lines.push(`serverPort = ${this.config.serverPort}`)
    lines.push('')
    lines.push('auth.method = "token"')
    lines.push(`auth.token = "${this.config.authToken}"`)

    // Only include enabled tunnels
    const enabledTunnels = this.config.tunnels.filter(t => t.enabled !== false)
    for (const tunnel of enabledTunnels) {
      lines.push('')
      lines.push('[[proxies]]')
      lines.push(`name = "${tunnel.name}"`)
      lines.push(`type = "${tunnel.type}"`)
      lines.push(`localIP = "${tunnel.localIP}"`)
      lines.push(`localPort = ${tunnel.localPort}`)
      lines.push(`remotePort = ${tunnel.remotePort}`)
    }

    return lines.join('\n')
  }

  writeFrpcConfig(): string {
    const content = this.generateFrpcConfig()
    writeFileSync(this.frpcConfigPath, content)
    return this.frpcConfigPath
  }

  getFrpcConfigPath(): string {
    return this.frpcConfigPath
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.config.serverAddr) {
      errors.push('Server address is required')
    }
    if (!this.config.serverPort || this.config.serverPort < 1 || this.config.serverPort > 65535) {
      errors.push('Server port must be between 1 and 65535')
    }
    if (!this.config.authToken) {
      errors.push('Auth token is required')
    }

    // Check for duplicate remote ports
    const remotePorts = this.config.tunnels.map(t => t.remotePort)
    const duplicates = remotePorts.filter((port, index) => remotePorts.indexOf(port) !== index)
    if (duplicates.length > 0) {
      errors.push(`Duplicate remote ports: ${[...new Set(duplicates)].join(', ')}`)
    }

    // Validate each tunnel
    for (const tunnel of this.config.tunnels) {
      if (tunnel.localPort < 1 || tunnel.localPort > 65535) {
        errors.push(`Tunnel "${tunnel.name}": local port must be between 1 and 65535`)
      }
      if (tunnel.remotePort < 1 || tunnel.remotePort > 65535) {
        errors.push(`Tunnel "${tunnel.name}": remote port must be between 1 and 65535`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  // Export config (without encrypted token for portability)
  exportConfig(): string {
    const exportData = {
      serverAddr: this.config.serverAddr,
      serverPort: this.config.serverPort,
      // Token is NOT exported for security
      remotePortMin: this.config.remotePortMin,
      remotePortMax: this.config.remotePortMax,
      autoStart: this.config.autoStart,
      tunnels: this.config.tunnels
    }
    return JSON.stringify(exportData, null, 2)
  }

  // Import config (preserves current token if not provided)
  importConfig(jsonData: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(jsonData)

      // Validate imported data
      if (typeof imported.serverAddr !== 'string') {
        return { success: false, error: 'Invalid server address' }
      }

      this.config = {
        ...this.config,
        serverAddr: imported.serverAddr || this.config.serverAddr,
        serverPort: imported.serverPort || this.config.serverPort,
        remotePortMin: imported.remotePortMin || this.config.remotePortMin,
        remotePortMax: imported.remotePortMax || this.config.remotePortMax,
        autoStart: imported.autoStart ?? this.config.autoStart,
        tunnels: Array.isArray(imported.tunnels) ? imported.tunnels : this.config.tunnels
      }

      this.saveConfigToFile()
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Invalid JSON format' }
    }
  }
}
