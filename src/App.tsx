import { useState, useEffect, useCallback } from 'react'
import Settings from './components/Settings'
import TunnelList from './components/TunnelList'
import TunnelForm from './components/TunnelForm'
import LogViewer from './components/LogViewer'
import StatusBar from './components/StatusBar'

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

const DEFAULT_PORT_RANGE = { min: 6000, max: 6100 }

type View = 'main' | 'settings' | 'add-tunnel' | 'edit-tunnel'

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [view, setView] = useState<View>('main')
  const [editingTunnel, setEditingTunnel] = useState<Tunnel | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  // Load config on mount
  useEffect(() => {
    loadConfig()
    checkStatus()

    // Set up event listeners
    const unsubLog = window.electronAPI.onFrpcLog((log) => {
      setLogs(prev => [...prev.slice(-500), log])
    })
    const unsubStatus = window.electronAPI.onFrpcStatus((status) => {
      setIsRunning(status === 'running')
    })
    const unsubError = window.electronAPI.onFrpcError((error) => {
      setLastError(error)
    })
    const unsubConfigReload = window.electronAPI.onConfigReload(() => {
      loadConfig()
    })

    return () => {
      unsubLog()
      unsubStatus()
      unsubError()
      unsubConfigReload()
    }
  }, [])

  const loadConfig = async () => {
    const cfg = await window.electronAPI.getConfig()
    setConfig(cfg)
  }

  const checkStatus = async () => {
    const status = await window.electronAPI.getFrpcStatus()
    setIsRunning(status.running)
    setLastError(status.lastError)
  }

  const handleSaveSettings = async (settings: Partial<AppConfig>) => {
    await window.electronAPI.saveConfig(settings)
    await loadConfig()
    setView('main')
  }

  const handleAddTunnel = async (tunnel: Omit<Tunnel, 'id'>) => {
    await window.electronAPI.addTunnel(tunnel)
    await loadConfig()
    setView('main')
  }

  const handleUpdateTunnel = async (id: string, tunnel: Partial<Tunnel>) => {
    await window.electronAPI.updateTunnel(id, tunnel)
    await loadConfig()
    setEditingTunnel(null)
    setView('main')
  }

  const handleDeleteTunnel = async (id: string) => {
    await window.electronAPI.removeTunnel(id)
    await loadConfig()
  }

  const handleToggleTunnel = async (id: string, enabled: boolean) => {
    await window.electronAPI.updateTunnel(id, { enabled })
    await loadConfig()
    // Restart FRP if it's running to apply the change
    if (isRunning) {
      await window.electronAPI.restartFrpc()
    }
  }

  const handleEditTunnel = (tunnel: Tunnel) => {
    setEditingTunnel(tunnel)
    setView('edit-tunnel')
  }

  const handleStart = async () => {
    setLastError(null)
    const success = await window.electronAPI.startFrpc()
    if (success) {
      setIsRunning(true)
    }
  }

  const handleStop = async () => {
    await window.electronAPI.stopFrpc()
    setIsRunning(false)
  }

  const handleRestart = async () => {
    setLastError(null)
    await window.electronAPI.restartFrpc()
  }

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  if (!config) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Simply FRP GUI</h1>
        <button
          className="btn btn-secondary"
          onClick={() => setView('settings')}
        >
          ⚙ Settings
        </button>
      </header>

      <main className="main">
        {view === 'main' && (
          <>
            <div className="controls">
              <div className="control-buttons">
                {!isRunning ? (
                  <button className="btn btn-primary" onClick={handleStart}>
                    Start FRP
                  </button>
                ) : (
                  <>
                    <button className="btn btn-danger" onClick={handleStop}>
                      Stop
                    </button>
                    <button className="btn btn-secondary" onClick={handleRestart}>
                      Restart
                    </button>
                  </>
                )}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setView('add-tunnel')}
              >
                + Add Tunnel
              </button>
            </div>

            <TunnelList
              tunnels={config.tunnels}
              serverAddr={config.serverAddr}
              onEdit={handleEditTunnel}
              onDelete={handleDeleteTunnel}
              onToggle={handleToggleTunnel}
            />

            <LogViewer logs={logs} onClear={clearLogs} />
          </>
        )}

        {view === 'settings' && (
          <Settings
            config={config}
            onSave={handleSaveSettings}
            onCancel={() => setView('main')}
          />
        )}

        {view === 'add-tunnel' && (
          <TunnelForm
            existingPorts={config.tunnels.map(t => t.remotePort)}
            portRange={{
              min: config.remotePortMin || DEFAULT_PORT_RANGE.min,
              max: config.remotePortMax || DEFAULT_PORT_RANGE.max
            }}
            onSave={handleAddTunnel}
            onCancel={() => setView('main')}
          />
        )}

        {view === 'edit-tunnel' && editingTunnel && (
          <TunnelForm
            tunnel={editingTunnel}
            existingPorts={config.tunnels.filter(t => t.id !== editingTunnel.id).map(t => t.remotePort)}
            portRange={{
              min: config.remotePortMin || DEFAULT_PORT_RANGE.min,
              max: config.remotePortMax || DEFAULT_PORT_RANGE.max
            }}
            onSave={(t) => handleUpdateTunnel(editingTunnel.id, t)}
            onCancel={() => { setEditingTunnel(null); setView('main') }}
          />
        )}
      </main>

      <StatusBar isRunning={isRunning} lastError={lastError} />
    </div>
  )
}

export default App
