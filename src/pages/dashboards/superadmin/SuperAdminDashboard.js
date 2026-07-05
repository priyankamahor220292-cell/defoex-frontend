import SearchEngine from '../../../components/SearchEngine/SearchEngine';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../../components/StatCard/StatCard';
import Panel from '../../../components/Panel/Panel';
import Loading from '../../../components/Loading/Loading';
import { reportService } from '../../../services/reportService';
import { branchService } from '../../../services/branchService';
import { formatISTLongDate } from '../../../utils/dateTime';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './SuperAdminDashboard.css';

const PERIOD_LABELS = {
  '1_month': '1 Month',
  '3_months': '3 Months',
  '6_months': '6 Months',
  '1_year': '1 Year',
  'overall': 'Overall',
};

const fmt = n => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;

const fmtCr = n => {
  const num = parseFloat(n) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
  return fmt(num);
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState('all');

  useEffect(() => {
    Promise.allSettled([
      reportService.dashboardStats(),
      reportService.businessSummary(),
      branchService.adminWallet(),
    ]).then(([s, b, w]) => {
      if (s.status === 'fulfilled') setStats(s.value.data.data);
      else setStats({ total_members: 0, total_investments: 0, monthly_business: 0, pending_members: 0, pending_investments: 0 });
      if (b.status === 'fulfilled') setSummary(b.value.data.data);
      else setSummary(null);
      if (w.status === 'fulfilled') setWalletData(w.value.data.data);
      else setWalletData(null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const aw = walletData?.admin_wallet || {};
  const usedPct = parseFloat(aw.use_percentage || 0);
  const pendingTotal = (stats?.pending_members || 0) + (stats?.pending_investments || 0);

  const chartData = summary
    ? Object.entries(PERIOD_LABELS)
        .filter(([key]) => chartPeriod === 'all' || key === '1_year' || key === 'overall')
        .map(([key, label]) => ({
          name: label,
          amount: summary.summary[key]?.total_business || 0,
        }))
    : [];

  const quickActions = [
    { label: 'Pending Approvals', icon: '✅', path: '/approvals' },
    { label: 'Manage Branches', icon: '🏢', path: '/branches' },
    { label: 'Admin Wallet', icon: '💳', path: '/wallet' },
    { label: 'List Investors', icon: '📋', path: '/members' },
  ];

  return (
    <div className="sa-dashboard page-enter">
      <div className="dashboard-header">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p className="text-muted">Complete platform overview</p>
        </div>
        <div className="sa-header-right">
          <div className="sa-header-actions">
            <button type="button" className="sa-btn sa-btn--approvals" onClick={() => navigate('/approvals')}>
              <span className="sa-btn-icon">🛡️</span>
              Approvals{pendingTotal > 0 ? ` (${pendingTotal})` : ''}
            </button>
            <button type="button" className="sa-btn sa-btn--wallet" onClick={() => navigate('/wallet')}>
              <span className="sa-btn-icon">💳</span>
              Admin Wallet
            </button>
          </div>
          <div className="dashboard-date">{formatISTLongDate()}</div>
        </div>
      </div>

      <SearchEngine />

      {walletData && (
        <div className="sa-wallet-bar">
          <div className="sa-wallet-stat">
            <span className="sa-wallet-label"><span className="sa-wallet-ico">💼</span> Total Limit</span>
            <strong>{fmt(aw.total_limit)}</strong>
          </div>
          <div className="sa-wallet-divider" />
          <div className="sa-wallet-stat">
            <span className="sa-wallet-label"><span className="sa-wallet-ico">💼</span> Available</span>
            <strong className="green">{fmt(aw.available_balance)}</strong>
          </div>
          <div className="sa-wallet-divider" />
          <div className="sa-wallet-stat">
            <span className="sa-wallet-label"><span className="sa-wallet-ico">📊</span> Distributed</span>
            <strong className="red">{fmtCr(aw.total_distributed)}</strong>
          </div>
          <div className="sa-wallet-divider" />
          <div className="sa-wallet-stat">
            <span className="sa-wallet-label"><span className="sa-wallet-ico">💼</span> In Use</span>
            <strong className="blue">{fmtCr(aw.used_amount)}</strong>
          </div>
          <div className="sa-wallet-usage">
            <span>{usedPct.toFixed(1)}% used</span>
            <div className="sa-wallet-bar-track">
              <div className="sa-wallet-bar-fill" style={{ width: `${Math.min(usedPct, 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="grid-4 sa-stats">
        <StatCard
          variant="featured"
          title="Total Investors"
          value={stats?.total_members || 0}
          subtitle="Registered investors"
          icon="👥"
          color="primary"
        />
        <StatCard
          variant="featured"
          title="Active Investments"
          value={stats?.total_investments || 0}
          subtitle="Running investments"
          icon="📊"
          color="success"
        />
        <StatCard
          variant="featured"
          title="This Month Business"
          value={fmt(stats?.monthly_business)}
          subtitle="Total business value"
          icon="💰"
          color="warning"
        />
        <StatCard
          variant="featured"
          title="Pending Approvals"
          value={pendingTotal}
          subtitle="Awaiting action"
          icon="⏳"
          color="purple"
        />
      </div>

      <div className="dashboard-charts mt-3">
        <Panel
          title="Business Summary"
          subtitle="Investment volumes by time period"
          actions={
            <select
              className="sa-period-select"
              value={chartPeriod}
              onChange={e => setChartPeriod(e.target.value)}
            >
              <option value="all">All Periods</option>
              <option value="year">This Year</option>
            </select>
          }
        >
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="amount" fill="#1565c0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="sa-empty">No business data available yet</div>
          )}
        </Panel>

        <Panel title="Approval Queue & Actions">
          <div className="approval-queue">
            <div className="queue-item">
              <div className="queue-label">Pending Registrations</div>
              <div className="queue-value warning">{stats?.pending_members || 0}</div>
            </div>
            <div className="queue-item">
              <div className="queue-label">Pending Investment Plans</div>
              <div className="queue-value warning">{stats?.pending_investments || 0}</div>
            </div>
          </div>
          <div className="sa-quick-list">
            {quickActions.map(a => (
              <button key={a.path} type="button" className="sa-qa-item" onClick={() => navigate(a.path)}>
                <span className="sa-qa-icon">{a.icon}</span>
                <span>{a.label}</span>
                <span className="sa-qa-arrow">›</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
