import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) {
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome, ${user.full_name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message;
      const isNetwork = !err.response;
      if (isNetwork) {
        setError('Cannot connect to server. Make sure the backend is running on port 5000.');
      } else {
        setError(msg || 'Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-brand">
          <div className="brand-logo">D</div>
          <div>
            <div className="brand-name">DefOex</div>
            <div className="brand-tagline">IntraTech Private Limited</div>
          </div>
        </div>
        <div className="login-hero">
          <h1>Smart Investment<br />Management System</h1>
          <p>Manage branches, investors, plans, commissions & wallets — all in one secure platform.</p>
          <div className="login-features">
            {['Multi-branch management', 'MIS/SIS investment plans', 'Commission tracking', 'Real-time wallet control'].map(f => (
              <div key={f} className="feature-item">
                <span className="feature-check">✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        <div className="login-credentials-hint">
          <div className="hint-title">Default Login</div>
          <div className="hint-row"><span>Username</span><code>superadmin</code></div>
          <div className="hint-row"><span>Password</span><code>Defoex@2024</code></div>
        </div>

        <div className="login-quote">"DefOex : Together We Build, Together We Grow..."</div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card__header">
            <h2>Sign In</h2>
            <p>Enter your credentials to access the portal</p>
          </div>

          {error && (
            <div className="login-error">
              <span className="login-error__icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Username / Email</label>
              <input
                type="text"
                placeholder="e.g. superadmin"
                value={form.username}
                onChange={e => { setForm({ ...form, username: e.target.value }); setError(''); }}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <label>Password</label>
              <div className="pass-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                  autoComplete="current-password"
                />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-roles">
            <div className="roles-title">Portal Access</div>
            <div className="roles-grid">
              {[
                { role: 'Super Admin', icon: '👑' },
                { role: 'Branch Manager', icon: '🏢' },
                { role: 'Advisor', icon: '🤝' },
                { role: 'Member', icon: '👤' },
              ].map(r => (
                <div key={r.role} className="role-chip">
                  <span>{r.icon}</span>
                  <span>{r.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="login-footer">
          <span>CIN – U68100MP2026PTC083560</span>
          <span>©2026 DefOex IntraTech Pvt. Ltd.</span>
        </div>
      </div>
    </div>
  );
}
