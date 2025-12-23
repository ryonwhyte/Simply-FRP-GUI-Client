import { spawn, ChildProcess, execSync } from 'child_process'
import { EventEmitter } from 'events'
import { existsSync } from 'fs'
import { Notification } from 'electron'
import { ConfigManager } from './config-manager'
import * as net from 'net'

export interface FrpcStatus {
  running: boolean
  lastError: string | null
}

export class FrpcManager extends EventEmitter {
  private process: ChildProcess | null = null
  private configManager: ConfigManager
  private lastError: string | null = null
  private autoReconnect: boolean = true
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 5000
  private reconnectTimer: NodeJS.Timeout | null = null
  private intentionallyStopped: boolean = false

  constructor(configManager: ConfigManager) {
    super()
    this.configManager = configManager
  }

  private showNotification(title: string, body: string) {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  }

  private findFrpcBinary(): string | null {
    // Check common locations
    const locations = [
      '/usr/local/bin/frpc',
      '/usr/bin/frpc',
      '/opt/frp-gui/frpc/frpc',
      'frpc' // In PATH
    ]

    for (const loc of locations) {
      if (loc === 'frpc' || existsSync(loc)) {
        return loc
      }
    }

    return 'frpc' // Default to PATH lookup
  }

  async start(): Promise<boolean> {
    if (this.process) {
      this.emit('log', '[GUI] FRP client is already running')
      return true
    }

    // Clear reconnect timer if any
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.intentionallyStopped = false

    // Validate config before starting
    const validation = this.configManager.validateConfig()
    if (!validation.valid) {
      this.lastError = validation.errors.join('; ')
      this.emit('error', this.lastError)
      return false
    }

    // Write config file
    const configPath = this.configManager.writeFrpcConfig()
    this.emit('log', `[GUI] Config written to ${configPath}`)

    // Find frpc binary
    const frpcPath = this.findFrpcBinary()
    if (!frpcPath) {
      this.lastError = 'frpc binary not found. Please install FRP.'
      this.emit('error', this.lastError)
      return false
    }

    this.emit('log', `[GUI] Starting frpc from ${frpcPath}`)

    try {
      this.process = spawn(frpcPath, ['-c', configPath], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let connected = false

      this.process.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().trim().split('\n')
        for (const line of lines) {
          this.emit('log', line)
          // Detect successful connection
          if (line.includes('login to server success') || line.includes('start proxy success')) {
            if (!connected) {
              connected = true
              this.reconnectAttempts = 0
              this.showNotification('FRP Connected', 'Successfully connected to FRP server')
            }
          }
        }
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().trim().split('\n')
        for (const line of lines) {
          this.emit('log', `[ERR] ${line}`)
        }
      })

      this.process.on('error', (error: Error) => {
        this.lastError = `Failed to start frpc: ${error.message}`
        this.emit('error', this.lastError)
        this.process = null
        this.emit('status', 'stopped')
        this.handleDisconnect()
      })

      this.process.on('exit', (code: number | null, signal: string | null) => {
        if (code !== 0 && code !== null) {
          this.lastError = `frpc exited with code ${code}`
          this.emit('error', this.lastError)
        }
        this.emit('log', `[GUI] frpc exited (code: ${code}, signal: ${signal})`)
        this.process = null
        this.emit('status', 'stopped')

        if (connected) {
          this.showNotification('FRP Disconnected', 'Connection to FRP server lost')
        }

        this.handleDisconnect()
      })

      this.lastError = null
      this.emit('status', 'running')
      return true
    } catch (error) {
      this.lastError = `Failed to start frpc: ${error}`
      this.emit('error', this.lastError)
      return false
    }
  }

  private handleDisconnect() {
    if (this.intentionallyStopped || !this.autoReconnect) {
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('log', `[GUI] Max reconnect attempts (${this.maxReconnectAttempts}) reached`)
      this.showNotification('FRP Reconnect Failed', 'Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts

    this.emit('log', `[GUI] Attempting reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.start()
    }, delay)
  }

  async stop(): Promise<boolean> {
    // Mark as intentionally stopped to prevent auto-reconnect
    this.intentionallyStopped = true

    // Clear any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (!this.process) {
      this.emit('log', '[GUI] FRP client is not running')
      return true
    }

    this.emit('log', '[GUI] Stopping frpc...')

    return new Promise((resolve) => {
      if (!this.process) {
        resolve(true)
        return
      }

      const timeout = setTimeout(() => {
        if (this.process) {
          this.emit('log', '[GUI] Force killing frpc...')
          this.process.kill('SIGKILL')
        }
      }, 5000)

      this.process.once('exit', () => {
        clearTimeout(timeout)
        this.process = null
        this.emit('status', 'stopped')
        resolve(true)
      })

      this.process.kill('SIGTERM')
    })
  }

  async restart(): Promise<boolean> {
    await this.stop()
    return this.start()
  }

  getStatus(): FrpcStatus {
    return {
      running: this.process !== null,
      lastError: this.lastError
    }
  }

  isRunning(): boolean {
    return this.process !== null
  }

  // Test connection to FRP server
  async testConnection(host: string, port: number, timeout: number = 5000): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const socket = new net.Socket()

      const timer = setTimeout(() => {
        socket.destroy()
        resolve({ success: false, error: 'Connection timeout' })
      }, timeout)

      socket.connect(port, host, () => {
        clearTimeout(timer)
        socket.destroy()
        resolve({ success: true })
      })

      socket.on('error', (err) => {
        clearTimeout(timer)
        socket.destroy()
        resolve({ success: false, error: err.message })
      })
    })
  }

  setAutoReconnect(enabled: boolean) {
    this.autoReconnect = enabled
  }
}
