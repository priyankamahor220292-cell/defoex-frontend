import SearchEngine from '../../../components/SearchEngine/SearchEngine';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../../components/StatCard/StatCard';
import Panel from '../../../components/Panel/Panel';
import Alert from '../../../components/Alert/Alert';
import Loading from '../../../components/Loading/Loading';
import { reportService } from '../../../services/reportService';
import { branchService } from '../../../services/branchService';
import { useAuth } from '../../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './BranchManagerDashboard.css';

const PERIOD_LABELS = {
  '1_month': '1 Month',
  '3_months': '3 Months',
  '6_months': '6 Months',
  '1_year': '1 Year',
  'overall': 'Overall',
};

const CHART_LABELS = {
  '1_month': '1M',
  '3_months': '3M',
  '6_months': '6M',
  '1_year': '1Y',
  'overall': 'All',
};

const fmt = n => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;

export default function BranchManagerDashboard() {
  const { user, wallet: authWallet, setWallet } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [wallet, setLocalWallet] = useState(authWallet);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const branchId = user?.branch_id;
    Promise.allSettled([
      reportService.dashboardStats(),
      reportService.businessSummary(),
      branchId ? branchService.get(branchId) : Promise.reject(),
    ]).then(([s, b, br]) => {
      if (s.status === 'fulfilled') setStats(s.value.data.data);
      else setStats({ total_members: 0, total_investments: 0, monthly_business: 0, pending_members: 0, pending_investments: 0 });
      if (b.status === 'fulfilled') setSummary(b.value.data.data);
      else setSummary(null);
      if (br.status === 'fulfilled') {
        const branch = br.value.data.data;
        setBranchInfo(branch);
        if (branch?.wallet) {
          setLocalWallet(branch.wallet);
          setWallet(branch.wallet);
        }
      }
    }).finally(() => setLoading(false));
  }, [user?.branch_id, setWallet]);

  if (loading) return <Loading />;

  const w = wallet || authWallet;
  const pendingTotal = (stats?.pending_members || 0) + (stats?.pending_investments || 0);

  const chartData = summary
    ? Object.entries(CHART_LABELS).map(([key, label]) => ({
        name: label,
        amount: summary.summary[key]?.total_business || 0,
      }))
    : [];

  const quickActions = [
    { label: 'New Registration', icon: '👤', path: '/members/new' },
    { label: 'New Investment Plan', icon: '📈', path: '/investments/new' },
    { label: 'Pending Approvals', icon: '✅', path: '/approvals' },
    { label: 'List Investors', icon: '📋', path: '/members' },
    { label: 'Branch Reports', icon: '📊', path: '/reports' },
    { label: 'Wallet History', icon: '💳', path: '/wallet' },
  ];

  return (
    <div className="bm-dashboard page-enter">
      <div className="dashboard-header">
        <div>
          <h1>Branch Manager Dashboard</h1>
          <p className="text-muted">
            {branchInfo
              ? `${branchInfo.branch_name} (${branchInfo.branch_code}) — ${branchInfo.city || ''}${branchInfo.city && branchInfo.state ? ', ' : ''}${branchInfo.state || ''}`
              : 'Your branch performance at a glance'}
          </p>
        </div>
        <div className="bm-header-right">
          <div className="bm-quick-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>
              Approvals{pendingTotal > 0 ? ` (${pendingTotal})` : ''}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/members/new')}>+ New Investor</button>
            <button type="button" className="btn btn-accent btn-sm" onClick={() => navigate('/investments/new')}>+ New Plan</button>
          </div>
          <div className="dashboard-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <SearchEngine />

      {w?.is_low_balance && (
        <Alert type="warning" className="bm-alert">
          ⚠️ Your branch current balance is low — <strong>{fmt(w.current_balance)}</strong>. Please request a top-up from the admin.
        </Alert>
      )}

      {w && (
        <div className="wallet-cards">
          <div className={`wallet-big-card${w.is_low_balance ? ' low' : ''}`}>
            <div className="wbc-label">Current Balance</div>
            <div className={`wbc-amount${w.is_low_balance ? ' low' : ''}`}>{fmt(w.current_balance)}</div>
            <div className="wbc-sub">Admin-assigned limit</div>
          </div>
          <div className="wallet-big-card accent">
            <div className="wbc-label">Cash Wallet</div>
            <div className="wbc-amount">{fmt(w.cash_wallet)}</div>
            <div className="wbc-sub">Accumulated from investments</div>
          </div>
        </div>
      )}

      <div className="grid-4 bm-stats">
        <StatCard title="Total Investors" value={stats?.total_members || 0} icon="👥" color="primary" />
        <StatCard title="Active Plans" value={stats?.total_investments || 0} icon="📊" color="success" />
        <StatCard title="This Month" value={fmt(stats?.monthly_business)} icon="💰" color="warning" />
        <StatCard title="Pending" value={pendingTotal} icon="⏳" color="danger" />
      </div>

      <div className="dashboard-charts mt-3">
        <Panel title="Business Overview" subtitle="Branch investment volumes by period">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="bm-empty">No business data available yet</div>
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
          <div className="quick-actions-list">
            {quickActions.map(a => (
              <button key={a.path} type="button" className="qa-item" onClick={() => navigate(a.path)}>
                <span className="qa-icon">{a.icon}</span>
                <span>{a.label}</span>
                <span className="qa-arrow">›</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {summary && (
        <Panel title="Branch Business by Period" subtitle="Your branch investment totals" className="mt-3">
          <div className="bm-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Investments</th>
                  <th>Total Business</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(PERIOD_LABELS).map(([key, label]) => {
                  const val = summary.summary[key] || {};
                  return (
                    <tr key={key}>
                      <td>{label}</td>
                      <td>{val.investment_count || 0}</td>
                      <td><strong>{fmt(val.total_business)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
