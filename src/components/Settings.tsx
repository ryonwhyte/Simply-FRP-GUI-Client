import { useState } from 'react'

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

interface SettingsProps {
  config: AppConfig
  onSave: (settings: Partial<AppConfig>) => void
  onCancel: () => void
}

function Settings({ config, onSave, onCancel }: SettingsProps) {
  const [serverAddr, setServerAddr] = useState(config.serverAddr)
  const [serverPort, setServerPort] = useState(config.serverPort)
  const [authToken, setAuthToken] = useState(config.authToken)
  const [showToken, setShowToken] = useState(false)
  const [remotePortMin, setRemotePortMin] = useState(config.remotePortMin || 6000)
  const [remotePortMax, setRemotePortMax] = useState(config.remotePortMax || 6100)
  const [autoStart, setAutoStart] = useState(config.autoStart || false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Save auto-start setting
    window.electronAPI.setAutoStart(autoStart)
    onSave({
      serverAddr,
      serverPort,
      authToken,
      remotePortMin,
      remotePortMax,
      autoStart
    })
  }

  const handleTestConnection = async () => {
    if (!serverAddr || !serverPort) {
      setTestError('Server address and port required')
      setTestStatus('error')
      return
    }
    setTestStatus('testing')
    setTestError(null)
    const result = await window.electronAPI.testConnection(serverAddr, serverPort)
    if (result.success) {
      setTestStatus('success')
    } else {
      setTestStatus('error')
      setTestError(result.error || 'Connection failed')
    }
    // Reset status after 3 seconds
    setTimeout(() => setTestStatus('idle'), 3000)
  }

  const handleExport = async () => {
    await window.electronAPI.exportConfig()
  }

  const handleImport = async () => {
    const result = await window.electronAPI.importConfig()
    if (result.success) {
      // Reload the page to get new config
      window.location.reload()
    }
  }

  const generateConfigPreview = () => {
    const maskedToken = showToken ? authToken : (authToken ? '••••••••••••' : '')
    const lines = [
      `serverAddr = "${serverAddr}"`,
      `serverPort = ${serverPort}`,
      '',
      'auth.method = "token"',
      `auth.token = "${maskedToken}"`,
    ]

    const enabledTunnels = config.tunnels.filter(t => t.enabled !== false)
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

  return (
    <div className="settings-layout">
      <div className="settings-panel">
        <h2>Settings</h2>
        <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="serverAddr">FRP Server Address</label>
          <input
            id="serverAddr"
            type="text"
            value={serverAddr}
            onChange={(e) => setServerAddr(e.target.value)}
            placeholder="frp.example.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="serverPort">FRP Server Port</label>
          <div className="input-with-button">
            <input
              id="serverPort"
              type="number"
              value={serverPort}
              onChange={(e) => setServerPort(parseInt(e.target.value) || 7000)}
              min={1}
              max={65535}
              required
            />
            <button
              type="button"
              className={`btn btn-small ${testStatus === 'success' ? 'btn-success' : testStatus === 'error' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
            >
              {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? 'Connected!' : testStatus === 'error' ? 'Failed' : 'Test'}
            </button>
          </div>
          {testError && <small className="error-text">{testError}</small>}
        </div>

        <div className="form-group">
          <label htmlFor="authToken">Auth Token</label>
          <div className="input-with-icon">
            <input
              id="authToken"
              type={showToken ? 'text' : 'password'}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Your FRP auth token"
              required
            />
            <button
              type="button"
              className="btn-icon-inline"
              onClick={() => setShowToken(!showToken)}
              title={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Remote Port Range</label>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="remotePortMin">Min</label>
              <input
                id="remotePortMin"
                type="number"
                value={remotePortMin}
                onChange={(e) => setRemotePortMin(parseInt(e.target.value) || 6000)}
                min={1}
                max={65535}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="remotePortMax">Max</label>
              <input
                id="remotePortMax"
                type="number"
                value={remotePortMax}
                onChange={(e) => setRemotePortMax(parseInt(e.target.value) || 6100)}
                min={1}
                max={65535}
                required
              />
            </div>
          </div>
          <small>Available ports for tunnel remote port selection</small>
        </div>

        <div className="form-group">
          <label className="toggle-label">
            <span>Start on boot</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </label>
          <small>Automatically start the app when you log in</small>
        </div>

        <div className="form-group">
          <label>Backup & Restore</label>
          <div className="button-row">
            <button type="button" className="btn btn-secondary btn-small" onClick={handleExport}>
              Export Config
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={handleImport}>
              Import Config
            </button>
          </div>
          <small>Export saves tunnels (not token). Import preserves your token.</small>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Done
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
        </form>
      </div>

      <div className="config-preview">
        <div className="config-header">
          <h3>Config Preview (frpc.toml)</h3>
        </div>
        <pre className="config-content">{generateConfigPreview()}</pre>
      </div>
    </div>
  )
}

export default Settings
