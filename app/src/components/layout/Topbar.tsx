import React from 'react';
import { Link } from 'react-router-dom';
import CollaboratorAvatars from '@/components/presence/CollaboratorAvatars';
import PresenceMetrics from '@/components/presence/PresenceMetrics';
import type { Collaborator } from '@/hooks/usePresence';
import { useAuth } from '@/features/auth/AuthContext';
import { copyRoomUrl } from '@/features/rooms/roomUtils';
interface Props {
    roomId: string;
    roomName: string;
    collaborators: Collaborator[];
    activeUsers: number;
    editCount: number;
    latencyMs: number | null;
    versionsOpen?: boolean;
    runOpen?: boolean;
    aiOpen?: boolean;
    onToggleVersions?: () => void;
    onToggleRun: () => void;
    onToggleAI?: () => void;
    onRun: () => void;
    running: boolean;
    canRun: boolean;
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
}
export default function Topbar({ roomId, roomName, collaborators, activeUsers, editCount, latencyMs, versionsOpen, runOpen, aiOpen, onToggleVersions, onToggleRun, onToggleAI, onRun, running, canRun, theme, onToggleTheme, }: Props) {
    const { user, displayName, avatarUrl, signOut, isConfigured } = useAuth();
    const [copied, setCopied] = React.useState(false);
    const handleShare = async () => {
        const ok = await copyRoomUrl(roomId);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    return (<div className="topbar">

      <Link to="/" className="topbar-logo">
        <span className="logo-mark">CS</span>
      </Link>

      <div className="topbar-divider"/>


      <span className="topbar-room-name" title={roomName}>
        {roomName || roomId}
      </span>


      <PresenceMetrics activeUsers={activeUsers} editCount={editCount} latencyMs={latencyMs}/>

      <div className="topbar-spacer"/>


      <CollaboratorAvatars collaborators={collaborators}/>

      <div className="topbar-divider"/>


      <div className="topbar-actions">


        <button className="btn btn-secondary btn-sm" onClick={handleShare} id="share-room-btn" title="Copy invite link">
          {copied ? '✓ Copied' : '⎘ Share'}
        </button>


        <button className={`btn btn-sm ${running ? 'btn-secondary' : 'btn-primary'}`} onClick={onRun} disabled={running || !canRun} id="run-code-btn" title={canRun ? 'Run code' : 'This language cannot be executed via Piston'}>
          {running
            ? <><span className="spin">⟳</span> Running</>
            : '▶ Run'}
        </button>


        {/* AI Toggle */}
        <button className={`btn btn-icon btn-sm ${aiOpen ? 'btn-primary' : 'btn-ghost'}`} onClick={onToggleAI} id="toggle-ai-btn" title="AI Assistant">
          ✦
        </button>


        <button className={`btn btn-icon btn-sm ${runOpen ? 'btn-primary' : 'btn-ghost'}`} onClick={onToggleRun} id="toggle-terminal-btn" title="Toggle terminal">
          ⊞
        </button>
        <button className={`btn btn-icon btn-sm ${versionsOpen ? 'btn-primary' : 'btn-ghost'}`} onClick={onToggleVersions} id="toggle-versions-btn" title="History panel">
          ⬜
        </button>


        <button className="btn btn-icon btn-sm btn-ghost" onClick={onToggleTheme} id="toggle-theme-btn" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '☀' : '☽'}
        </button>


        {isConfigured && (<>
            <div className="topbar-divider"/>
            {user ? (<div className="avatar" style={{
                    width: 28, height: 28,
                    background: 'var(--accent)',
                    fontSize: 11, cursor: 'pointer',
                }} onClick={signOut} title={`${displayName} · Click to sign out`}>
                {avatarUrl
                    ? <img src={avatarUrl} alt={displayName}/>
                    : displayName.charAt(0).toUpperCase()}
              </div>) : (<Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>)}
          </>)}
      </div>
    </div>);
}
