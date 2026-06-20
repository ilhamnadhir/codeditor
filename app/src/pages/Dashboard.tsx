import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth }  from '@/features/auth/AuthContext'
import { useRoom }  from '@/hooks/useRoom'
import { getRecentRooms, generateRoomId, recordRecentRoom } from '@/features/rooms/roomUtils'
import { getRoomUrl, copyRoomUrl } from '@/features/rooms/roomUtils'

interface RoomData {
  id:          string
  name:        string
  owner_id:    string | null
  language:    string
  created_at:  string
  last_active: string
  edit_count:  number
}

export default function Dashboard() {
  const navigate                     = useNavigate()
  const { user, displayName, avatarUrl, signOut } = useAuth()
  const { createRoom, getMyRooms, loading }        = useRoom()
  const [rooms,      setRooms]      = useState<RoomData[]>([])
  const [newName,    setNewName]    = useState('')
  const [creating,   setCreating]   = useState(false)
  const [copiedId,   setCopiedId]   = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('page-mode')
    return () => document.body.classList.remove('page-mode')
  }, [])

  useEffect(() => {
    if (user) {
      getMyRooms(user.id).then(setRooms)
    }
  }, [user])

  const handleCreate = async () => {
    const name = newName.trim() || `Workspace ${new Date().toLocaleDateString()}`
    setCreating(true)
    const id = await createRoom(name, user?.id)
    setCreating(false)
    if (id) navigate(`/room/${id}`)
  }

  const handleShare = async (roomId: string) => {
    await copyRoomUrl(roomId)
    setCopiedId(roomId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const recentRooms = getRecentRooms()

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text)' }}>
          <span style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800 }}>CS</span>
          <span style={{ fontWeight: 700 }}>CodeSync</span>
        </Link>

        <div className="dashboard-title" />

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ width: 32, height: 32, background: 'var(--accent)', fontSize: 12 }}>
            {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div className="dashboard-body">
        {/* New room */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '20px 24px',
          marginBottom: 32,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}>
          <input
            className="input-field"
            style={{ flex: 1, maxWidth: 360 }}
            placeholder="New workspace name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            id="new-workspace-input"
          />
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating}
            id="create-workspace-btn"
          >
            {creating ? <span className="spin">⟳</span> : '+ Create Workspace'}
          </button>
        </div>

        {/* My rooms (Supabase) */}
        {rooms.length > 0 && (
          <>
            <div className="dashboard-section-title">My Workspaces</div>
            <div className="workspace-grid">
              {rooms.map(room => (
                <div
                  key={room.id}
                  className="workspace-card"
                  onClick={() => navigate(`/room/${room.id}`)}
                  id={`workspace-${room.id}`}
                >
                  <div className="workspace-card-name">{room.name}</div>
                  <div className="workspace-card-meta">
                    <span className="badge">{room.language}</span>
                    <span>{room.edit_count} edits</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
                    {new Date(room.last_active).toLocaleDateString()}
                  </div>
                  <div className="workspace-card-footer">
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                      {room.id}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); handleShare(room.id) }}
                    >
                      {copiedId === room.id ? '✓ Copied' : '⎘ Share'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Recent rooms (localStorage) */}
        {recentRooms.length > 0 && (
          <>
            <div className="dashboard-section-title">Recent</div>
            <div className="workspace-grid">
              {recentRooms.map(r => (
                <div
                  key={r.id}
                  className="workspace-card"
                  onClick={() => navigate(`/room/${r.id}`)}
                >
                  <div className="workspace-card-name">{r.name}</div>
                  <div className="workspace-card-meta">
                    {new Date(r.lastVisited).toLocaleDateString()}
                  </div>
                  <div className="workspace-card-footer">
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                      {r.id}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); handleShare(r.id) }}
                    >
                      {copiedId === r.id ? '✓ Copied' : '⎘ Share'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {rooms.length === 0 && recentRooms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⌨</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No workspaces yet</div>
            <div style={{ fontSize: 13 }}>Create one above or join via an invite link.</div>
          </div>
        )}
      </div>
    </div>
  )
}
