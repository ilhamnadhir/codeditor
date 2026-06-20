interface Props {
  activeUsers: number
  editCount:   number
  latencyMs:   number | null
}

export default function PresenceMetrics({ activeUsers, editCount, latencyMs }: Props) {
  return (
    <div className="presence-metrics">
      <div className="metric">
        <span className="metric-dot" />
        <span className="metric-value">{activeUsers}</span>
        <span>{activeUsers === 1 ? 'user' : 'users'}</span>
      </div>

      <div className="metric">
        <span style={{ opacity: 0.5 }}>✎</span>
        <span className="metric-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {editCount.toLocaleString()}
        </span>
        <span>edits</span>
      </div>

      {latencyMs !== null && (
        <div className="metric">
          <span style={{ opacity: 0.5 }}>⚡</span>
          <span
            className="metric-value"
            style={{
              color: latencyMs < 50 ? 'var(--green)' : latencyMs < 150 ? 'var(--yellow)' : 'var(--red)',
            }}
          >
            {latencyMs}ms
          </span>
        </div>
      )}
    </div>
  )
}
