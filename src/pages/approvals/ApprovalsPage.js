import React, { useState, useEffect } from 'react';
import Panel from '../../components/Panel/Panel';
import Badge from '../../components/Badge/Badge';
import Loading from '../../components/Loading/Loading';
import { memberService } from '../../services/memberService';
import { investmentService } from '../../services/investmentService';
import toast from 'react-hot-toast';
import './ApprovalsPage.css';

export default function ApprovalsPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Approvals Queue</h1>
        <div className="tabs">
          <button className={`tab-btn ${tab===0?'active':''}`} onClick={() => setTab(0)}>Registrations</button>
          <button className={`tab-btn ${tab===1?'active':''}`} onClick={() => setTab(1)}>Investment Plans</button>
        </div>
      </div>
      {tab === 0 ? <RegApprovals /> : <InvApprovals />}
    </div>
  );
}

function RegApprovals() {
  const [data, setData] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    memberService.pending().then(r => setData(r.data.data || {})).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    try {
      await memberService.approve(id, action);
      toast.success(`Registration ${action}d`);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Action failed'); }
  };

  return (
    <Panel title="Pending Registrations" subtitle="Approve or reject investor registrations">
      {loading ? <Loading /> : (
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Investor ID</th><th>Name</th><th>Mobile</th><th>Adviser</th><th>DOJ</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data.items?.map((m, i) => (
              <tr key={m.id}>
                <td>{i+1}</td>
                <td><code>{m.investor_id}</code></td>
                <td><strong>{m.full_name}</strong></td>
                <td>{m.mobile}</td>
                <td>{m.adviser_code}</td>
                <td>{m.date_of_joining}</td>
                <td><Badge status={m.approval_status} /></td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-success btn-sm" onClick={() => act(m.id, 'approve')}>✓ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => act(m.id, 'reject')}>✕ Reject</button>
                  </div>
                </td>
              </tr>
            ))}
            {!data.items?.length && <tr><td colSpan={8} className="text-center text-muted" style={{padding:'32px'}}>No pending registrations</td></tr>}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function InvApprovals() {
  const [data, setData] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    investmentService.list({ status: 'Pending' }).then(r => setData(r.data.data || {})).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    try {
      await investmentService.approve(id, action);
      toast.success(`Plan ${action}d`);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Action failed'); }
  };

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;

  return (
    <Panel title="Pending Investment Plans" subtitle="Approve or reject investment plans — wallet will auto-update on approval">
      {loading ? <Loading /> : (
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>IRN</th><th>Investor</th><th>Plan</th><th>Monthly</th><th>Maturity</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data.items?.map((p, i) => (
              <tr key={p.id}>
                <td>{i+1}</td>
                <td><code style={{fontSize:'0.75rem'}}>{p.irn}</code></td>
                <td>{p.investor_id}</td>
                <td><strong>{p.plan_name}</strong></td>
                <td>{fmt(p.monthly_amount)}</td>
                <td style={{color:'var(--success)',fontWeight:700}}>{fmt(p.total_maturity_amount)}</td>
                <td><Badge status={p.approval_status} /></td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-success btn-sm" onClick={() => act(p.id, 'approve')}>✓ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => act(p.id, 'reject')}>✕ Reject</button>
                  </div>
                </td>
              </tr>
            ))}
            {!data.items?.length && <tr><td colSpan={8} className="text-center text-muted" style={{padding:'32px'}}>No pending plans</td></tr>}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
