import { useRef, useEffect } from 'react'

interface LogViewerProps {
  logs: string[]
  onClear: () => void
}

function LogViewer({ logs, onClear }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="log-viewer">
      <div className="log-header">
        <h3>Logs</h3>
        <button className="btn btn-small" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="log-content" ref={containerRef}>
        {logs.length === 0 ? (
          <div className="log-empty">No logs yet</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`log-line ${log.includes('[ERR]') ? 'log-error' : ''} ${log.includes('[GUI]') ? 'log-gui' : ''}`}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default LogViewer
