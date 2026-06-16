import SearchEngine from '../../../components/SearchEngine/SearchEngine';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../../components/StatCard/StatCard';
import Panel from '../../../components/Panel/Panel';
import Alert from '../../../components/Alert/Alert';
import Loading from '../../../components/Loading/Loading';
import { reportService } from '../../../services/reportService';
import { useAuth } from '../../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './BranchManagerDashboard.css';

export default function BranchManagerDashboard() {
  const { wallet } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      reportService.dashboardStats(),
      reportService.businessSummary()
    ]).then(([s, b]) => {
      if (s.status === 'fulfilled') setStats(s.value.data.data);
      else setStats({ total_members:0, total_investments:0, monthly_business:0, pending_members:0, pending_investments:0 });
      if (b.status === 'fulfilled') setSummary(b.value.data.data);
      else setSummary(null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;

  const chartData = summary ? [
    { name: '1M', amount: summary.summary['1_month']?.total_business || 0 },
    { name: '3M', amount: summary.summary['3_months']?.total_business || 0 },
    { name: '6M', amount: summary.summary['6_months']?.total_business || 0 },
    { name: '1Y', amount: summary.summary['1_year']?.total_business || 0 },
    { name: 'All', amount: summary.summary['overall']?.total_business || 0 },
  ] : [];

  return (
    <div className="bm-dashboard page-enter">
      <div className="dashboard-header">
        <div>
          <h1>Branch Manager Dashboard</h1>
          <p className="text-muted">Your branch performance at a glance</p>
        </div>
        <div className="bm-quick-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/members/new')}>+ New Investor</button>
          <button className="btn btn-accent btn-sm" onClick={() => navigate('/investments/new')}>+ New Plan</button>
        </div>

      {/* ── Universal Search ── */}
      <SearchEngine />
      </div>

      {/* Low balance alert */}
      {wallet?.is_low_balance && (
        <Alert type="warning">
          ⚠️ Your branch current balance is low — <strong>{fmt(wallet.current_balance)}</strong>. Please request a top-up from the admin.
        </Alert>
      )}

      {/* Wallet cards */}
      {wallet && (
        <div className="wallet-cards mb-2">
          <div className="wallet-big-card">
            <div className="wbc-label">Current Balance</div>
            <div className={`wbc-amount ${wallet.is_low_balance ? 'low' : ''}`}>{fmt(wallet.current_balance)}</div>
            <div className="wbc-sub">Admin-assigned limit</div>
          </div>
          <div className="wallet-big-card accent">
            <div className="wbc-label">Cash Wallet</div>
            <div className="wbc-amount">{fmt(wallet.cash_wallet)}</div>
            <div className="wbc-sub">Accumulated from investments</div>
          </div>
        </div>
      )}

      <div className="grid-4">
        <StatCard title="Total Investors" value={stats?.total_members || 0} icon="👥" color="primary" />
        <StatCard title="Active Plans" value={stats?.total_investments || 0} icon="📊" color="success" />
        <StatCard title="This Month" value={fmt(stats?.monthly_business)} icon="💰" color="warning" />
        <StatCard title="Pending" value={(stats?.pending_members || 0) + (stats?.pending_investments || 0)} icon="⏳" color="danger" />
      </div>

      <div className="dashboard-charts mt-3">
        <Panel title="Business Overview" subtitle="Monthly investment volumes">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="amount" fill="var(--primary)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Quick Actions">
          <div className="quick-actions-list">
            {[
              { label: 'New Registration', icon: '👤', path: '/members/new' },
              { label: 'New Investment Plan', icon: '📈', path: '/investments/new' },
              { label: 'Pending Approvals', icon: '✅', path: '/approvals' },
              { label: 'List Investors', icon: '📋', path: '/members' },
              { label: 'Branch Reports', icon: '📊', path: '/reports' },
              { label: 'Wallet History', icon: '💳', path: '/wallet' },
            ].map(a => (
              <button key={a.path} className="qa-item" onClick={() => navigate(a.path)}>
                <span className="qa-icon">{a.icon}</span>
                <span>{a.label}</span>
                <span className="qa-arrow">›</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}