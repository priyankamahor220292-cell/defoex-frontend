import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const NAV = {
  superadmin: [
    { path:'/dashboard',    icon:'⊞', label:'Dashboard' },
    { path:'/branches',     icon:'🏢', label:'Branches' },
    { path:'/users',        icon:'👥', label:'Users' },
    { path:'/advisers',     icon:'🤝', label:'Advisers' },
    { path:'/members',      icon:'👤', label:'Investors' },
    { path:'/investments',  icon:'📊', label:'Investments' },
    { path:'/commissions',  icon:'💰', label:'Commissions' },
    { path:'/wallet',       icon:'💳', label:'Wallets' },
    { path:'/approvals',    icon:'✅', label:'Approvals' },
    { path:'/reports',      icon:'📋', label:'Reports' },
    { path:'/notifications',icon:'🔔', label:'Notifications' },
  ],
  branchmanager: [
    { path:'/dashboard',    icon:'⊞', label:'Dashboard' },
    { path:'/members',      icon:'👤', label:'Investors' },
    { path:'/investments',  icon:'📊', label:'Investments' },
    { path:'/approvals',    icon:'✅', label:'Approvals' },
    { path:'/reports',      icon:'📋', label:'Reports' },
    { path:'/wallet',       icon:'💳', label:'Branch Wallet' },
    { path:'/commissions',  icon:'💰', label:'Commissions' },
    { path:'/advisers',     icon:'🤝', label:'Advisers' },
    { path:'/notifications',icon:'🔔', label:'Notifications' },
  ],
  advisor: [
    { path:'/dashboard',    icon:'⊞', label:'Dashboard' },
    { path:'/members',      icon:'👤', label:'My Investors' },
    { path:'/commissions',  icon:'💰', label:'My Commissions' },
    { path:'/reports',      icon:'📋', label:'Reports' },
    { path:'/notifications',icon:'🔔', label:'Notifications' },
  ],
  member: [
    { path:'/dashboard',    icon:'⊞', label:'Dashboard' },
    { path:'/investments',  icon:'📊', label:'My Investments' },
    { path:'/notifications',icon:'🔔', label:'Notifications' },
    { path:'/profile',      icon:'👤', label:'Profile' },
  ],
};

export default function Sidebar({ collapsed, onToggle }) {
  const { user, wallet, logout } = useAuth();
  const navigate = useNavigate();
  const role  = user?.role || 'member';
  const items = NAV[role] || NAV.member;

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">D</div>
        {!collapsed && (
          <div className="logo-text">
            <span className="logo-brand">DefOex</span>
            <span className="logo-sub">IntraTech</span>
          </div>
        )}
      </div>

      {/* Wallet for BM */}
      {!collapsed && wallet && role === 'branchmanager' && (
        <div className={`sidebar-wallet${wallet.is_low_balance ? ' low' : ''}`}>
          <div className="wallet-row"><span>Balance</span><strong>₹{(wallet.current_balance||0).toLocaleString('en-IN')}</strong></div>
          <div className="wallet-row"><span>Cash Wallet</span><strong>₹{(wallet.cash_wallet||0).toLocaleString('en-IN')}</strong></div>
          {wallet.is_low_balance && <div className="wallet-alert">⚠️ Low Balance</div>}
        </div>
      )}

      {/* Role + name */}
      {!collapsed && (
        <div className="sidebar-role">
          <span className="role-badge">{role.toUpperCase()}</span>
          <span className="role-name">{user?.full_name}</span>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {items.map(item => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title={collapsed ? item.label : ''}>
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <NavLink to="/settings" className="nav-item" title={collapsed ? 'Settings' : ''}>
          <span className="nav-icon">⚙️</span>
          {!collapsed && <span className="nav-label">Settings</span>}
        </NavLink>
        <NavLink to="/profile" className="nav-item" title={collapsed ? 'Profile' : ''}>
          <span className="nav-icon">👤</span>
          {!collapsed && <span className="nav-label">Profile</span>}
        </NavLink>
        <button className="nav-item nav-logout" onClick={handleLogout} title={collapsed ? 'Logout' : ''}>
          <span className="nav-icon">🚪</span>
          {!collapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>

      <button className="sidebar-toggle" onClick={onToggle}>{collapsed ? '▶' : '◀'}</button>
    </aside>
  );
}
