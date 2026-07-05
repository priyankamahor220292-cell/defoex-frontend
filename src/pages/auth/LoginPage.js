import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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
      toast.success(`Welcome, ${user.full_name}!`);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (!err.response) {
        setError(
          'Cannot reach the API server. On the live server run: cd defoex-backend && bash deploy_live.sh'
        );
      } else if (status === 502 || status === 404) {
        setError(
          msg || 'Login API not found. On the server run: cd defoex-backend && bash deploy_live.sh'
        );
      } else {
        setError(msg || 'Invalid username or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-left-inner">
        <div className="login-brand">
          <div className="brand-logo">D</div>
          <div>
            <div className="brand-name">DefOex</div>
            <div className="brand-tagline">IntraTech Private Limited</div>
          </div>
        </div>
        <div className="login-hero">
          <h1>Smart Investment<br />Management System</h1>
          <p>Manage branches, investors, plans, benefits & wallets — all in one secure platform.</p>
          <div className="login-features">
            {['Multi-branch management', 'MIS/SIS investment plans', 'Benefits tracking', 'Real-time wallet control'].map(f => (
              <div key={f} className="feature-item">
                <span className="feature-check">✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        <div className="login-quote">"DefOex : Together We Build, Together We Grow..."</div>
        </div>
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
                placeholder="Enter username or email"
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
        </div>

        <div className="login-footer">
          <span>CIN – U68100MP2026PTC083560</span>
          <span>©2026 DefOex IntraTech Pvt. Ltd.</span>
        </div>
      </div>
    </div>
  );
}
