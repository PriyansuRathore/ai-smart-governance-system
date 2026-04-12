import { useState, useEffect, useRef } from 'react';
import { getComplaints, updateStatus, reassignComplaint, getAuditLog } from '../api';
import { useWebSocket } from '../useWebSocket';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { SkeletonRow, SkeletonCard } from '../components/Skeleton';

const CATEGORY_ICONS  = { road: '🛣️', water: '💧', electricity: '⚡', garbage: '🗑️', emergency: '🚨', fire: '🔥', building: '🏗️', tree: '🌳', animal: '🐾', public_property: '🏛️', pollution: '🌫️', other: '📋' };
const STATUS_COLORS   = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981' };
const CATEGORY_COLORS = { road: '#0f2d48', water: '#3b82f6', electricity: '#f59e0b', garbage: '#16a37a', emergency: '#dc2626', fire: '#ea580c', building: '#7c3aed', tree: '#15803d', animal: '#b45309', public_property: '#0369a1', pollution: '#4d7c0f', other: '#94a3b8' };
const PAGE_SIZE = 10;

/* ── Count-up hook ── */
function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current, end = target ?? 0;
    prev.current = end;
    if (start === end) return;
    if (end === 0) { setCount(0); return; }
    const steps = 30, step = (end - start) / steps;
    let cur = start, i = 0;
    const id = setInterval(() => {
      i++; cur += step;
      setCount(i >= steps ? end : Math.round(cur));
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

/* ── CSV Export ── */
function exportCSV(complaints) {
  const headers = ['ID', 'Name', 'Email', 'Description', 'Category', 'Department', 'Location', 'Priority', 'Status', 'Date'];
  const rows = complaints.map((c) => [
    c.id, c.citizenName, c.email,
    `"${c.description?.replace(/"/g, '""')}"`,
    c.category, c.department,
    `"${(c.location || '').replace(/"/g, '""')}"`,
    c.priority, c.status,
    new Date(c.createdAt).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `complaints_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported!');
}

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [filter,     setFilter]     = useState({ status: '', category: '' });
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [flashId,    setFlashId]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [showCharts, setShowCharts] = useState(false);
  const [auditLog,   setAuditLog]   = useState([]);
  const [reassigning, setReassigning] = useState(false);

  const DEPARTMENTS = [
    'Public Works Department','Water Supply Department','Electricity Department',
    'Sanitation Department','Emergency & Medical Services','Fire Department',
    'Civil Engineering Department','Parks & Horticulture Department',
    'Animal Control Department','Municipal Corporation','Environment Department','General Administration',
  ];
  const CATEGORY_LIST = ['road','water','electricity','garbage','emergency','fire','building','tree','animal','public_property','pollution','other'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const c = await getComplaints({});
      const arr = Array.isArray(c.data) ? c.data : [];
      setComplaints(arr);
    } catch (err) {
      console.error('fetchData error:', err.response?.status, err.response?.data || err.message);
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); setPage(1); }, [filter.status, filter.category]);

  useWebSocket((msg) => {
    if (msg.type === 'NEW_COMPLAINT') {
      setComplaints((prev) => [msg.complaint, ...prev]);
      setFlashId(msg.complaint.id);
      setTimeout(() => setFlashId(null), 2000);
      toast('🆕 New complaint received!');
    }
    if (msg.type === 'STATUS_UPDATE') {
      setComplaints((prev) => prev.map((c) => c.id === msg.complaint.id ? msg.complaint : c));
    }
  });

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatus(id, status);
      toast.success('Status updated');
      setComplaints((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      if (selected?.id === id) {
        setSelected((p) => ({ ...p, status }));
        const { data } = await getAuditLog(id);
        setAuditLog(data.logs);
      }
    } catch { toast.error('Update failed'); }
  };

  const handleSelect = async (c) => {
    setSelected(c);
    setAuditLog([]);
    try {
      const { data } = await getAuditLog(c.id);
      setAuditLog(data.logs);
    } catch {}
  };

  const handleReassign = async (id, department, category) => {
    setReassigning(true);
    try {
      const { data } = await reassignComplaint(id, { department, category });
      toast.success('Complaint reassigned');
      setComplaints((prev) => prev.map((c) => c.id === id ? { ...c, department: data.complaint.department, category: data.complaint.category } : c));
      setSelected((p) => ({ ...p, department: data.complaint.department, category: data.complaint.category }));
      const { data: al } = await getAuditLog(id);
      setAuditLog(al.logs);
    } catch { toast.error('Reassign failed'); }
    finally { setReassigning(false); }
  };

  const filtered = complaints.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.citizenName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Derived stats (always in sync with complaints list) ── */
  const stats = {
    total:       complaints.length,
    pending:     complaints.filter((c) => c.status === 'pending').length,
    in_progress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved:    complaints.filter((c) => c.status === 'resolved').length,
  };

  /* ── Chart data ── */
  const categoryData = Object.entries(
    complaints.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const statusData = [
    { name: 'Pending',     value: stats.pending     || 0 },
    { name: 'In Progress', value: stats.in_progress || 0 },
    { name: 'Resolved',    value: stats.resolved    || 0 },
  ];

  const priorityData = ['high', 'medium', 'low'].map((p) => ({
    name: p, value: complaints.filter((c) => c.priority === p).length,
  }));

  return (
    <div className="page">
      <section className="dashboard-banner">
        <div>
          <span className="eyebrow">Government Operations</span>
          <h2>AI Command Center</h2>
          <p>Track live complaints, review AI classification, and manage civic issues in real time.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-outline btn-sm" onClick={() => setShowCharts((s) => !s)}>
            {showCharts ? '📋 Hide Charts' : '📊 Show Charts'}
          </button>
          <button className="btn-outline btn-sm" onClick={() => exportCSV(filtered)}>
            ⬇️ Export CSV
          </button>
          <div className="banner-chip"><span className="live-dot" /> AI triage active</div>
        </div>
      </section>

      {/* Stats */}
      <div className="stats-grid">
        {loading ? Array.from({length:4}).map((_,i) => <SkeletonCard key={i} />) : <>
          <StatCard label="Total Cases"    value={stats.total}       color="#0f2d48" delay="0ms"   />
          <StatCard label="Pending Review" value={stats.pending}     color="#f59e0b" delay="80ms"  />
          <StatCard label="In Progress"    value={stats.in_progress} color="#3b82f6" delay="160ms" />
          <StatCard label="Resolved"       value={stats.resolved}    color="#16a37a" delay="240ms" />
        </>}
      </div>

      {/* Charts */}
      {showCharts && !loading && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Complaints by Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={Object.values(STATUS_COLORS)[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Priority Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  <Cell fill="#ab3f19" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#16a37a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <input className="search-input" placeholder="🔍 Search by name, email, location, department..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All Categories</option>
          <option value="road">🛣️ Road</option>
          <option value="water">💧 Water</option>
          <option value="electricity">⚡ Electricity</option>
          <option value="garbage">🗑️ Garbage</option>
          <option value="emergency">🚨 Emergency</option>
          <option value="fire">🔥 Fire</option>
          <option value="building">🏗️ Building</option>
          <option value="tree">🌳 Tree</option>
          <option value="animal">🐾 Animal</option>
          <option value="public_property">🏛️ Public Property</option>
          <option value="pollution">🌫️ Pollution</option>
          <option value="other">📋 Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Citizen</th><th>Description</th><th>Category</th>
              <th>Department</th><th>Location</th><th>Priority</th><th>Status</th><th>Date</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({length: 5}).map((_, i) => <SkeletonRow key={i} />)
              : paginated.map((c, i) => (
                <tr key={c.id}
                  className={`clickable-row row-anim ${flashId === c.id ? 'row-flash' : ''}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => handleSelect(c)}
                >
                  <td>#{c.id}</td>
                  <td><strong>{c.citizenName}</strong><div className="complaint-meta">{c.email}</div></td>
                  <td className="complaint-text">{c.description?.length > 80 ? c.description.slice(0,80)+'…' : c.description}</td>
                  <td>{CATEGORY_ICONS[c.category]} {c.category}</td>
                  <td>{c.department}</td>
                  <td>{c.location ? <span style={{ fontSize: '0.82rem' }}>📍 {c.location}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}</td>
                  <td><span className={`badge ${c.priority}`}>{c.priority}</span></td>
                  <td><span className="badge" style={{ background: STATUS_COLORS[c.status], color: '#fff' }}>{c.status}</span></td>
                  <td>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}
                    {c.dueDate && c.status !== 'resolved' && new Date(c.dueDate) < new Date() && (
                      <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, marginTop: '0.2rem' }}>⏰ Overdue</div>
                    )}
                    {c.dueDate && c.status !== 'resolved' && new Date(c.dueDate) >= new Date() && (
                      <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.2rem' }}>
                        Due: {new Date(c.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select value={c.status} onChange={(e) => handleStatusChange(c.id, e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              ))
            }
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} className="empty-state">
                {search ? `No results for "${search}"` : 'No complaints found.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(1)}        disabled={page === 1}>«</button>
          <button className="page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) => p === '...'
              ? <span key={`dot-${i}`} className="page-dots">…</span>
              : <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            )
          }
          <button className="page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
          <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          <span className="page-info">{filtered.length} total · page {page}/{totalPages}</span>
        </div>
      )}

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
                <div className="result-item"><span>Category</span><strong>{CATEGORY_ICONS[selected.category]} {selected.category}</strong></div>
                <div className="result-item"><span>Department</span><strong>{selected.department}</strong></div>
                <div className="result-item"><span>Location</span><strong>{selected.location || '—'}</strong></div>
                <div className="result-item"><span>Priority</span><strong><span className={`badge ${selected.priority}`}>{selected.priority}</span></strong></div>
                <div className="result-item"><span>Status</span>
                  <strong>
                    <select value={selected.status}
                      onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                      style={{ width: 'auto', padding: '0.3rem 0.5rem', borderRadius: '8px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </strong>
                </div>
              </div>
              <div className="modal-description">
                <span className="field-label">Full Description</span>
                <p>{selected.description}</p>
              </div>

              {/* Reassign section */}
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '1rem' }}>
                <span className="field-label" style={{ display: 'block', marginBottom: '0.6rem' }}>🔄 Reassign Complaint</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <select
                    defaultValue={selected.category}
                    id="reassign-cat"
                    style={{ flex: 1, minWidth: 140, padding: '0.5rem', borderRadius: 8, fontSize: '0.85rem' }}
                  >
                    {CATEGORY_LIST.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                  </select>
                  <select
                    defaultValue={selected.department}
                    id="reassign-dept"
                    style={{ flex: 2, minWidth: 180, padding: '0.5rem', borderRadius: 8, fontSize: '0.85rem' }}
                  >
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button
                    disabled={reassigning}
                    onClick={() => handleReassign(
                      selected.id,
                      document.getElementById('reassign-dept').value,
                      document.getElementById('reassign-cat').value,
                    )}
                    style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#0f2d48', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    {reassigning ? '...' : 'Reassign'}
                  </button>
                </div>
              </div>

              {/* Audit log */}
              {auditLog.length > 0 && (
                <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '1rem' }}>
                  <span className="field-label" style={{ display: 'block', marginBottom: '0.6rem' }}>📜 Audit Log</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {auditLog.map((log) => (
                      <div key={log.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</span>
                        <span style={{ flex: 1 }}>
                          <strong style={{ color: 'var(--text)' }}>{log.changedBy}</strong>
                          <span style={{ background: log.changedByRole === 'admin' ? '#fee2e2' : '#dbeafe', color: log.changedByRole === 'admin' ? '#dc2626' : '#2563eb', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700, marginLeft: '0.3rem' }}>{log.changedByRole}</span>
                          {' '}{log.action === 'status_change' ? 'changed status' : 'reassigned'}{' '}
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{log.fromValue}</span>
                          {' → '}
                          <strong style={{ color: 'var(--text)' }}>{log.toValue}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.imageUrl && <img src={selected.imageUrl} alt="Complaint" className="complaint-preview" style={{ marginTop: '0.5rem' }} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
