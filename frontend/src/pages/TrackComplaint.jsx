import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  road: '🛣️', water: '💧', electricity: '⚡', garbage: '🗑️',
  emergency: '🚨', fire: '🔥', building: '🏗️', tree: '🌳',
  animal: '🐾', public_property: '🏛️', pollution: '🌫️', other: '📋',
};
const STATUS_COLORS = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981' };
const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' };
const STEPS = ['pending', 'in_progress', 'resolved'];

function StatusStepper({ status }) {
  const current = STEPS.indexOf(status);
  return (
    <div className="stepper">
      {STEPS.map((s, i) => (
        <div key={s} className={`stepper-step ${i <= current ? 'done' : ''} ${i === current ? 'active' : ''}`}>
          <div className="stepper-dot">{i < current ? '✓' : i + 1}</div>
          <span>{STATUS_LABELS[s]}</span>
          {i < STEPS.length - 1 && <div className={`stepper-line ${i < current ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

export default function TrackComplaint() {
  const [email,      setEmail]      = useState('');
  const [complaints, setComplaints] = useState([]);
  const [searched,   setSearched]   = useState(false);
  const [loading,    setLoading]    = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/complaints/track`, {
        params: { email: email.trim() },
      });
      setComplaints(data.complaints);
      setSearched(true);
      if (data.complaints.length === 0) toast('No complaints found for this email');
    } catch {
      toast.error('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
        <h2>🔍 Track Your Complaint</h2>
        <p className="field-note" style={{ marginBottom: '1.5rem' }}>
          Enter the email you used when submitting your complaint.
        </p>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {searched && complaints.length === 0 && (
          <div className="empty-state" style={{ padding: '2rem', background: 'var(--bg)', borderRadius: 12 }}>
            No complaints found for <strong>{email}</strong>
          </div>
        )}

        {complaints.map((c) => (
          <div key={c.id} className="track-card">
            <div className="track-card__header">
              <div>
                <span className="eyebrow">Complaint #{c.id}</span>
                <p className="track-desc">{c.description}</p>
              </div>
              <span className="badge" style={{ background: STATUS_COLORS[c.status], color: '#fff', whiteSpace: 'nowrap' }}>
                {STATUS_LABELS[c.status]}
              </span>
            </div>
            <div className="track-meta">
              <span>{CATEGORY_ICONS[c.category] || '📋'} {c.category}</span>
              <span>🏢 {c.department}</span>
              <span className={`badge ${c.priority}`}>{c.priority}</span>
              <span>📅 {new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
            <StatusStepper status={c.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
