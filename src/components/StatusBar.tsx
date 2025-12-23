interface StatusBarProps {
  isRunning: boolean
  lastError: string | null
}

function StatusBar({ isRunning, lastError }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <div className="status-indicator">
        <span className={`status-dot ${isRunning ? 'running' : 'stopped'}`} />
        <span>{isRunning ? 'Running' : 'Stopped'}</span>
      </div>
      {lastError && (
        <div className="status-error" title={lastError}>
          Error: {lastError.length > 50 ? lastError.slice(0, 50) + '...' : lastError}
        </div>
      )}
    </footer>
  )
}

export default StatusBar
