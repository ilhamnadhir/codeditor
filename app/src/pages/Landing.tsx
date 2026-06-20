import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { generateRoomId, getRecentRooms, type RecentRoom } from '@/features/rooms/roomUtils';
import { useRoom } from '@/hooks/useRoom';
import { useAuth } from '@/features/auth/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
const FEATURES = [];
export default function Landing() {
    const navigate = useNavigate();
    const { user, isConfigured } = useAuth();
    const { createRoom, loading: roomLoading } = useRoom();
    const [joinId, setJoinId] = useState('');
    const [roomName, setRoomName] = useState('');
    const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
    const [joinError, setJoinError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    useEffect(() => {
        document.body.classList.add('page-mode');
        setRecentRooms(getRecentRooms());
        return () => document.body.classList.remove('page-mode');
    }, []);
    const handleCreate = async () => {
        const name = roomName.trim() || `Room ${new Date().toLocaleTimeString()}`;
        const id = await createRoom(name, user?.id);
        if (id)
            navigate(`/room/${id}`);
    };
    const handleJoin = () => {
        const id = joinId.trim();
        if (!id) {
            setJoinError('Enter a room ID or paste a link');
            return;
        }
        const match = id.match(/room\/([a-zA-Z0-9_-]+)/);
        navigate(`/room/${match ? match[1] : id}`);
    };
    return (<div className="landing">

      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="logo-mark" style={{
            width: 28, height: 28, background: 'var(--accent)',
            borderRadius: 8, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800,
        }}>CS</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>CodeSync</span>
        </div>
        <div style={{ flex: 1 }}/>
        {isConfigured && (<>
            {user
                ? <Link to="/dashboard" className="btn btn-ghost btn-sm">Dashboard →</Link>
                : <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>}
          </>)}
      </nav>


      <section className="landing-hero">


        <h1 className="hero-title">
          Code Together.<br />
          <span className="gradient">Ship Faster.</span>
        </h1>

        <p className="hero-sub">
          A collaborative development environment with Yjs CRDTs, live cursors,
          AI powered code analysis, and a shared terminal.
        </p>


        {!showCreate ? (<div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)} id="create-room-btn">
              + Create Room
            </button>

            <div className="hero-join">
              <input className="input-field" placeholder="Room ID or invite link…" value={joinId} onChange={e => { setJoinId(e.target.value); setJoinError(''); }} onKeyDown={e => e.key === 'Enter' && handleJoin()} id="join-room-input"/>
              <button className="btn btn-secondary btn-lg" onClick={handleJoin} id="join-room-btn">
                Join
              </button>
            </div>
          </div>) : (<div className="hero-actions">
            <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                width: 360,
                boxShadow: 'var(--shadow)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>New Room</div>
              <input className="input-field" placeholder="Room name (optional)" value={roomName} onChange={e => setRoomName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus/>
              <div className="flex gap-2">
                <button className="btn btn-primary w-full" onClick={handleCreate} disabled={roomLoading} id="confirm-create-room-btn">
                  {roomLoading ? <span className="spin">⟳</span> : 'Create & Enter →'}
                </button>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
              </div>
            </div>
          </div>)}

        {joinError && (<div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{joinError}</div>)}
      </section>


      <div className="features-grid">
        {FEATURES.map(f => (<div className="feature-card" key={f.title}>
            <span className="feature-icon">{f.icon}</span>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>))}
      </div>


      {recentRooms.length > 0 && (<div className="recent-rooms">
          <h2>Recent Workspaces</h2>
          <div className="room-cards">
            {recentRooms.map(r => (<div key={r.id} className="room-card" onClick={() => navigate(`/room/${r.id}`)} id={`recent-room-${r.id}`}>
                <div className="room-card-name">{r.name}</div>
                <div className="room-card-meta">
                  {new Date(r.lastVisited).toLocaleDateString()} · {r.id}
                </div>
              </div>))}
          </div>
        </div>)}
    </div>);
}
