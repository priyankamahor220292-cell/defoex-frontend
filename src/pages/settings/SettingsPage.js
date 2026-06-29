import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SettingsPage.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';

  const cards = [
    { icon:'👤', title:'Profile', desc: isAdmin ? 'View account details and change your password' : 'View your account details', path:'/profile' },
    ...(isAdmin ? [
      { icon:'🏢', title:'Branches', desc:'Manage branches and wallets', path:'/branches' },
      { icon:'👥', title:'Users', desc:'Create users and reset login passwords', path:'/users' },
      { icon:'🤝', title:'Advisers', desc:'Manage adviser codes and ranks', path:'/advisers' },
    ] : []),
  ];
  return (
    <div className="page-enter">
      <div className="page-header"><h1>Settings</h1></div>
      <div className="settings-cards">
        {cards.map(s => (
          <div key={s.path} className="settings-card" onClick={() => navigate(s.path)}>
            <div className="sc-icon">{s.icon}</div>
            <div className="sc-title">{s.title}</div>
            <div className="sc-desc">{s.desc}</div>
            <div className="sc-arrow">›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
