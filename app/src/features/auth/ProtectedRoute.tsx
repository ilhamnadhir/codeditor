import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
interface Props {
    children: React.ReactNode;
}
export default function ProtectedRoute({ children }: Props) {
    const { user, loading, isConfigured } = useAuth();
    const location = useLocation();
    if (loading) {
        return (<div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100vh', background: 'var(--bg)',
            }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spin" style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
          <div style={{ fontSize: 13 }}>Loading…</div>
        </div>
      </div>);
    }
    if (!isConfigured)
        return <>{children}</>;
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace/>;
    }
    return <>{children}</>;
}
