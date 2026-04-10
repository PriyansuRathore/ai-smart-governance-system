import { useState, useEffect, useRef } from 'react';
import { getDepartmentComplaints, updateStatus } from '../api';
import { useWebSocket } from '../useWebSocket';
import { useAuth } from '../auth.jsx';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981' };
const PRIORITY_ICONS = { high: '🔴', medium: '🟡', low: '🟢' };

function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const end   = target ?? 0;
    prev.current = end;
    if (start === end) return;
    const steps = 30;
    const step  = (end - start) / steps;
    let current = start, i = 0;
    const id = setInterval(() => {
      i++; current += step;
      setCount(i >= steps ? end : Math.round(current));
      if (i >= steps) clearInterval(id);
    }, duration / steps);
    return () => clearInterval(id);
  }, [target]);
  return count;
}

function StatCard({ label, value, color, delay }) {
  const count = useCountUp(value);
  return (
    <div className="stat-card stat-card--anim" style={{ borderTop: `4px solid ${color}`, animationDelay: delay }}>
      <h3 className="stat-number">{count}</h3>
      <p>{label}</p>
      <div className="stat-bar" style={{ '--bar-color': color, '--bar-pct': `${Math.min((value ?? 0) * 10, 100)}%` }} />
    </div>
  );
}

export default function DepartmentDashboard() {
  const { user }                        = useAuth();
  const [complaints, setComplaints]     = useState([]);
  const [filter,     setFilter]         = useState({ status: '' });
  const [search,     setSearch]         = useState('');
  const [selected,   setSelected]       = useState(null);
  const [flashId,    setFlashId]        = useState(null);
  const [loading,    setLoading]        = useState(true);

  const fetchData = async () => {
    try {
      const { data } = await getDepartmentComplaints({});
      setComplaints(data.complaints);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useWebSocket((msg) => {
    if (msg.type === 'NEW_COMPLAINT' && msg.complaint.department === user?.department) {
      setComplaints((prev) => [msg.complaint, ...prev]);
      setFlashId(msg.complaint.id);
      setTimeout(() => setFlashId(null), 2000);
      toast(`🆕 New complaint assigned to ${user.department}!`);
    }
    if (msg.type === 'STATUS_UPDATE')
      setComplaints((prev) => prev.map((c) => c.id === msg.complaint.id ? msg.complaint : c));
  });

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatus(id, status);
      toast.success('Status updated');
      setComplaints((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      if (selected?.id === id) setSelected((prev) => ({ ...prev, status }));
    } catch {
      toast.error('Update failed');
    }
  };

  const filtered = complaints.filter((c) => {
    const matchStatus = !filter.status || c.status === filter.status;
    if (!search) return matchStatus;
    const q = search.toLowerCase();
    return matchStatus && (
      c.citizenName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total:       complaints.length,
    pending:     complaints.filter((c) => c.status === 'pending').length,
    in_progress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved:    complaints.filter((c) => c.status === 'resolved').length,
  };

  return (
    <div className="page">
      <section className="dashboard-banner">
        <div>
          <span className="eyebrow">Department Portal</span>
          <h2>{user?.department || 'Department Queue'}</h2>
          <p>Complaints assigned to your department. Review, action, and resolve them.</p>
        </div>
        <div className="banner-chip">
          <span className="live-dot" /> Live queue
        </div>
      </section>

      <div className="stats-grid">
        <StatCard label="Assigned"      value={stats.total}       color="#0f2d48" delay="0ms"   />
        <StatCard label="Pending"       value={stats.pending}     color="#f59e0b" delay="80ms"  />
        <StatCard label="In Progress"   value={stats.in_progress} color="#3b82f6" delay="160ms" />
        <StatCard label="Resolved"      value={stats.resolved}    color="#16a37a" delay="240ms" />
      </div>

      {/* Resolution rate bar */}
      {stats.total > 0 && (
        <div className="dept-progress">
          <div className="dept-progress__label">
            <span>Resolution Rate</span>
            <strong>{Math.round(((stats.resolved || 0) / stats.total) * 100)}%</strong>
          </div>
          <div className="dept-progress__bar">
            <div
              className="dept-progress__fill"
              style={{ width: `${Math.round(((stats.resolved || 0) / stats.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="🔍 Search complaints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter.status} onChange={(e) => setFilter({ status: e.target.value })}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Citizen</th><th>Description</th>
              <th>Priority</th><th>Status</th><th>Date</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr
                key={c.id}
                className={`clickable-row row-anim ${flashId === c.id ? 'row-flash' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => setSelected(c)}
              >
                <td>#{c.id}</td>
                <td>
                  <strong>{c.citizenName}</strong>
                  <div className="complaint-meta">{c.email}</div>
                </td>
                <td className="complaint-text">
                  {c.description?.length > 80 ? c.description.slice(0, 80) + '…' : c.description}
                </td>
                <td>
                  {PRIORITY_ICONS[c.priority]}
                  <span className={`badge ${c.priority}`} style={{ marginLeft: '0.4rem' }}>{c.priority}</span>
                </td>
                <td>
                  <span className="badge" style={{ background: STATUS_COLORS[c.status], color: '#fff' }}>
                    {c.status}
                  </span>
                </td>
                <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select value={c.status} onChange={(e) => handleStatusChange(c.id, e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="empty-state">
                {search ? `No results for "${search}"` : 'No complaints assigned to your department yet.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Complaint #{selected.id}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="result-grid">
                <div className="result-item"><span>Citizen</span><strong>{selected.citizenName}</strong></div>
                <div className="result-item"><span>Email</span><strong>{selected.email}</strong></div>
                <div className="result-item"><span>Priority</span><strong><span className={`badge ${selected.priority}`}>{selected.priority}</span></strong></div>
                <div className="result-item"><span>Date</span><strong>{new Date(selected.createdAt).toLocaleDateString()}</strong></div>
                <div className="result-item"><span>Status</span>
                  <strong>
                    <select
                      value={selected.status}
                      onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                      style={{ width: 'auto', padding: '0.3rem 0.5rem', borderRadius: '8px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </strong>
                </div>
                <div className="result-item"><span>Department</span><strong>{selected.department}</strong></div>
              </div>
              <div className="modal-description">
                <span className="field-label">Full Description</span>
                <p>{selected.description}</p>
              </div>
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt="Complaint" className="complaint-preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
