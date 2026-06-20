import { Link } from 'react-router-dom';
export default function NotFound() {
    return (<div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16,
        }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>404</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Page not found</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        The room or page you're looking for doesn't exist.
      </div>
      <Link to="/" className="btn btn-primary">← Back to CodeSync</Link>
    </div>);
}
