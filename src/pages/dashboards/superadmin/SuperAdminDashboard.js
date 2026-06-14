import React, { useEffect, useState } from 'react';
import StatCard from '../../../components/StatCard/StatCard';
import Panel from '../../../components/Panel/Panel';
import Loading from '../../../components/Loading/Loading';
import { reportService } from '../../../services/reportService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './SuperAdminDashboard.css';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportService.dashboardStats(),
      reportService.businessSummary()
    ]).then(([s, b]) => {
      setStats(s.data.data);
      setSummary(b.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const chartData = summary ? [
    { name: '1 Month', amount: summary.summary['1_month']?.total_business || 0 },
    { name: '3 Months', amount: summary.summary['3_months']?.total_business || 0 },
    { name: '6 Months', amount: summary.summary['6_months']?.total_business || 0 },
    { name: '1 Year', amount: summary.summary['1_year']?.total_business || 0 },
    { name: 'Overall', amount: summary.summary['overall']?.total_business || 0 },
  ] : [];

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;

  return (
    <div className="sa-dashboard page-enter">
      <div className="dashboard-header">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p className="text-muted">Complete platform overview</p>
        </div>
        <div className="dashboard-date">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
      </div>

      <div className="grid-4">
        <StatCard title="Total Investors" value={stats?.total_members || 0} icon="👥" color="primary" />
        <StatCard title="Active Investments" value={stats?.total_investments || 0} icon="📊" color="success" />
        <StatCard title="This Month Business" value={fmt(stats?.monthly_business)} icon="💰" color="warning" />
        <StatCard title="Pending Approvals" value={(stats?.pending_members || 0) + (stats?.pending_investments || 0)} icon="⏳" color="danger" />
      </div>

      <div className="dashboard-charts mt-3">
        <Panel title="Business Summary" subtitle="Investment volumes by time period">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="amount" fill="#0d47a1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Approval Queue">
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
        </Panel>
      </div>

      {summary && (
        <Panel title="Branch-wise Business Totals" className="mt-3">
          <div className="business-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Investments</th>
                  <th>Total Business</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.summary).map(([key, val]) => (
                  <tr key={key}>
                    <td>{key.replace('_', ' ').toUpperCase()}</td>
                    <td>{val.investment_count}</td>
                    <td><strong>{fmt(val.total_business)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
