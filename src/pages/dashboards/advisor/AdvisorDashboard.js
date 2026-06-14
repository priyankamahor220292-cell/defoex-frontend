import React, { useEffect, useState } from 'react';
import StatCard from '../../../components/StatCard/StatCard';
import Panel from '../../../components/Panel/Panel';
import Loading from '../../../components/Loading/Loading';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import './AdvisorDashboard.css';

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/reports/dashboard-stats'),
      api.get('/api/commissions/?status=Pending')
    ]).then(([stats, comms]) => {
      setData({
        stats: stats.data.data,
        commissions: comms.data.data
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;
  const totalComm = data?.commissions?.items?.reduce((s, c) => s + (c.commission_amount || 0), 0) || 0;

  return (
    <div className="adv-dashboard page-enter">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {user?.full_name}</h1>
          <p className="text-muted">Advisor Portal — Your performance summary</p>
        </div>
      </div>

      <div className="grid-4">
        <StatCard title="My Investors" value={data?.stats?.total_members || 0} icon="👥" color="primary" />
        <StatCard title="Active Plans" value={data?.stats?.total_investments || 0} icon="📊" color="success" />
        <StatCard title="Pending Commission" value={fmt(totalComm)} icon="💰" color="warning" />
        <StatCard title="Commission Records" value={data?.commissions?.total || 0} icon="📋" color="info" />
      </div>

      <div className="mt-3">
        <Panel title="Recent Commissions" subtitle="Pending payout">
          <table className="data-table">
            <thead>
              <tr>
                <th>Adviser Code</th>
                <th>Plan</th>
                <th>Tenure</th>
                <th>Investment Amt</th>
                <th>Rate</th>
                <th>Commission</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.commissions?.items || []).slice(0,10).map(c => (
                <tr key={c.id}>
                  <td>{c.adviser_code}</td>
                  <td>{c.plan_type}</td>
                  <td>{c.plan_tenure}</td>
                  <td>{fmt(c.investment_amount)}</td>
                  <td>{c.commission_rate}%</td>
                  <td><strong style={{color:'var(--success)'}}>{fmt(c.commission_amount)}</strong></td>
                  <td><span className={`badge badge--${c.status==='Paid'?'success':'warning'}`}>{c.status}</span></td>
                </tr>
              ))}
              {!data?.commissions?.items?.length && (
                <tr><td colSpan={7} className="text-center text-muted" style={{padding:'24px'}}>No commission records</td></tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
