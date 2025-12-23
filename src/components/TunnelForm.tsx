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

interface TunnelFormProps {
  tunnel?: Tunnel
  existingPorts: number[]
  portRange: { min: number; max: number }
  onSave: (tunnel: Omit<Tunnel, 'id'>) => void
  onCancel: () => void
}

function TunnelForm({ tunnel, existingPorts, portRange, onSave, onCancel }: TunnelFormProps) {
  const [name, setName] = useState(tunnel?.name || '')
  const [localIP, setLocalIP] = useState(tunnel?.localIP || '127.0.0.1')
  const [localPort, setLocalPort] = useState(tunnel?.localPort || 3000)
  const [remotePort, setRemotePort] = useState(tunnel?.remotePort || 0)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!tunnel

  // Generate available ports (excluding already used ones)
  const availablePorts = []
  for (let p = portRange.min; p <= portRange.max; p++) {
    if (!existingPorts.includes(p) || p === tunnel?.remotePort) {
      availablePorts.push(p)
    }
  }

  // Set default remote port to first available if not editing
  if (!isEdit && remotePort === 0 && availablePorts.length > 0) {
    setRemotePort(availablePorts[0])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate remote port is not duplicate
    if (existingPorts.includes(remotePort) && remotePort !== tunnel?.remotePort) {
      setError(`Remote port ${remotePort} is already in use by another tunnel`)
      return
    }

    // Validate port ranges
    if (localPort < 1 || localPort > 65535) {
      setError('Local port must be between 1 and 65535')
      return
    }
    if (remotePort < 1 || remotePort > 65535) {
      setError('Remote port must be between 1 and 65535')
      return
    }

    onSave({
      name: name || `tcp-${localPort}`,
      type: 'tcp',
      localIP,
      localPort,
      remotePort,
      enabled: tunnel?.enabled !== false
    })
  }

  return (
    <div className="tunnel-form">
      <h2>{isEdit ? 'Edit Tunnel' : 'Add Tunnel'}</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="name">Tunnel Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`tcp-${localPort}`}
          />
          <small>Leave empty to auto-generate based on port</small>
        </div>

        <div className="form-group">
          <label htmlFor="localIP">Local IP</label>
          <input
            id="localIP"
            type="text"
            value={localIP}
            onChange={(e) => setLocalIP(e.target.value)}
            placeholder="127.0.0.1"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="localPort">Local Port</label>
            <input
              id="localPort"
              type="number"
              value={localPort}
              onChange={(e) => setLocalPort(parseInt(e.target.value) || 0)}
              min={1}
              max={65535}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="remotePort">Remote Port</label>
            <select
              id="remotePort"
              value={remotePort}
              onChange={(e) => setRemotePort(parseInt(e.target.value))}
              required
            >
              {availablePorts.length === 0 ? (
                <option value="">No ports available</option>
              ) : (
                availablePorts.map(port => (
                  <option key={port} value={port}>{port}</option>
                ))
              )}
            </select>
            <small>{availablePorts.length} ports available ({portRange.min}-{portRange.max})</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Done
          </button>
          <button type="submit" className="btn btn-primary" disabled={availablePorts.length === 0}>
            {isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TunnelForm
