import React, { useEffect, useState } from 'react';
import Panel from '../../../components/Panel/Panel';
import Loading from '../../../components/Loading/Loading';
import Badge from '../../../components/Badge/Badge';
import { investmentService } from '../../../services/investmentService';
import { useAuth } from '../../../context/AuthContext';
import './MemberDashboard.css';

export default function MemberDashboard() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    investmentService.list({}).then(r => {
      const payload = r.data?.data;
      const rows = Array.isArray(payload) ? payload : (payload?.items || []);
      setPlans(rows);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;

  const totalInvested = plans.reduce((s, p) => s + (p.total_investment_amount || 0), 0);
  const totalMaturity = plans.reduce((s, p) => s + (p.total_maturity_amount || 0), 0);

  return (
    <div className="member-dashboard page-enter">
      <div className="member-hero">
        <div className="member-avatar">{user?.full_name?.[0] || 'M'}</div>
        <div>
          <h2>Hello, {user?.full_name}!</h2>
          <p className="text-muted">Here's your investment portfolio</p>
        </div>
      </div>

      <div className="member-stats mb-3">
        <div className="member-stat-card">
          <div className="msc-label">Total Invested</div>
          <div className="msc-value primary">{fmt(totalInvested)}</div>
        </div>
        <div className="member-stat-card">
          <div className="msc-label">Total Return On Investment Value</div>
          <div className="msc-value success">{fmt(totalMaturity)}</div>
        </div>
        <div className="member-stat-card">
          <div className="msc-label">Active Plans</div>
          <div className="msc-value">{plans.filter(p => p.status === 'Active').length}</div>
        </div>
      </div>

      <Panel title="My Investment Plans">
        <table className="data-table">
          <thead>
            <tr>
              <th>IRN</th>
              <th>Plan</th>
              <th>Monthly</th>
              <th>Total Invested</th>
              <th>Return On Investment</th>
              <th>Progress</th>
              <th>Next Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => {
              const progress = p.total_installments ? Math.round((p.installments_paid / p.total_installments) * 100) : 0;
              return (
                <tr key={p.id}>
                  <td><code style={{fontSize:'0.78rem'}}>{p.irn}</code></td>
                  <td>{p.plan_name}</td>
                  <td>{fmt(p.monthly_amount)}</td>
                  <td>{fmt(p.total_investment_amount)}</td>
                  <td><strong style={{color:'var(--success)'}}>{fmt(p.total_maturity_amount)}</strong></td>
                  <td>
                    <div className="progress-wrap">
                      <div className="progress-bar"><div style={{width:`${progress}%`}} className="progress-fill" /></div>
                      <span className="progress-label">{p.installments_paid}/{p.total_installments}</span>
                    </div>
                  </td>
                  <td>{p.due_date}</td>
                  <td><Badge status={p.status} /></td>
                </tr>
              );
            })}
            {!plans.length && (
              <tr><td colSpan={8} className="text-center text-muted" style={{padding:'32px'}}>No investment plans found</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
