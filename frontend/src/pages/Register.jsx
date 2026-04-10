import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../auth.jsx';

const DEPARTMENTS = [
  'Public Works Department',
  'Water Supply Department',
  'Electricity Department',
  'Sanitation Department',
  'General Administration',
];

function getHomeForRole(role) {
  if (role === 'admin')      return '/admin';
  if (role === 'department') return '/department';
  return '/';
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen', department: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.role === 'department' && !form.department)
      return toast.error('Please select your department');

    setLoading(true);
    try {
      const payload = { ...form };
      if (form.role !== 'department') delete payload.department;
      const data = await register(payload);
      toast.success('Registration successful!');
      navigate(getHomeForRole(data.user.role), { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card auth-card">
        <h2>Create Account</h2>
        <p className="field-note" style={{ marginBottom: '1rem' }}>
          Register as a citizen, admin, or department staff.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">Full Name</label>
            <input
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Email Address</label>
            <input
              type="email"
              placeholder="e.g. rahul@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, department: '' })}
            >
              <option value="citizen">🏠 Citizen — Submit complaints</option>
              <option value="department">🏢 Department Staff — Manage assigned complaints</option>
              <option value="admin">👑 Admin — Full access</option>
            </select>
          </div>

          {/* Show department selector only for department role */}
          {form.role === 'department' && (
            <div className="field-group dept-field">
              <label className="field-label">Your Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              >
                <option value="">— Select department —</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <p className="field-note">You will only see complaints assigned to this department.</p>
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : '🚀 Create Account'}
          </button>
        </form>
        <p className="auth-switch">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
