import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLogo from '../../components/AppLogo/AppLogo';
import toast from 'react-hot-toast';
import './LoginPage.css';

const FEATURES = [
  { icon: '🏢', label: 'Multi-branch management' },
  { icon: '📊', label: 'MIS/SIS investment plans' },
  { icon: '🛡️', label: 'Benefits tracking' },
  { icon: '💳', label: 'Real-time wallet control' },
];

function UserIcon() {
  return (
    <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg className="login-eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg className="login-eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    const saved = localStorage.getItem('login_remember_user');
    if (saved) {
      setForm(f => ({ ...f, username: saved }));
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) {
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await login({
        username: form.username.trim(),
        password: form.password.trim(),
      });
      if (remember) {
        localStorage.setItem('login_remember_user', form.username.trim());
      } else {
        localStorage.removeItem('login_remember_user');
      }
      toast.success(`Welcome, ${user.full_name}!`);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (!err.response) {
        setError('Cannot reach the API server. Please check that the backend is running.');
      } else if (status === 502 || status === 404) {
        setError(msg || 'Login API not found. Please contact support.');
      } else {
        setError(msg || 'Invalid username or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left — branding */}
      <div className="login-left">
        <div className="login-left-glow" />
        <div className="login-left-chart" />
        <div className="login-left-inner">
          <div className="login-brand">
            <AppLogo size={64} className="brand-logo" />
            <div className="brand-name">DefOex</div>
            <div className="brand-tagline">InfraTech Private Limited</div>
          </div>

          <div className="login-hero">
            <h1>Smart Investment<br />Management System</h1>
            <p>
              Manage branches, investors, plans, benefits &amp; wallets — all in one secure platform.
            </p>
          </div>

          <ul className="login-features">
            {FEATURES.map(f => (
              <li key={f.label} className="feature-item">
                <span className="feature-icon">{f.icon}</span>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="login-left-footer">
          <span className="login-security-icon">🛡️</span>
          Enterprise-grade security for your peace of mind
        </div>
        <div className="login-skyline" aria-hidden="true" />
        <div className="login-waves" aria-hidden="true" />
      </div>

      {/* Right — sign in */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card-logo-wrap">
            <AppLogo size={52} className="login-card-logo" />
          </div>

          <div className="login-card__header">
            <h2>Welcome Back</h2>
            <p>Sign in to access your account</p>
          </div>

          <div className="login-card-divider" aria-hidden="true">
            <span className="login-card-divider-line" />
            <span className="login-card-divider-gem">◆</span>
            <span className="login-card-divider-line" />
          </div>

          {error && (
            <div className="login-error">
              <span className="login-error__icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-username">Username / Email</label>
              <div className="login-input-wrap">
                <UserIcon />
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter username or email"
                  value={form.username}
                  onChange={e => { setForm({ ...form, username: e.target.value }); setError(''); }}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <LockIcon />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <button type="button" className="login-forgot-link" onClick={() => toast('Contact your administrator to reset password.')}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : <LockIcon />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-card-or">
            <span>or</span>
          </div>

          <p className="login-support">
            Need help?{' '}
            <a href="mailto:support@defoex.com">Contact Support Team</a>
          </p>
        </div>

        <div className="login-footer">
          <span>CIN – U68100MP2026PTC083560</span>
          <span>© 2026 DefOex InfraTech Pvt. Ltd.</span>
        </div>
      </div>
    </div>
  );
}
