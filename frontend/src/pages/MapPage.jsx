import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { getComplaints } from '../api';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_COLORS = {
  road: '#0f2d48', water: '#3b82f6', electricity: '#f59e0b', garbage: '#16a37a',
  emergency: '#dc2626', fire: '#ea580c', building: '#7c3aed', tree: '#15803d',
  animal: '#b45309', public_property: '#0369a1', pollution: '#4d7c0f', other: '#94a3b8',
};
const CATEGORY_ICONS = {
  road: '🛣️', water: '💧', electricity: '⚡', garbage: '🗑️',
  emergency: '🚨', fire: '🔥', building: '🏗️', tree: '🌳',
  animal: '🐾', public_property: '🏛️', pollution: '🌫️', other: '📋',
};
const STATUS_COLORS = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981' };

// Create colored circle marker icon
function createIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Geocode location string using Nominatim (free, no key)
async function geocode(locationStr) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationStr + ', India')}&format=json&limit=1`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => m.coords));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers]);
  return null;
}

export default function MapPage() {
  const navigate  = useNavigate();
  const [markers,  setMarkers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [filter,   setFilter]   = useState('all');
  const [progress, setProgress] = useState(0);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');

  useEffect(() => {
    getComplaints({})
      .then(async ({ data }) => {
        const withLocation = (Array.isArray(data) ? data : []).filter((c) => c.location);
        setLoading(false);
        if (withLocation.length === 0) return;

        setGeocoding(true);
        const results = [];
        for (let i = 0; i < withLocation.length; i++) {
          const c = withLocation[i];
          const coords = await geocode(c.location);
          if (coords) results.push({ ...c, coords });
          setProgress(Math.round(((i + 1) / withLocation.length) * 100));
          // Rate limit Nominatim — 1 req/sec
          await new Promise((r) => setTimeout(r, 1100));
        }
        setMarkers(results);
        setGeocoding(false);
      })
      .catch(() => { toast.error('Failed to load complaints'); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? markers : markers.filter((m) => m.category === filter);
  const categories = [...new Set(markers.map((m) => m.category))];
  const selectedMarker = filtered.find((m) => String(m.id) === selectedComplaintId) || null;

  useEffect(() => {
    if (selectedComplaintId && !selectedMarker) {
      setSelectedComplaintId('');
    }
  }, [selectedComplaintId, selectedMarker]);

  function FocusMarker({ marker }) {
    const map = useMap();

    useEffect(() => {
      if (marker?.coords) {
        map.setView(marker.coords, 14, { animate: true });
      }
    }, [map, marker]);

    return null;
  }

  return (
    <div className="page">
      <section className="dashboard-banner">
        <div>
          <span className="eyebrow">Geo View</span>
          <h2>🗺️ Complaints Map</h2>
          <p>Visualize complaints by location. Only complaints with a location field are shown.</p>
        </div>
        <div className="banner-chip">
          {geocoding
            ? <><span className="live-dot" /> Geocoding {progress}%</>
            : <>{markers.length} complaints mapped</>
          }
        </div>
      </section>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button
          className={`profile-tab ${filter === 'all' ? 'profile-tab--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All <span className="profile-tab__count">{markers.length}</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`profile-tab ${filter === cat ? 'profile-tab--active' : ''}`}
            onClick={() => setFilter(cat)}
            style={filter === cat ? { background: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] } : {}}
          >
            {CATEGORY_ICONS[cat]} {cat}
            <span className="profile-tab__count">
              {markers.filter((m) => m.category === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="map-legend">
        {Object.entries(CATEGORY_COLORS).filter(([cat]) => categories.includes(cat)).map(([cat, color]) => (
          <span key={cat} className="map-legend__item">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            {CATEGORY_ICONS[cat]} {cat}
          </span>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ minWidth: 220, flex: 1 }}>
              <label className="field-label" htmlFor="complaint-selector" style={{ display: 'block', marginBottom: '0.45rem' }}>
                Focus on a complaint
              </label>
              <select
                id="complaint-selector"
                value={selectedComplaintId}
                onChange={(e) => setSelectedComplaintId(e.target.value)}
              >
                <option value="">Show all mapped complaints</option>
                {filtered.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} - {c.category} - {c.location}
                  </option>
                ))}
              </select>
            </div>
            {selectedMarker && (
              <button
                className="btn-outline btn-sm"
                onClick={() => navigate(`/ticket/${selectedMarker.id}`)}
              >
                Open selected ticket
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="map-placeholder">Loading complaints...</div>
      ) : markers.length === 0 && !geocoding ? (
        <div className="map-placeholder">
          <span style={{ fontSize: '2rem' }}>📍</span>
          <p>No complaints with location data found.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Add a location when submitting complaints to see them on the map.
          </p>
        </div>
      ) : (
        <div className="map-wrap">
          {geocoding && markers.length === 0 && (
            <div className="map-geocoding-overlay">
              <div className="map-geocoding-spinner" />
              <p>Geocoding locations... {progress}%</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>This may take a moment</p>
            </div>
          )}
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: '560px', width: '100%', borderRadius: 18, zIndex: 1 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {selectedMarker
              ? <FocusMarker marker={selectedMarker} />
              : filtered.length > 0 && <FitBounds markers={filtered} />
            }
            {filtered.map((c) => (
              <Marker key={c.id} position={c.coords} icon={createIcon(CATEGORY_COLORS[c.category] || '#94a3b8')}>
                <Popup maxWidth={280}>
                  <div style={{ fontFamily: 'Segoe UI, sans-serif', minWidth: 220 }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>#{c.id}</span>
                      <span style={{ fontSize: '0.78rem', background: CATEGORY_COLORS[c.category], color: '#fff', padding: '0.12rem 0.5rem', borderRadius: 999, fontWeight: 700 }}>
                        {CATEGORY_ICONS[c.category]} {c.category}
                      </span>
                      <span style={{ fontSize: '0.72rem', background: STATUS_COLORS[c.status], color: '#fff', padding: '0.12rem 0.5rem', borderRadius: 999, fontWeight: 700 }}>
                        {c.status}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', lineHeight: 1.5, color: '#1e293b' }}>
                      {c.description?.slice(0, 120)}{c.description?.length > 120 ? '…' : ''}
                    </p>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                      📍 {c.location} · 🏢 {c.department}
                    </p>
                    <button
                      onClick={() => navigate(`/ticket/${c.id}`)}
                      style={{ background: '#0f2d48', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', width: '100%' }}
                    >
                      🎫 View Ticket
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
