import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Topbar.css';

export default function Topbar({ collapsed }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.get('/api/notifications/').then(r => {
      setUnread(r.data.data?.unread_count || 0);
    }).catch(() => {});
  }, []);

  const formatDate = (d) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className={`topbar${collapsed ? ' shifted' : ''}`}>
      <div className="topbar-left">
        <div className="topbar-title">DefOex IntraTech</div>
        <div className="topbar-date">{formatDate(time)}</div>
      </div>
      <div className="topbar-right">
        <button className="topbar-btn" onClick={() => navigate('/notifications')}>
          🔔
          {unread > 0 && <span className="notif-badge">{unread}</span>}
        </button>
        <div className="topbar-user" onClick={() => navigate('/profile')}>
          <div className="topbar-avatar">{user?.full_name?.[0] || 'U'}</div>
          <div className="topbar-user-info">
            <span className="topbar-name">{user?.full_name}</span>
            <span className="topbar-role">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
