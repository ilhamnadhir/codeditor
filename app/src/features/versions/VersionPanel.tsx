import { useState, useEffect } from 'react'
import type * as Y from 'yjs'
import { useVersions, type Snapshot } from '@/hooks/useVersions'
import DiffViewer from './DiffViewer'

interface Props {
  roomId:       string
  activeFile:   string | null
  yText:        Y.Text | null
  currentContent: string
  userId?:      string
}

export default function VersionPanel({ roomId, activeFile, yText, currentContent, userId }: Props) {
  const { snapshots, loading, saveSnapshot, loadSnapshots, restoreSnapshot, deleteSnapshot } = useVersions()
  const [selectedSnap, setSelectedSnap] = useState<Snapshot | null>(null)
  const [showDiff,     setShowDiff]     = useState(false)
  const [label,        setLabel]        = useState('')
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    if (activeFile && roomId) {
      loadSnapshots(roomId, activeFile)
      setSelectedSnap(null)
      setShowDiff(false)
    }
  }, [activeFile, roomId])

  const handleSave = async () => {
    if (!yText || !activeFile) return
    setSaving(true)
    await saveSnapshot(roomId, activeFile, yText, label, userId)
    setLabel('')
    await loadSnapshots(roomId, activeFile)
    setSaving(false)
  }

  const handleRestore = (snap: Snapshot) => {
    if (!yText) return
    if (confirm(`Restore to "${snap.label}"? Current content will be replaced.`)) {
      restoreSnapshot(snap, yText)
      setSelectedSnap(null)
      setShowDiff(false)
    }
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflow: 'auto' }}>

      {/* Save new snapshot */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
          Save snapshot of <strong style={{ color: 'var(--text)' }}>{activeFile ?? '—'}</strong>
        </div>
        <div className="flex gap-2">
          <input
            className="input-field"
            style={{ height: 30, fontSize: 12, flex: 1 }}
            placeholder="Label (optional)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving || !activeFile}
          >
            {saving ? <span className="spin">⟳</span> : '⬇ Save'}
          </button>
        </div>
      </div>

      {/* Diff view */}
      {showDiff && selectedSnap && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, fontWeight: 600 }}>Diff View</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setShowDiff(false); setSelectedSnap(null) }}
            >✕</button>
          </div>
          <DiffViewer snapshot={selectedSnap} currentText={currentContent} />
        </div>
      )}

      {/* Snapshot list */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
          History ({snapshots.length})
        </div>

        {loading && (
          <div className="skeleton" style={{ height: 40, marginBottom: 4 }} />
        )}

        {!loading && snapshots.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>
            No snapshots yet. Save one above.
          </div>
        )}

        {snapshots.map(snap => (
          <div
            key={snap.id}
            className="version-item"
            onClick={() => { setSelectedSnap(snap); setShowDiff(true) }}
            style={{
              background: selectedSnap?.id === snap.id ? 'var(--accent-dim)' : undefined,
            }}
          >
            <div style={{ fontSize: 16, opacity: 0.6 }}>⬜</div>
            <div className="version-item-info">
              <div className="version-item-label">{snap.label}</div>
              <div className="version-item-meta">
                {new Date(snap.created_at).toLocaleString()} · {snap.author.split('@')[0]}
              </div>
            </div>
            <div className="version-item-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={e => { e.stopPropagation(); handleRestore(snap) }}
                title="Restore"
              >↩</button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={e => { e.stopPropagation(); deleteSnapshot(snap.id) }}
                title="Delete"
              >✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
