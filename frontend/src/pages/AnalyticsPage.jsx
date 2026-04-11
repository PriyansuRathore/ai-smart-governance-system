import { useState, useEffect } from 'react';
import { getAnalytics } from '../api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';

const CATEGORY_COLORS = {
  road: '#0f2d48', water: '#3b82f6', electricity: '#f59e0b', garbage: '#16a37a',
  emergency: '#dc2626', fire: '#ea580c', building: '#7c3aed', tree: '#15803d',
  animal: '#b45309', public_property: '#0369a1', pollution: '#4d7c0f', other: '#94a3b8',
};
const STATUS_COLORS  = { pending: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981' };
const PRIORITY_COLORS = { high: '#dc2626', medium: '#f59e0b', low: '#16a37a' };

function StatBox({ label, value, sub, color }) {
  return (
    <div className="analytics-stat" style={{ borderTop: `4px solid ${color}` }}>
      <div className="analytics-stat__value" style={{ color }}>{value ?? '—'}</div>
      <div className="analytics-stat__label">{label}</div>
      {sub && <div className="analytics-stat__sub">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page">
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading analytics...
      </div>
    </div>
  );

  if (!data) return null;

  const resolutionRate = data.total
    ? Math.round((data.byStatus.find(s => s.name === 'resolved')?.value || 0) / data.total * 100)
    : 0;

  return (
    <div className="page">

      {/* Header */}
      <section className="dashboard-banner">
        <div>
          <span className="eyebrow">Insights</span>
          <h2>📊 Analytics Dashboard</h2>
          <p>Complaint trends, department performance, and resolution insights.</p>
        </div>
        <div className="banner-chip"><span className="live-dot" /> Live data</div>
      </section>

      {/* Top stats */}
      <div className="analytics-stats">
        <StatBox label="Total Complaints"    value={data.total}              color="#0f2d48" />
        <StatBox label="Resolution Rate"     value={`${resolutionRate}%`}    color="#10b981" />
        <StatBox label="Overdue"             value={data.overdue}            color="#dc2626" />
        <StatBox
          label="Avg Resolution Time"
          value={data.avgResolutionHours != null ? `${data.avgResolutionHours}h` : 'N/A'}
          color="#3b82f6"
          sub={data.avgResolutionHours != null ? `${Math.round(data.avgResolutionHours / 24)}d avg` : null}
        />
      </div>

      {/* Daily trend */}
      <div className="analytics-card">
        <h3>📈 Complaints Over Last 30 Days</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.dailyTrend} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip labelFormatter={(d) => `Date: ${d}`} />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Complaints" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Row: category + department */}
      <div className="analytics-row">
        <div className="analytics-card">
          <h3>🏷️ By Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byCategory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6,6,0,0]} name="Complaints">
                {data.byCategory.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>🏢 By Department</h3>
          <div className="analytics-dept-list">
            {data.byDepartment.map((d, i) => {
              const pct = Math.round((d.value / data.total) * 100);
              return (
                <div key={d.name} className="analytics-dept-row">
                  <span className="analytics-dept-name">{d.name}</span>
                  <div className="analytics-dept-bar-wrap">
                    <div className="analytics-dept-bar" style={{ width: `${pct}%`, background: `hsl(${210 - i * 18}, 70%, 50%)` }} />
                  </div>
                  <span className="analytics-dept-count">{d.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row: priority + status + top locations */}
      <div className="analytics-row analytics-row--3">
        <div className="analytics-card">
          <h3>🚦 By Priority</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.byPriority.map((entry) => (
                  <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>📋 By Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.byStatus.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>📍 Top Locations</h3>
          {data.topLocations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '1rem 0' }}>
              No location data yet. Add locations when submitting complaints.
            </p>
          ) : (
            <div className="analytics-loc-list">
              {data.topLocations.map((l, i) => (
                <div key={l.location} className="analytics-loc-row">
                  <span className="analytics-loc-rank">#{i + 1}</span>
                  <span className="analytics-loc-name">{l.location}</span>
                  <span className="analytics-loc-count">{l.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
