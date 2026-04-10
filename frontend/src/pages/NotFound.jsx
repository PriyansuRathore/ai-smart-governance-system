import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: 480, margin: '3rem auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏛️</div>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>404 — Page Not Found</h2>
        <p className="field-note" style={{ marginBottom: '2rem' }}>
          The page you're looking for doesn't exist or you don't have access.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>
          <button className="btn-outline" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    </div>
  );
}
