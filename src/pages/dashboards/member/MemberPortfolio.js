import React, { useEffect, useState } from 'react';
import Panel from '../../../components/Panel/Panel';
import Loading from '../../../components/Loading/Loading';
import Badge from '../../../components/Badge/Badge';
import { investmentService } from '../../../services/investmentService';
import './MemberDashboard.css';

const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`;

const formatDate = (d) => (d || '').slice(0, 10) || '—';

const isActivePlan = (p) =>
  p.approval_status === 'Approved' && (p.status === 'Active' || !p.status);

const planProgress = (p) => {
  const paid = p.installments_paid || 0;
  const total = p.total_installments || 0;
  const pct = total ? Math.round((paid / total) * 100) : 0;
  return { paid, total, pct };
};

export default function MemberPortfolio({ showStats = true }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    investmentService.list({ per_page: 100, status: 'approved' })
      .then(r => {
        const rows = r.data?.data?.items || [];
        setPlans(rows);
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const activePlans = plans.filter(isActivePlan);
  const totalInvested = activePlans.reduce((s, p) => s + (p.total_investment_amount || 0), 0);
  const totalReturn = activePlans.reduce((s, p) => s + (p.total_maturity_amount || 0), 0);

  return (
    <>
      {showStats && (
        <div className="member-stats mb-3">
          <div className="member-stat-card">
            <div className="msc-label">Total Invested</div>
            <div className="msc-value primary">{fmt(totalInvested)}</div>
          </div>
          <div className="member-stat-card">
            <div className="msc-label">Total Return of Investment</div>
            <div className="msc-value success">{fmt(totalReturn)}</div>
          </div>
          <div className="member-stat-card">
            <div className="msc-label">Active Plans</div>
            <div className="msc-value">{activePlans.length}</div>
          </div>
        </div>
      )}

      <Panel title="My Investment Plans">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>IRN</th>
                <th>Plan</th>
                <th>Monthly</th>
                <th>Total Invested</th>
                <th>Return of Investment</th>
                <th>Progress</th>
                <th>Next Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activePlans.map(p => {
                const { paid, total, pct } = planProgress(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <code className="member-irn">{p.irn}</code>
                    </td>
                    <td><strong>{p.plan_name}</strong></td>
                    <td><strong style={{ color: 'var(--primary)' }}>{fmt(p.monthly_amount)}</strong></td>
                    <td>{fmt(p.total_investment_amount)}</td>
                    <td><strong style={{ color: 'var(--success)' }}>{fmt(p.total_maturity_amount)}</strong></td>
                    <td>
                      <div className="progress-wrap">
                        <div className="progress-bar">
                          <div style={{ width: `${Math.max(pct, paid > 0 ? 2 : 0)}%` }} className="progress-fill" />
                        </div>
                        <span className="progress-label">{paid}/{total}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {formatDate(p.due_date)}
                    </td>
                    <td><Badge status={p.status || 'Active'} /></td>
                  </tr>
                );
              })}
              {!activePlans.length && (
                <tr>
                  <td colSpan={8} className="text-center text-muted" style={{ padding: '32px' }}>
                    No active investment plans yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
