import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatLocalNow } from '../../utils/dateTime';
import './Topbar.css';

export default function Topbar({ collapsed, onMenuToggle, mobileOpen }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.get('/api/notifications/').then(r => {
      setUnread(r.data.data?.unread_count || 0);
    }).catch(() => {});
  }, []);

  const formatDate = (d) => formatLocalNow(d);

  return (
    <header className={`topbar${collapsed ? ' shifted' : ''}`}>
      <div className="topbar-left">
        <button
          type="button"
          className={`topbar-menu-btn${mobileOpen ? ' open' : ''}`}
          onClick={onMenuToggle}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          <span /><span /><span />
        </button>
        <div className="topbar-title">DefOex IntraTech</div>
        <div className="topbar-date hide-mobile">{formatDate(time)}</div>
      </div>
      <div className="topbar-right">
        <button className="topbar-btn" onClick={() => navigate('/notifications')}>
          🔔
          {unread > 0 && <span className="notif-badge">{unread}</span>}
        </button>
        <div className="topbar-user" onClick={() => navigate('/profile')}>
          <div className="topbar-avatar">{user?.full_name?.[0] || 'U'}</div>
          <div className="topbar-user-info hide-mobile">
            <span className="topbar-name">{user?.full_name}</span>
            <span className="topbar-role">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
