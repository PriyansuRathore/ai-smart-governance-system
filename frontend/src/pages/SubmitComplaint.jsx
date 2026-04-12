import { useState } from 'react';
import { submitComplaint, forceSubmitComplaint, predictImage } from '../api';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import toast from 'react-hot-toast';

const CATEGORIES = {
  road:            { icon: '🛣️', label: 'Road',            keywords: ['road','pothole','street','traffic','bridge','accident','pavement'] },
  water:           { icon: '💧', label: 'Water',           keywords: ['water','pipe','leak','flood','sewage','tap','drain','manhole'] },
  electricity:     { icon: '⚡', label: 'Electricity',     keywords: ['electricity','power','light','outage','wire','transformer','pole'] },
  garbage:         { icon: '🗑️', label: 'Garbage',         keywords: ['garbage','waste','trash','litter','dump','dustbin'] },
  emergency:       { icon: '🚨', label: 'Emergency',       keywords: ['accident','injured','bleeding','hurt','victim','crash','ambulance','unconscious'] },
  fire:            { icon: '🔥', label: 'Fire',            keywords: ['fire','burning','flame','smoke','blaze','explosion'] },
  building:        { icon: '🏗️', label: 'Building',        keywords: ['building','wall','collapse','construction','structure','roof'] },
  tree:            { icon: '🌳', label: 'Tree',            keywords: ['tree','branch','fallen tree','uprooted'] },
  animal:          { icon: '🐾', label: 'Animal',          keywords: ['dog','stray','animal','bite','cattle','monkey','snake','carcass'] },
  public_property: { icon: '🏛️', label: 'Public Property', keywords: ['bench','bus stop','toilet','graffiti','vandalism','signboard','park'] },
  pollution:       { icon: '🌫️', label: 'Pollution',       keywords: ['pollution','smoke','chemical','toxic','noise','factory','fumes'] },
};

const MAX_SIZE = 5 * 1024 * 1024;

function previewCategory(text) {
  const lower = text.toLowerCase();
  for (const [key, data] of Object.entries(CATEGORIES)) {
    if (data.keywords.some((kw) => lower.includes(kw))) return key;
  }
  return null;
}

export default function SubmitComplaint() {
  const location = useLocation();
  const prefill  = location.state || {};
  const { user } = useAuth();

  const [form, setForm] = useState({
    citizenName: user?.name  || '',
    email:       user?.email || '',
    description: prefill.description || '',
    location:    prefill.location    || '',
  });

  const isPrefilled = !!prefill.description;
  const [imageUrl, setImageUrl]   = useState('');
  const [imagePrediction, setImagePrediction] = useState(null);
  const [imageAnalyzing, setImageAnalyzing]   = useState(false);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [duplicates, setDuplicates] = useState(null);
  const [reasoning,  setReasoning]  = useState([]);

  const preview   = previewCategory(form.description);
  const charCount = form.description.length;

  const analyzeImage = async (b64, filename, description) => {
    setImagePrediction(null);
    setImageAnalyzing(true);
    try {
      const { data } = await predictImage({
        image: b64, filename, description,
      });
      setImagePrediction(data);
    } catch {
      setImagePrediction({ category: null, label: null, confidence: null, source: 'unavailable' });
    } finally {
      setImageAnalyzing(false);
    }
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return setImageUrl('');
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > MAX_SIZE) return toast.error('Image must be 5MB or smaller');
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result;
      setImageUrl(b64);
      await analyzeImage(b64, file.name, form.description);
    };
    reader.readAsDataURL(file);
  };

  const handleDescriptionChange = async (e) => {
    const description = e.target.value;
    setForm({ ...form, description });
    // Re-analyze image with updated description
    if (imageUrl && description.length > 10) {
      await analyzeImage(imageUrl, '', description);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDuplicates(null);
    try {
      const payload = {
        citizenName: form.citizenName,
        email:       form.email,
        description: form.description,
        location:    form.location || undefined,
        imageUrl:    imageUrl || undefined,
      };
      const { data } = await submitComplaint(payload);

      // Backend found similar complaints
      if (data.duplicate) {
        setDuplicates(data.similar);
        setLoading(false);
        return;
      }

      setResult(data.complaint);
      setReasoning(data.reasoning || []);
      setForm({ citizenName: user?.name || '', email: user?.email || '', description: '', location: '' });
      setImageUrl('');
      setImagePrediction(null);
      setDuplicates(null);
      toast.success('Complaint submitted!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForceSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await forceSubmitComplaint({
        citizenName: form.citizenName,
        email:       form.email,
        description: form.description,
        location:    form.location || undefined,
        imageUrl:    imageUrl || undefined,
      });
      setResult(data.complaint);
      setReasoning(data.reasoning || []);
      setForm({ citizenName: user?.name || '', email: user?.email || '', description: '', location: '' });
      setImageUrl('');
      setImagePrediction(null);
      setDuplicates(null);
      toast.success('Complaint submitted!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Citizen AI Desk</span>
          <h1 className="hero-title">Report civic problems — AI routes them instantly.</h1>
          <p className="hero-subtitle">
            Describe the issue in plain language. The system classifies it, assigns the right
            department, and flags urgency — all before staff review.
          </p>
          <div className="hero-metrics">
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <div className="metric-card" key={key}>
                <div className="metric-value">{c.icon}</div>
                <div className="metric-label">{c.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-side">
          <div className="signal-card">
            <h3>What happens after submission</h3>
            <ul className="signal-list">
              <li><strong>1. AI reads the complaint</strong><span>Text is classified into a service category.</span></li>
              <li><strong>2. Department is assigned</strong><span>Routed automatically for faster handling.</span></li>
              <li><strong>3. Priority is flagged</strong><span>High-risk cases get urgent attention.</span></li>
            </ul>
          </div>
          <div className="insight-card">
            <h3>Tips for a good complaint</h3>
            <ul className="insight-list">
              <li><strong>Location</strong><span>Area, road, ward, or landmark.</span></li>
              <li><strong>Problem</strong><span>What is broken, blocked, leaking, or unsafe.</span></li>
              <li><strong>Impact</strong><span>Affects traffic, homes, schools, or safety.</span></li>
            </ul>
          </div>
        </div>
      </section>

      <div className="card">
        <h2>Submit a Complaint</h2>
        <p className="field-note" style={{ marginBottom: '1.25rem' }}>
          Fill in your details and describe the issue. AI will classify and route it automatically.
        </p>

        {isPrefilled && (
          <div style={{
            background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14,
            padding: '0.85rem 1.1rem', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '1.1rem' }}>📋</span>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.88rem', color: '#1e40af' }}>Reporting a similar issue</strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#3b82f6' }}>
                Pre-filled from an existing complaint — update the description with your specific location and details.
              </p>
            </div>
            <button
              type="button"
              className="btn-link"
              style={{ fontSize: '0.8rem', color: '#6b7280' }}
              onClick={() => setForm({ citizenName: form.citizenName, email: form.email, description: '', location: '' })}
            >
              Clear
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="name">Your Name</label>
              {user ? (
                <div className="locked-field">
                  <span>👤 {user.name}</span>
                  <span className="locked-badge">from your account</span>
                </div>
              ) : (
                <input id="name" placeholder="e.g. Rahul Sharma" value={form.citizenName}
                  onChange={(e) => setForm({ ...form, citizenName: e.target.value })} required />
              )}
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="email">Email Address</label>
              {user ? (
                <div className="locked-field">
                  <span>✉️ {user.email}</span>
                  <span className="locked-badge">from your account</span>
                </div>
              ) : (
                <input id="email" type="email" placeholder="e.g. rahul@email.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              )}
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="location">Location <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(area, landmark, or address)</span></label>
            <input id="location" placeholder="e.g. MG Road near City Hospital, Ward 5"
              value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>

          <div className="field-group">
            <div className="field-label-row">
              <label className="field-label" htmlFor="description">Complaint Details</label>
              {preview && (
                <span className="category-preview">
                  {CATEGORIES[preview].icon} AI predicts: <strong>{CATEGORIES[preview].label}</strong>
                </span>
              )}
            </div>
            <p className="field-note">e.g. "Large pothole near City Hospital causing bike accidents at night."</p>
            <textarea
              id="description"
              placeholder="Describe the issue, its location, and why it needs attention..."
              rows={5}
              value={form.description}
              onChange={handleDescriptionChange}
              required
            />
            <div className="char-counter" style={{ color: charCount > 500 ? '#ab3f19' : '#698095' }}>
              {charCount} characters {charCount > 100 ? '✓' : '— add more detail for better AI accuracy'}
            </div>
          </div>

          {/* Image upload */}
          <div className="field-group">
            <label className="field-label">Supporting Photo <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
            <p className="field-note">Attach a photo — AI will analyze it to assist classification. Max 5MB.</p>
            <label className="upload-label" htmlFor="image-upload">
              {imageUrl
                ? <img src={imageUrl} alt="Preview" className="complaint-preview" />
                : <div className="upload-placeholder">📷 Click to upload image</div>
              }
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImage}
              />
            </label>

            {imageAnalyzing && (
              <div className="image-ai-result image-ai-result--loading">
                🤖 Analyzing image...
              </div>
            )}

            {imagePrediction && !imageAnalyzing && (
              <div className={`image-ai-result ${imagePrediction.source === 'unavailable' ? 'image-ai-result--warn' : 'image-ai-result--ok'}`}>
                {imagePrediction.source === 'unavailable' ? (
                  <>⚠️ AI service offline — image stored but not analyzed</>
                ) : (
                  <>
                    🤖 Image detected: <strong>{imagePrediction.label}</strong>
                    {imagePrediction.confidence && <> &nbsp;·&nbsp; {imagePrediction.confidence}% confidence</>}
                    &nbsp;·&nbsp; Category hint: <strong>{CATEGORIES[imagePrediction.category]?.icon} {imagePrediction.category}</strong>
                    {imagePrediction.source === 'color-fallback' && <> &nbsp;<span style={{opacity:0.6}}>(color analysis)</span></>}
                  </>
                )}
              </div>
            )}

            {imageUrl && (
              <button
                type="button"
                className="remove-image-btn"
                onClick={() => {
                  setImageUrl('');
                  setImagePrediction(null);
                  document.getElementById('image-upload').value = '';
                }}
              >
                ✕ Remove image
              </button>
            )}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? '⏳ Submitting...' : '🚀 Submit Complaint'}
          </button>
        </form>

        {/* Duplicate warning */}
        {duplicates && (
          <div style={{ marginTop: '1.5rem', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 16, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '1.3rem' }}>⚠️</span>
              <div>
                <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>Similar complaints already exist</strong>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#b45309' }}>Consider upvoting them instead of creating a duplicate.</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
              {duplicates.map((d) => (
                <div key={d.id} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700, marginBottom: '0.2rem' }}>#{d.id} · {d.category} · {d.status}</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#1c1917' }}>{d.description?.slice(0, 100)}{d.description?.length > 100 ? '…' : ''}</p>
                    {d.location && <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#78716c' }}>📍 {d.location}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999 }}>
                      {Math.round((d.score || 0) * 100)}% match
                    </span>
                    <a href={`/ticket/${d.id}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, textDecoration: 'none', padding: '0.25rem 0.6rem', border: '1px solid #bfdbfe', borderRadius: 8 }}>
                      View →
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setDuplicates(null)}
                style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: '1.5px solid #d97706', background: 'transparent', color: '#d97706', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
              >
                ✏️ Edit my complaint
              </button>
              <button
                onClick={handleForceSubmit}
                disabled={loading}
                style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none', background: '#0f2d48', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
              >
                {loading ? '⏳ Submitting...' : '🚀 Submit anyway (different location)'}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="result-card">
            <h3>✅ AI Intake Summary</h3>
            <div className="result-grid">
              <div className="result-item"><span>Complaint ID</span><strong>#{result.id}</strong></div>
              <div className="result-item"><span>Category</span><strong>{CATEGORIES[result.category]?.icon} {result.category}</strong></div>
              <div className="result-item"><span>Department</span><strong>{result.department}</strong></div>
              <div className="result-item"><span>Priority</span><strong><span className={`badge ${result.priority}`}>{result.priority}</span></strong></div>
              <div className="result-item"><span>Status</span><strong><span className={`badge ${result.status}`}>{result.status}</span></strong></div>
              <div className="result-item"><span>Next Step</span><strong>Queued for government review</strong></div>
            </div>

            {/* AI Priority Reasoning */}
            {reasoning.length > 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                  🤖 Why {result.priority} priority?
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {reasoning.map((r, i) => (
                    <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.imageUrl && <img src={result.imageUrl} alt="Submitted" className="complaint-preview" style={{ marginTop: '0.5rem' }} />}
          </div>
        )}
      </div>
    </div>
  );
}
