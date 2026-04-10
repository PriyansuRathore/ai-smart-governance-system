import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicComplaints, upvoteComplaint } from '../api';
import { useWebSocket } from '../useWebSocket';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  road: '🛣️', water: '💧', electricity: '⚡', garbage: '🗑️',
  emergency: '🚨', fire: '🔥', building: '🏗️', tree: '🌳',
  animal: '🐾', public_property: '🏛️', pollution: '🌫️', other: '📋',
};
const STATUS_COLORS  = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981' };
const STATUS_LABELS  = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' };
const PRIORITY_COLORS = { high: '#dc2626', medium: '#d97706', low: '#16a37a' };
const CATEGORIES = ['road','water','electricity','garbage','emergency','fire','building','tree','animal','public_property','pollution'];

function ComplaintCard({ complaint, voterEmail, onUpvote, onOpen, onReport }) {
  const hasVoted = complaint.upvotedBy?.includes(voterEmail);

  return (
    <div className="public-card" onClick={() => onOpen(complaint.id)}>

      {/* Header row */}
      <div className="public-card__header">
        <span className="public-card__id">#{complaint.id}</span>
        <span className="public-card__cat">
          {CATEGORY_ICONS[complaint.category] || '📋'} {complaint.category}
        </span>
        <div className="public-card__badges">
          <span className="public-card__badge" style={{ background: STATUS_COLORS[complaint.status] }}>
            {STATUS_LABELS[complaint.status]}
          </span>
          <span className="public-card__badge" style={{ background: PRIORITY_COLORS[complaint.priority] }}>
            {complaint.priority}
          </span>
        </div>
        <span className="public-card__date">{new Date(complaint.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Body */}
      <div className="public-card__body">
        <p className="public-card__desc">{complaint.description}</p>
        <div className="public-card__meta">
          {complaint.location && (
            <span className="public-card__location">📍 {complaint.location}</span>
          )}
          <span className="public-card__dept">🏢 {complaint.department}</span>
        </div>
      </div>

      {/* Footer actions */}
      <div className="public-card__footer" onClick={(e) => e.stopPropagation()}>
        <button
          className={`upvote-btn ${hasVoted ? 'upvote-btn--voted' : ''}`}
          onClick={() => onUpvote(complaint.id)}
          disabled={hasVoted}
          title={hasVoted ? 'Already upvoted' : 'Same issue in my area'}
        >
          👍 {complaint.upvotes || 0} {complaint.upvotes === 1 ? 'upvote' : 'upvotes'}
        </button>
        <button
          className="report-similar-btn"
          onClick={() => onReport(complaint)}
          title="Report this issue in your area"
        >
          📝 Report in my area
        </button>
        <button className="view-ticket-btn" onClick={() => onOpen(complaint.id)}>
          🎫 View Ticket
        </button>
      </div>
    </div>
  );
}

export default function PublicFeed() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [category,   setCategory]   = useState('');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [email,      setEmail]      = useState(() => localStorage.getItem('voterEmail') || '');
  const [emailInput, setEmailInput] = useState('');

  const fetchFeed = async (cat, pg) => {
    setLoading(true);
    try {
      const { data } = await getPublicComplaints({ category: cat, page: pg });
      setComplaints(data.complaints);
      setTotalPages(data.pages || 1);
    } catch { toast.error('Failed to load feed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFeed(category, page); }, [category, page]);

  useWebSocket((msg) => {
    if (msg.type === 'NEW_COMPLAINT') setComplaints((prev) => [msg.complaint, ...prev]);
    if (msg.type === 'UPVOTE')
      setComplaints((prev) => prev.map((c) => c.id === msg.complaintId ? { ...c, upvotes: msg.upvotes } : c));
  });

  const handleUpvote = async (id) => {
    if (!email) return toast.error('Save your email first to upvote');
    try {
      await upvoteComplaint(id, email);
      setComplaints((prev) => prev.map((c) => c.id === id
        ? { ...c, upvotes: (c.upvotes || 0) + 1, upvotedBy: [...(c.upvotedBy || []), email] }
        : c));
      toast.success('Upvoted!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upvote');
    }
  };

  const saveEmail = (e) => {
    e.preventDefault();
    if (!emailInput.includes('@')) return toast.error('Enter a valid email');
    localStorage.setItem('voterEmail', emailInput);
    setEmail(emailInput);
    toast.success('Email saved!');
  };

  return (
    <div className="page">

      {/* Banner */}
      <div className="feed-page-header">
        <div>
          <h2>🌐 Public Complaints Feed</h2>
          <p>Browse all civic complaints. Upvote issues in your area so authorities prioritize them.</p>
        </div>
        <div className="banner-chip"><span className="live-dot" /> Live updates</div>
      </div>

      {/* Email bar */}
      {!email ? (
        <div className="feed-email-bar">
          <p>💡 Save your email to upvote complaints and join discussions</p>
          <form onSubmit={saveEmail}>
            <input type="email" placeholder="your@email.com" value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)} required />
            <button type="submit">Save</button>
          </form>
        </div>
      ) : (
        <div className="feed-email-bar">
          <p>✅ Voting as <strong>{email}</strong></p>
          <span className="feed-voter-info">
            <button className="btn-link" onClick={() => { setEmail(''); localStorage.removeItem('voterEmail'); }}>
              Change email
            </button>
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="feed-toolbar">
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {loading ? 'Loading...' : `${complaints.length} complaints`}
        </span>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="feed-loading">
          {[1,2,3].map((i) => <div key={i} className="feed-skeleton" />)}
        </div>
      ) : complaints.length === 0 ? (
        <div className="empty-state" style={{ padding: '4rem', border: '2px dashed var(--border)', borderRadius: 18 }}>
          No complaints found.
        </div>
      ) : (
        complaints.map((c) => (
          <ComplaintCard
            key={c.id}
            complaint={c}
            voterEmail={email}
            onUpvote={handleUpvote}
            onOpen={(id) => navigate(`/ticket/${id}`)}
            onReport={(c) => navigate('/submit', { state: { description: `Similar issue: ${c.description}`, location: c.location || '' } })}
          />
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button className="page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
        </div>
      )}
    </div>
  );
}
