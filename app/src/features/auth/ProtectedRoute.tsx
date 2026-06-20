import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

interface Props {
  children: React.ReactNode
}

/**
 * Redirects unauthenticated users to /login.
 * If Supabase is not configured, lets everyone through (dev mode).
 */
export default function ProtectedRoute({ children }: Props) {
  const { user, loading, isConfigured } = useAuth()
  const location = useLocation()

  // Still checking session
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spin" style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
          <div style={{ fontSize: 13 }}>Loading…</div>
        </div>
      </div>
    )
  }

  // Supabase not configured → allow access in dev mode
  if (!isConfigured) return <>{children}</>

  // Not logged in → redirect to login, preserving the intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
