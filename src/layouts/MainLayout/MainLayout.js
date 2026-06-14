import React, { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Topbar from '../Topbar/Topbar';
import './MainLayout.css';

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="main-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`main-content${collapsed ? ' expanded' : ''}`}>
        <Topbar collapsed={collapsed} />
        <main className="page-content page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
