import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import MemberPortfolio from './MemberPortfolio';
import './MemberDashboard.css';

export default function MemberDashboard() {
  const { user } = useAuth();
  const firstName = (user?.full_name || 'Member').split(' ')[0];

  return (
    <div className="member-dashboard page-enter">
      <div className="member-hero">
        <div className="member-avatar">{firstName[0] || 'M'}</div>
        <div>
          <h2>Hello, {firstName}!</h2>
          <p className="text-muted">Here&apos;s your investment portfolio</p>
        </div>
      </div>

      <MemberPortfolio showStats />
    </div>
  );
}
