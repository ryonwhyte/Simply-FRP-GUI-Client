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

interface TunnelListProps {
  tunnels: Tunnel[]
  serverAddr: string
  onEdit: (tunnel: Tunnel) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}

function TunnelList({ tunnels, serverAddr, onEdit, onDelete, onToggle }: TunnelListProps) {
  const [activePopup, setActivePopup] = useState<{ id: string; x: number; y: number } | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setActivePopup(null)
  }

  const openInBrowser = (addr: string) => {
    window.electronAPI.openExternal(`http://${addr}`)
    setActivePopup(null)
  }

  const togglePopup = (tunnelId: string, event: React.MouseEvent) => {
    if (activePopup?.id === tunnelId) {
      setActivePopup(null)
    } else {
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      setActivePopup({ id: tunnelId, x: rect.left, y: rect.bottom + 4 })
    }
  }
  if (tunnels.length === 0) {
    return (
      <div className="tunnel-list empty">
        <p>No tunnels configured. Click "Add Tunnel" to create one.</p>
      </div>
    )
  }

  return (
    <div className="tunnel-list">
      <h2>Tunnels</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Type</th>
            <th>Local</th>
            <th>Remote Port</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tunnels.map((tunnel) => {
            const remoteAddr = `${serverAddr}:${tunnel.remotePort}`
            return (
            <tr key={tunnel.id} className={tunnel.enabled === false ? 'disabled' : ''}>
              <td>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={tunnel.enabled !== false}
                    onChange={(e) => onToggle(tunnel.id, e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </td>
              <td>{tunnel.name}</td>
              <td>{tunnel.type.toUpperCase()}</td>
              <td>{tunnel.localIP}:{tunnel.localPort}</td>
              <td>{tunnel.remotePort}</td>
              <td className="actions">
                <div className="link-popup-container">
                  <button
                    className="btn-link"
                    onClick={(e) => togglePopup(tunnel.id, e)}
                    title={remoteAddr}
                  >
                    ↗
                  </button>
                  {activePopup?.id === tunnel.id && (
                    <div
                      className="link-popup"
                      style={{ left: activePopup.x, top: activePopup.y }}
                    >
                      <div className="link-popup-addr">{remoteAddr}</div>
                      <button onClick={() => openInBrowser(remoteAddr)}>Open</button>
                      <button onClick={() => copyToClipboard(remoteAddr)}>Copy</button>
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-small"
                  onClick={() => onEdit(tunnel)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => {
                    if (confirm(`Delete tunnel "${tunnel.name}"?`)) {
                      onDelete(tunnel.id)
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TunnelList
