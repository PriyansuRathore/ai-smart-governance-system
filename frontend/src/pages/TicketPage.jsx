import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getComplaint, getComments, postComment, upvoteComplaint, updateStatus } from '../api';
import { useWebSocket } from '../useWebSocket';
import { useAuth } from '../auth.jsx';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  road: '🛣️', water: '💧', electricity: '⚡', garbage: '🗑️',
  emergency: '🚨', fire: '🔥', building: '🏗️', tree: '🌳',
  animal: '🐾', public_property: '🏛️', pollution: '🌫️', other: '📋',
};
const STATUS_COLORS  = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981' };
const STATUS_LABELS  = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' };
const PRIORITY_COLORS = { high: '#dc2626', medium: '#f59e0b', low: '#16a37a' };
const ROLE_COLORS    = { admin: '#dc2626', department: '#2563eb', citizen: '#16a37a' };
const STEPS = ['pending', 'in_progress', 'resolved'];

export default function TicketPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const bottomRef    = useRef(null);

  const [complaint,  setComplaint]  = useState(null);
  const [comments,   setComments]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guestName,  setGuestName]  = useState('');
  const [guestEmail, setGuestEmail] = useState(() => localStorage.getItem('voterEmail') || '');

  useEffect(() => {
    Promise.all([getComplaint(id), getComments(id)])
      .then(([c, cm]) => {
        setComplaint(c.data.complaint);
        setComments(cm.data.comments);
      })
      .catch(() => toast.error('Failed to load ticket'))
      .finally(() => setLoading(false));
  }, [id]);

  useWebSocket((msg) => {
    if (msg.type === 'NEW_COMMENT' && msg.complaintId === parseInt(id))
      setComments((prev) => [...prev, msg.comment]);
    if (msg.type === 'STATUS_UPDATE' && msg.complaint.id === parseInt(id))
      setComplaint((prev) => ({ ...prev, status: msg.complaint.status }));
    if (msg.type === 'UPVOTE' && msg.complaintId === parseInt(id))
      setComplaint((prev) => ({ ...prev, upvotes: msg.upvotes }));
  });

  const handleComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const name  = user?.name  || guestName.trim();
    const email = user?.email || guestEmail.trim();
    const role  = user?.role  || 'citizen';
    if (!name || !email) return toast.error('Enter your name and email to comment');
    setSubmitting(true);
    try {
      await postComment(id, { authorName: name, authorEmail: email, text: text.trim(), role });
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post');
    } finally { setSubmitting(false); }
  };

  const handleUpvote = async () => {
    const email = user?.email || guestEmail;
    if (!email) return toast.error('Enter your email to upvote');
    try {
      await upvoteComplaint(id, email);
      setComplaint((prev) => ({
        ...prev,
        upvotes: (prev.upvotes || 0) + 1,
        upvotedBy: [...(prev.upvotedBy || []), email],
      }));
      toast.success('Upvoted!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upvote');
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await updateStatus(id, status);
      setComplaint((prev) => ({ ...prev, status }));
      toast.success('Status updated');
    } catch { toast.error('Update failed'); }
  };

  if (loading) return <div className="page"><div className="ticket-loading">Loading ticket...</div></div>;
  if (!complaint) return <div className="page"><div className="ticket-loading">Ticket not found.</div></div>;

  const voterEmail = user?.email || guestEmail;
  const hasVoted   = complaint.upvotedBy?.includes(voterEmail);
  const canManage  = user?.role === 'admin' || user?.role === 'department';
  const currentStep = STEPS.indexOf(complaint.status);

  return (
    <div className="page ticket-page">

      {/* Back */}
      <button className="ticket-back" onClick={() => navigate(-1)}>← Back</button>

      <div className="ticket-layout">

        {/* ── LEFT: Main content ── */}
        <div className="ticket-main">

          {/* Header */}
          <div className="ticket-header">
            <div className="ticket-header__top">
              <span className="ticket-id">#{complaint.id}</span>
              <span className="ticket-cat">{CATEGORY_ICONS[complaint.category]} {complaint.category}</span>
              <span className="badge" style={{ background: STATUS_COLORS[complaint.status], color: '#fff' }}>
                {STATUS_LABELS[complaint.status]}
              </span>
              <span className="badge" style={{ background: PRIORITY_COLORS[complaint.priority], color: '#fff' }}>
                {complaint.priority}
              </span>
            </div>
            <p className="ticket-desc">{complaint.description}</p>
            {complaint.location && <p className="ticket-location">📍 {complaint.location}</p>}
          </div>

          {/* Status timeline */}
          <div className="ticket-timeline">
            {STEPS.map((s, i) => (
              <div key={s} className={`tl-step ${i <= currentStep ? 'tl-step--done' : ''} ${i === currentStep ? 'tl-step--active' : ''}`}>
                <div className="tl-dot">{i < currentStep ? '✓' : i + 1}</div>
                <span>{STATUS_LABELS[s]}</span>
                {i < STEPS.length - 1 && <div className={`tl-line ${i < currentStep ? 'tl-line--done' : ''}`} />}
              </div>
            ))}
          </div>

          {/* Image */}
          {complaint.imageUrl && (
            <div className="ticket-image-wrap">
              <img src={complaint.imageUrl} alt="Complaint" className="ticket-image" />
            </div>
          )}

          {/* ── Discussion thread ── */}
          <div className="ticket-discussion">
            <h3 className="ticket-section-title">💬 Discussion Thread</h3>

            <div className="thread">
              {comments.length === 0 && (
                <div className="thread-empty">No comments yet. Start the discussion below.</div>
              )}
              {comments.map((c) => (
                <div key={c.id} className={`thread-msg ${c.role === 'admin' || c.role === 'department' ? 'thread-msg--official' : ''}`}>
                  <div className="thread-msg__avatar" style={{ background: ROLE_COLORS[c.role] || '#94a3b8' }}>
                    {c.authorName[0].toUpperCase()}
                  </div>
                  <div className="thread-msg__body">
                    <div className="thread-msg__header">
                      <span className="thread-author">{c.authorName}</span>
                      <span className="thread-role" style={{ background: ROLE_COLORS[c.role] || '#94a3b8' }}>{c.role}</span>
                      <span className="thread-time">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="thread-text">{c.text}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Guest email if not logged in */}
            {!user && (
              <div className="thread-guest">
                <input placeholder="Your name" value={guestName} onChange={(e) => setGuestName(e.target.value)} style={{ flex: 1 }} />
                <input type="email" placeholder="Your email" value={guestEmail}
                  onChange={(e) => { setGuestEmail(e.target.value); localStorage.setItem('voterEmail', e.target.value); }}
                  style={{ flex: 1 }} />
              </div>
            )}

            <form onSubmit={handleComment} className="thread-input">
              <textarea
                placeholder={user ? `Comment as ${user.name} (${user.role})...` : 'Add your comment...'}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <div className="thread-input__footer">
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{text.length}/1000</span>
                <button type="submit" disabled={submitting || !text.trim()}>
                  {submitting ? 'Posting...' : '📨 Post Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="ticket-sidebar">

          <div className="ticket-sidebar__section">
            <h4>Details</h4>
            <div className="ticket-detail-row"><span>Department</span><strong>{complaint.department}</strong></div>
            <div className="ticket-detail-row"><span>Category</span><strong>{CATEGORY_ICONS[complaint.category]} {complaint.category}</strong></div>
            <div className="ticket-detail-row"><span>Priority</span>
              <strong><span className={`badge ${complaint.priority}`}>{complaint.priority}</span></strong>
            </div>
            <div className="ticket-detail-row"><span>Status</span>
              <strong><span className="badge" style={{ background: STATUS_COLORS[complaint.status], color: '#fff' }}>{STATUS_LABELS[complaint.status]}</span></strong>
            </div>
            <div className="ticket-detail-row"><span>Submitted</span><strong>{new Date(complaint.createdAt).toLocaleDateString()}</strong></div>
            {complaint.location && <div className="ticket-detail-row"><span>Location</span><strong>{complaint.location}</strong></div>}
          </div>

          {/* Upvote */}
          <div className="ticket-sidebar__section">
            <h4>Community Support</h4>
            <button
              className={`upvote-btn upvote-btn--full ${hasVoted ? 'upvote-btn--voted' : ''}`}
              onClick={handleUpvote}
              disabled={hasVoted}
            >
              👍 {complaint.upvotes || 0} {complaint.upvotes === 1 ? 'person has' : 'people have'} this issue
            </button>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Upvote if you face the same issue in your area
            </p>
          </div>

          {/* Admin/Dept status control */}
          {canManage && (
            <div className="ticket-sidebar__section">
              <h4>Update Status</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {STEPS.map((s) => (
                  <button
                    key={s}
                    className={`status-btn ${complaint.status === s ? 'status-btn--active' : ''}`}
                    style={{ '--sc': STATUS_COLORS[s] }}
                    onClick={() => handleStatusChange(s)}
                    disabled={complaint.status === s}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
