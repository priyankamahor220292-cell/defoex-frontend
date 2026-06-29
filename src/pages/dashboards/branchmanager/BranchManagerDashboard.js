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

const QUICK_ACTIONS = [
  { label: 'New Investor', icon: '👤', path: '/members/new', accent: false },
  { label: 'New MIS Plan', icon: '📈', path: '/investments', accent: true },
  { label: 'Approvals', icon: '✅', path: '/approvals', accent: false },
  { label: 'All Investors', icon: '📋', path: '/members', accent: false },
  { label: 'Branch Reports', icon: '📊', path: '/reports', accent: false },
  { label: 'Branch Wallet', icon: '💳', path: '/wallet', accent: false },
];

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
  const pendingMembers = stats?.pending_members || 0;
  const pendingPlans = stats?.pending_investments || 0;
  const pendingTotal = pendingMembers + pendingPlans;

  const chartData = summary
    ? Object.entries(CHART_LABELS).map(([key, label]) => ({
        name: label,
        amount: summary.summary[key]?.total_business || 0,
      }))
    : [];

  const branchLine = branchInfo
    ? [branchInfo.branch_name, branchInfo.branch_code && `(${branchInfo.branch_code})`, branchInfo.city, branchInfo.state]
        .filter(Boolean)
        .join(' · ')
    : 'Your branch performance at a glance';

  return (
    <div className="bm-dashboard page-enter">
      <div className="bm-top">
        <div className="bm-top-main">
          <div className="bm-eyebrow">Branch Manager Panel</div>
          <h1 className="bm-title">Welcome, {user?.full_name || 'Manager'}</h1>
          <p className="bm-branch-line">{branchLine}</p>
        </div>
        <div className="bm-top-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>
            Approvals{pendingTotal > 0 ? ` (${pendingTotal})` : ''}
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/members/new')}>
            + New Investor
          </button>
          <button type="button" className="btn btn-accent btn-sm" onClick={() => navigate('/investments')}>
            + New Plan
          </button>
          <div className="bm-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      <Panel title="Quick Search" subtitle="Find plans, investors, or advisers" className="bm-search-panel">
        <SearchEngine />
      </Panel>

      {w?.is_low_balance && (
        <Alert type="warning" className="bm-alert">
          Your branch current balance is low — <strong>{fmt(w.current_balance)}</strong>. Please request a top-up from admin.
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
        <StatCard title="Pending Approvals" value={pendingTotal} icon="⏳" color="danger" />
      </div>

      <div className="bm-action-grid">
        {QUICK_ACTIONS.map(a => (
          <button
            key={a.path}
            type="button"
            className={`bm-action-card${a.accent ? ' accent' : ''}`}
            onClick={() => navigate(a.path)}
          >
            <span className="bm-action-icon">{a.icon}</span>
            <span className="bm-action-label">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="dashboard-charts mt-3">
        <Panel title="Business Overview" subtitle="Branch investment volumes by period" className="bm-chart-panel">
          {chartData.some(d => d.amount > 0) ? (
            <div className="bm-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bm-empty">No business data available yet</div>
          )}
        </Panel>

        <Panel title="Approval Queue" subtitle="Items waiting for your action" className="bm-queue-panel">
          <div className="approval-queue">
            <button
              type="button"
              className={`queue-item clickable${pendingMembers > 0 ? ' has-pending' : ''}`}
              onClick={() => navigate('/approvals?tab=registrations')}
            >
              <div>
                <div className="queue-label">Pending Registrations</div>
                <div className="queue-hint">Investor sign-ups</div>
              </div>
              <div className={`queue-value${pendingMembers > 0 ? ' warning' : ''}`}>{pendingMembers}</div>
            </button>
            <button
              type="button"
              className={`queue-item clickable${pendingPlans > 0 ? ' has-pending' : ''}`}
              onClick={() => navigate('/approvals?tab=plans')}
            >
              <div>
                <div className="queue-label">Pending Investment Plans</div>
                <div className="queue-hint">MIS / SIS plans</div>
              </div>
              <div className={`queue-value${pendingPlans > 0 ? ' warning' : ''}`}>{pendingPlans}</div>
            </button>
          </div>
          {pendingTotal === 0 ? (
            <div className="bm-queue-clear">All caught up — no pending approvals</div>
          ) : (
            <button type="button" className="btn btn-primary btn-sm btn-full bm-review-btn" onClick={() => navigate('/approvals')}>
              Review Approvals ({pendingTotal})
            </button>
          )}
        </Panel>
      </div>

      {summary && (
        <Panel title="Branch Business by Period" subtitle="Investment totals for your branch" className="mt-3">
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
