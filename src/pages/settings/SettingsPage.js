import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SettingsPage.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="page-enter">
      <div className="page-header"><h1>Settings</h1></div>
      <div className="settings-cards">
        {[
          { icon:'👤', title:'Profile', desc:'Update your name, email and password', path:'/profile' },
          { icon:'🏢', title:'Branches', desc:'Manage branches and wallets', path:'/branches' },
          { icon:'👥', title:'Users', desc:'Create and manage portal users', path:'/users' },
          { icon:'🤝', title:'Advisers', desc:'Manage adviser codes and ranks', path:'/advisers' },
        ].map(s => (
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
