import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import axios from 'axios';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  road: '🛣️', water: '💧', electricity: '⚡', garbage: '🗑️',
  emergency: '🚨', fire: '🔥', building: '🏗️', tree: '🌳',
  animal: '🐾', public_property: '🏛️', pollution: '🌫️', other: '📋',
};
const STATUS_COLORS  = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981' };
const STATUS_LABELS  = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' };
const PRIORITY_COLORS = { high: '#dc2626', medium: '#d97706', low: '#16a37a' };
const STEPS = ['pending', 'in_progress', 'resolved'];

function isOverdue(complaint) {
  if (!complaint.dueDate || complaint.status === 'resolved') return false;
  return new Date(complaint.dueDate) < new Date();
}

function timeLeft(dueDate) {
  const diff = new Date(dueDate) - new Date();
  if (diff <= 0) return 'Overdue';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  return `${h}h left`;
}

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

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/complaints/track`, { params: { email: user.email } })
      .then(({ data }) => setComplaints(data.complaints))
      .catch(() => toast.error('Failed to load complaints'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? complaints : complaints.filter((c) => c.status === filter);

  const stats = {
    total:       complaints.length,
    pending:     complaints.filter((c) => c.status === 'pending').length,
    in_progress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved:    complaints.filter((c) => c.status === 'resolved').length,
    overdue:     complaints.filter((c) => isOverdue(c)).length,
  };

  const resolvedPct = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className="page">

      {/* Profile header */}
      <div className="profile-header">
        <div className="profile-avatar">{user?.name?.[0]?.toUpperCase()}</div>
        <div className="profile-info">
          <h2 className="profile-name">{user?.name}</h2>
          <p className="profile-email">{user?.email}</p>
          <span className="profile-role">{user?.role}</span>
        </div>
        <button className="btn-primary" style={{ marginLeft: 'auto', alignSelf: 'center' }}
          onClick={() => navigate('/submit')}>
          + New Complaint
        </button>
      </div>

      {/* Stats row */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat__num">{stats.total}</span>
          <span className="profile-stat__label">Total</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__num" style={{ color: '#f59e0b' }}>{stats.pending}</span>
          <span className="profile-stat__label">Pending</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__num" style={{ color: '#3b82f6' }}>{stats.in_progress}</span>
          <span className="profile-stat__label">In Progress</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__num" style={{ color: '#10b981' }}>{stats.resolved}</span>
          <span className="profile-stat__label">Resolved</span>
        </div>
        {stats.overdue > 0 && (
          <div className="profile-stat">
            <span className="profile-stat__num" style={{ color: '#dc2626' }}>{stats.overdue}</span>
            <span className="profile-stat__label">Overdue</span>
          </div>
        )}
      </div>

      {/* Resolution bar */}
      {stats.total > 0 && (
        <div className="profile-progress">
          <div className="profile-progress__label">
            <span>Resolution rate</span>
            <strong>{resolvedPct}%</strong>
          </div>
          <div className="profile-progress__bar">
            <div className="profile-progress__fill" style={{ width: `${resolvedPct}%` }} />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="profile-tabs">
        {['all', 'pending', 'in_progress', 'resolved'].map((f) => (
          <button
            key={f}
            className={`profile-tab ${filter === f ? 'profile-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
            <span className="profile-tab__count">
              {f === 'all' ? stats.total : stats[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Complaints list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem', border: '2px dashed var(--border)', borderRadius: 16 }}>
          {filter === 'all' ? (
            <>No complaints yet. <button className="btn-link" onClick={() => navigate('/submit')}>Submit your first one →</button></>
          ) : `No ${STATUS_LABELS[filter]?.toLowerCase()} complaints.`}
        </div>
      ) : (
        filtered.map((c) => {
          const overdue = isOverdue(c);
          return (
            <div
              key={c.id}
              className={`profile-complaint ${overdue ? 'profile-complaint--overdue' : ''}`}
              onClick={() => navigate(`/ticket/${c.id}`)}
            >
              <div className="profile-complaint__header">
                <span className="profile-complaint__id">#{c.id}</span>
                <span className="profile-complaint__cat">
                  {CATEGORY_ICONS[c.category]} {c.category?.replace('_', ' ')}
                </span>
                <span className="badge" style={{ background: STATUS_COLORS[c.status], color: '#fff' }}>
                  {STATUS_LABELS[c.status]}
                </span>
                <span className="badge" style={{ background: PRIORITY_COLORS[c.priority], color: '#fff' }}>
                  {c.priority}
                </span>
                {overdue && <span className="overdue-badge">⏰ Overdue</span>}
                {c.dueDate && !overdue && c.status !== 'resolved' && (
                  <span className="sla-badge">🕐 {timeLeft(c.dueDate)}</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="profile-complaint__desc">{c.description}</p>
              {c.location && <p className="profile-complaint__loc">📍 {c.location}</p>}
              <div className="profile-complaint__footer">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🏢 {c.department}</span>
                <StatusStepper status={c.status} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
