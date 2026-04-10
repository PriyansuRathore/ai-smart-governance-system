import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { getPublicComplaints } from '../api';
import { useWebSocket } from '../useWebSocket';

const CATEGORY_ICONS = {
  road: '🛣️', water: '💧', electricity: '⚡', garbage: '🗑️',
  emergency: '🚨', fire: '🔥', building: '🏗️', tree: '🌳',
  animal: '🐾', public_property: '🏛️', pollution: '🌫️', other: '📋',
};
const STATUS_COLORS   = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981' };
const PRIORITY_COLORS = { high: '#dc2626', medium: '#d97706', low: '#16a37a' };

const FEATURES = [
  { icon: '🤖', title: 'AI Classification',      desc: 'Complaints are instantly classified into 11 categories — road, water, fire, building, animal, pollution and more.' },
  { icon: '🏢', title: 'Auto Department Routing', desc: 'Each complaint is automatically routed to the right government department.' },
  { icon: '⚡', title: 'Real-Time Updates',       desc: 'Admin dashboard updates live via WebSocket — no refresh needed.' },
  { icon: '📊', title: 'Analytics Dashboard',     desc: 'Track total, pending, in-progress, and resolved complaints at a glance.' },
  { icon: '🔍', title: 'Smart Filtering',         desc: 'Filter complaints by status or category. Search by name, email, or department.' },
  { icon: '🚨', title: 'Priority Detection',      desc: 'AI flags complaint urgency so critical issues — fires, injuries, collapses — get attention first.' },
];

const STEPS = [
  { num: '01', title: 'Citizen submits',  desc: 'Fill in your name, email, and describe the civic issue in plain language.' },
  { num: '02', title: 'AI classifies',    desc: 'The system reads the text, predicts the category, and assigns a department.' },
  { num: '03', title: 'Admin reviews',    desc: 'Government staff see the complaint live on the dashboard and update its status.' },
  { num: '04', title: 'Issue resolved',   desc: 'Complaint is marked resolved and the citizen gets confirmation.' },
];

const STATS = [
  { value: '11',   label: 'Issue Categories' },
  { value: 'AI',   label: 'Auto Classification' },
  { value: '24/7', label: 'Citizen Intake' },
  { value: '< 1s', label: 'Routing Speed' },
];

/* ── Floating Community Board Widget ── */
function CommunityWidget({ navigate }) {
  const [open,   setOpen]   = useState(false);
  const [feed,   setFeed]   = useState([]);
  const [active, setActive] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getPublicComplaints({ page: 1 })
      .then(({ data }) => setFeed(data.complaints?.slice(0, 8) || []))
      .catch(() => {});
  }, []);

  useWebSocket((msg) => {
    if (msg.type === 'NEW_COMPLAINT') {
      setFeed((prev) => [msg.complaint, ...prev].slice(0, 8));
      if (!open) setUnread((n) => n + 1);
    }
    if (msg.type === 'UPVOTE')
      setFeed((prev) => prev.map((c) => c.id === msg.complaintId ? { ...c, upvotes: msg.upvotes } : c));
  });

  const handleOpen = () => { setOpen(true); setUnread(0); };

  return (
    <>
      {/* Backdrop */}
      {open && <div className="cb-backdrop" onClick={() => { setOpen(false); setActive(null); }} />}

      {/* Popup panel */}
      <div className={`cb-panel ${open ? 'cb-panel--open' : ''}`}>
        {/* Panel header */}
        <div className="cb-panel__header">
          <div className="cb-panel__title">
            <span className="live-dot" />
            Community Board
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="cb-panel__view-all" onClick={() => { navigate('/feed'); setOpen(false); }}>
              View all →
            </button>
            <button className="cb-panel__close" onClick={() => { setOpen(false); setActive(null); }}>✕</button>
          </div>
        </div>

        {/* Two-pane body */}
        <div className="cb-panel__body">

          {/* Left: feed list */}
          <div className="cb-list">
            {feed.length === 0 && (
              <div className="cb-empty">No complaints yet.</div>
            )}
            {feed.map((c, i) => (
              <div
                key={c.id}
                className={`cb-item ${active?.id === c.id ? 'cb-item--active' : ''}`}
                onClick={() => setActive(active?.id === c.id ? null : c)}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="cb-item__icon">{CATEGORY_ICONS[c.category]}</span>
                <div className="cb-item__content">
                  <div className="cb-item__top">
                    <span className="cb-item__cat">{c.category?.replace('_', ' ')}</span>
                    <span className="cb-item__status" style={{ background: STATUS_COLORS[c.status] }}>
                      {c.status?.replace('_', ' ')}
                    </span>
                    <span className="cb-item__pri" style={{ background: PRIORITY_COLORS[c.priority] }}>
                      {c.priority}
                    </span>
                  </div>
                  <p className="cb-item__desc">
                    {c.description?.length > 72 ? c.description.slice(0, 72) + '…' : c.description}
                  </p>
                  <div className="cb-item__foot">
                    <span className="cb-item__votes">👍 {c.upvotes || 0}</span>
                    {c.location && <span className="cb-item__loc">📍 {c.location}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: detail pane */}
          <div className="cb-detail">
            {!active ? (
              <div className="cb-detail__empty">
                <span style={{ fontSize: '2rem' }}>👈</span>
                <p>Select a complaint to see details</p>
              </div>
            ) : (
              <div className="cb-detail__content">
                <div className="cb-detail__cat">
                  {CATEGORY_ICONS[active.category]} {active.category?.replace('_', ' ')}
                </div>
                <p className="cb-detail__desc">{active.description}</p>
                <div className="cb-detail__badges">
                  <span style={{ background: STATUS_COLORS[active.status], color: '#fff', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700 }}>
                    {active.status?.replace('_', ' ')}
                  </span>
                  <span style={{ background: PRIORITY_COLORS[active.priority], color: '#fff', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700 }}>
                    {active.priority}
                  </span>
                </div>
                {active.location && <p className="cb-detail__loc">📍 {active.location}</p>}
                <p className="cb-detail__dept">🏢 {active.department}</p>
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '0.65rem 1rem', marginTop: '0.5rem' }}
                  onClick={() => { navigate(`/ticket/${active.id}`); setOpen(false); }}
                >
                  🎫 Open Full Ticket
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* FAB */}
      <button className="cb-fab" onClick={handleOpen} title="Community Board">
        {open ? '✕' : '🌐'}
        {!open && unread > 0 && <span className="cb-fab__badge">{unread}</span>}
        {!open && <span className="cb-fab__label">Community</span>}
      </button>
    </>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const secondaryBtn = () => {
    if (!isAuthenticated) return { label: '🔑 Login / Register', path: '/login' };
    if (user?.role === 'admin') return { label: '📊 Admin Dashboard', path: '/admin' };
    if (user?.role === 'department') return { label: '🏢 My Department Queue', path: '/department' };
    return null;
  };
  const secondary = secondaryBtn();

  return (
    <div className="home">

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero__inner">
          <span className="eyebrow">AI-Powered Civic Platform</span>
          <h1 className="home-hero__title">
            Smart Governance<br />for Every Citizen
          </h1>
          <p className="home-hero__sub">
            Submit civic complaints in seconds. Our AI instantly classifies the issue,
            routes it to the right department, and flags urgency — so problems get fixed faster.
          </p>
          <div className="home-hero__actions">
            <button className="btn-primary" onClick={() => navigate('/submit')}>
              🚀 Submit a Complaint
            </button>
            {secondary && (
              <button className="btn-outline" onClick={() => navigate(secondary.path)}>
                {secondary.label}
              </button>
            )}
          </div>
        </div>
        <div className="home-hero__visual">
          <div className="hero-visual-card">
            <div className="hvc-header">
              <span className="live-dot" /> Live AI Triage
            </div>
            <div className="hvc-item hvc-item--flash">
              <span>🚨 Emergency — Injured person on road</span>
              <span className="badge high">high</span>
            </div>
            <div className="hvc-item">
              <span>🔥 Fire — Building fire near market</span>
              <span className="badge high">high</span>
            </div>
            <div className="hvc-item">
              <span>🛣️ Road — Pothole on MG Road</span>
              <span className="badge medium">medium</span>
            </div>
            <div className="hvc-item">
              <span>💧 Water — Pipe leak near school</span>
              <span className="badge medium">medium</span>
            </div>
            <div className="hvc-item">
              <span>🗑️ Garbage — Overflowing bin</span>
              <span className="badge low">low</span>
            </div>
            <div className="hvc-footer">AI routed 5 complaints → 5 departments</div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="home-stats">
        {STATS.map((s) => (
          <div className="home-stat" key={s.label}>
            <span className="home-stat__value">{s.value}</span>
            <span className="home-stat__label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="home-section">
        <div className="section-header">
          <span className="eyebrow">Platform Features</span>
          <h2>Everything needed for smart civic management</h2>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="home-section home-section--alt">
        <div className="section-header">
          <span className="eyebrow">How It Works</span>
          <h2>From complaint to resolution in 4 steps</h2>
        </div>
        <div className="steps-grid">
          {STEPS.map((s) => (
            <div className="step-card" key={s.num}>
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta">
        <h2>Ready to report a civic issue?</h2>
        <p>Takes less than a minute. AI handles the rest.</p>
        <button className="btn-primary btn-primary--lg" onClick={() => navigate('/submit')}>
          🚀 Submit Your Complaint
        </button>
      </section>

      {/* Floating Community Board */}
      <CommunityWidget navigate={navigate} />

    </div>
  );
}
