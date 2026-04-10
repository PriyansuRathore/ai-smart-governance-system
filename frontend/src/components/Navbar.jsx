import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useDarkMode } from '../useDarkMode';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { pathname }                      = useLocation();
  const navigate                          = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen]                   = useState(false);
  const [dark, toggleDark]                = useDarkMode();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
    setOpen(false);
  };

  const links = [
    { to: '/',           label: 'Home',            always: true },
    { to: '/feed',       label: '🌐 Public Feed',  always: true },
    { to: '/track',      label: 'Track',           always: true },
    { to: '/submit',     label: 'Submit',          roles: ['citizen', 'admin'] },
    { to: '/admin',      label: 'Admin Dashboard', roles: ['admin'] },
    { to: '/department', label: 'My Queue',        roles: ['department'] },
  ];

  const visible = links.filter((l) =>
    l.always || (isAuthenticated && l.roles?.includes(user?.role))
  );

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="nav-brand-title">🏛️ AI Governance</span>
        <span className="nav-brand-subtitle">Citizen support &amp; government triage</span>
      </div>

      {/* Desktop */}
      <div className="nav-links">
        {visible.map((l) => (
          <Link key={l.to} to={l.to} className={`nav-link ${pathname === l.to ? 'active' : ''}`}>
            {l.label}
          </Link>
        ))}
        {!isAuthenticated ? (
          <>
            <Link to="/login"    className={`nav-link ${pathname === '/login'    ? 'active' : ''}`}>Login</Link>
            <Link to="/register" className={`nav-link ${pathname === '/register' ? 'active' : ''}`}>Register</Link>
          </>
        ) : (
          <>
            <span className="nav-user">👤 {user.name}</span>
            <button className="nav-button" onClick={handleLogout}>Logout</button>
          </>
        )}
        <button className="nav-theme-btn" onClick={toggleDark} title="Toggle dark mode">
          {dark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Hamburger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button className="nav-theme-btn nav-theme-btn--mobile" onClick={toggleDark}>{dark ? '☀️' : '🌙'}</button>
        <button className="nav-hamburger" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          <span className={`ham-line ${open ? 'open' : ''}`} />
          <span className={`ham-line ${open ? 'open' : ''}`} />
          <span className={`ham-line ${open ? 'open' : ''}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="nav-drawer">
          {visible.map((l) => (
            <Link key={l.to} to={l.to}
              className={`nav-drawer-link ${pathname === l.to ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >{l.label}</Link>
          ))}
          {!isAuthenticated ? (
            <>
              <Link to="/login"    className="nav-drawer-link" onClick={() => setOpen(false)}>Login</Link>
              <Link to="/register" className="nav-drawer-link" onClick={() => setOpen(false)}>Register</Link>
            </>
          ) : (
            <>
              <span className="nav-drawer-link" style={{ opacity: 0.6, cursor: 'default' }}>👤 {user.name} · {user.role}</span>
              <button className="nav-drawer-link nav-drawer-logout" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
