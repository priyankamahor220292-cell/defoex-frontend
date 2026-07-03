import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Badge from '../../components/Badge/Badge';
import Loading from '../../components/Loading/Loading';
import Modal from '../../components/Modal/Modal';
import Alert from '../../components/Alert/Alert';
import { memberService } from '../../services/memberService';
import { investmentService } from '../../services/investmentService';
import toast from 'react-hot-toast';
import './ApprovalsPage.css';

export default function ApprovalsPage() {
  const [tab, setTab] = useState(0);
  const [regCount,  setRegCount]  = useState(0);
  const [planCount, setPlanCount] = useState(0);

  const refreshCounts = useCallback(() => {
    memberService.pending(1).then(r => setRegCount(r.data.data?.total || 0)).catch(() => {});
    investmentService.list({ status: 'Pending' }).then(r => setPlanCount(r.data.data?.total || 0)).catch(() => {});
  }, []);

  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Approvals Queue</h1>
          <p className="text-muted">Review and approve investor registrations and investment plans</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="approval-summary">
        <div className={`as-card ${tab===0?'active':''}`} onClick={() => setTab(0)}>
          <div className="as-count">{regCount}</div>
          <div className="as-label">Pending Registrations</div>
          <div className="as-sub">Investor sign-ups waiting for approval</div>
        </div>
        <div className={`as-card ${tab===1?'active':''}`} onClick={() => setTab(1)}>
          <div className="as-count accent">{planCount}</div>
          <div className="as-label">Pending Investment Plans</div>
          <div className="as-sub">MIS plans waiting for approval</div>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="tabs" style={{marginBottom:16}}>
        <button className={`tab-btn ${tab===0?'active':''}`} onClick={() => setTab(0)}>
          Registrations {regCount > 0 && <span className="tab-count">{regCount}</span>}
        </button>
        <button className={`tab-btn ${tab===1?'active':''}`} onClick={() => setTab(1)}>
          Investment Plans {planCount > 0 && <span className="tab-count accent">{planCount}</span>}
        </button>
      </div>

      {tab === 0
        ? <RegApprovals onRefresh={refreshCounts} />
        : <InvApprovals onRefresh={refreshCounts} />}
    </div>
  );
}

/* ─── REGISTRATION APPROVALS ─── */
function RegApprovals({ onRefresh }) {
  const [data, setData]       = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const [detail, setDetail]   = useState(null);
  const [confirm, setConfirm] = useState(null); // {member, action}
  const [acting, setActing]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    memberService.pending(1)
      .then(r => setData(r.data.data || {}))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (member, action) => {
    setActing(true);
    try {
      const { data } = await memberService.approve(member.id, action);
      if (action === 'approve') {
        const creds = data?.data?.credentials;
        toast.success(`✅ Registration approved for ${member.full_name}`, { duration: 4000 });
        if (creds) {
          // Show credentials in a prominent toast
          setTimeout(() => {
            toast((t) => (
              <div style={{fontFamily:'monospace',lineHeight:1.8}}>
                <div style={{fontWeight:700,color:'#00c853',marginBottom:4}}>🎉 Investor Account Created!</div>
                <div>Username: <strong>{creds.username}</strong></div>
                <div>Password: <strong>{creds.password}</strong></div>
                <div style={{fontSize:'0.75rem',color:'#999',marginTop:4}}>Save these credentials for the investor</div>
              </div>
            ), { duration: 12000, style: { minWidth: 280 } });
          }, 500);
        }
      } else {
        toast.success(`❌ Registration rejected for ${member.full_name}`);
      }
      setConfirm(null);
      setDetail(null);
      load();
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally { setActing(false); }
  };

  return (
    <>
      <Panel
        title="Pending Investor Registrations"
        subtitle="Click a row to view full details before approving"
        actions={
          <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
        }
      >
        {loading ? <Loading /> : (
          <>
            {data.items?.length > 0 && (
              <Alert type="info">
                {data.items.length} registration{data.items.length > 1 ? 's' : ''} waiting for your approval.
                Click <strong>View</strong> to review full details, then Approve or Reject.
              </Alert>
            )}
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Investor ID</th>
                  <th>Full Name</th>
                  <th>Mobile</th>
                  <th>Adviser Code</th>
                  <th>Date of Joining</th>
                  <th>Member Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((m, i) => (
                  <tr key={m.id} className="clickable-row" onClick={() => setDetail(m)}>
                    <td>{i + 1}</td>
                    <td><code className="id-code">{m.investor_id}</code></td>
                    <td><strong>{m.full_name}</strong></td>
                    <td>{m.mobile}</td>
                    <td><code className="id-code adv">{m.adviser_code}</code></td>
                    <td>{m.date_of_joining}</td>
                    <td>{m.member_type}</td>
                    <td><Badge status={m.approval_status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns">
                        <button className="btn btn-outline btn-sm"
                          onClick={() => setDetail(m)}>👁 View</button>
                        <button className="btn btn-success btn-sm"
                          onClick={() => setConfirm({ member: m, action: 'approve' })}>✓ Approve</button>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => setConfirm({ member: m, action: 'reject' })}>✕ Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data.items?.length && (
                  <tr>
                    <td colSpan={9} className="empty-row">
                      <div className="empty-icon">✅</div>
                      <div>No pending registrations</div>
                      <div className="text-muted" style={{fontSize:'0.78rem'}}>All registrations have been processed</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </Panel>

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Investor Registration Details" size="lg">
        {detail && (
          <div className="detail-modal">
            <div className="detail-grid">
              <div className="detail-section">
                <div className="ds-title">Personal Information</div>
                {[
                  ['Investor ID',    detail.investor_id],
                  ['Full Name',      detail.full_name],
                  ['Father/Spouse',  detail.father_spouse_name],
                  ['Mobile',         detail.mobile],
                  ['Email',          detail.email],
                  ['Date of Birth',  detail.date_of_birth],
                  ['Age',            detail.age],
                  ['Gender',         detail.gender],
                  ['Marital Status', detail.marital_status],
                  ['Nationality',    detail.nationality],
                ].map(([k,v]) => v && (
                  <div key={k} className="detail-row"><span>{k}</span><strong>{v}</strong></div>
                ))}
              </div>
              <div className="detail-section">
                <div className="ds-title">Address & KYC</div>
                {[
                  ['Address',    detail.corr_address],
                  ['City',       detail.corr_city],
                  ['State',      detail.corr_state],
                  ['Pincode',    detail.corr_pincode],
                  ['Aadhar No.', detail.aadhar_number],
                  ['PAN No.',    detail.pan_number],
                ].map(([k,v]) => v && (
                  <div key={k} className="detail-row"><span>{k}</span><strong>{v}</strong></div>
                ))}
                <div className="ds-title" style={{marginTop:12}}>Nominee</div>
                {[
                  ['Nominee Name', detail.nominee_name],
                  ['Relationship', detail.nominee_relationship],
                  ['Age',          detail.nominee_age],
                ].map(([k,v]) => v && (
                  <div key={k} className="detail-row"><span>{k}</span><strong>{v}</strong></div>
                ))}
              </div>
              <div className="detail-section">
                <div className="ds-title">Bank Details</div>
                {[
                  ['Bank Name',   detail.bank_name],
                  ['Account No.', detail.account_number],
                  ['IFSC Code',   detail.ifsc_code],
                  ['UPI ID',      detail.upi_id],
                ].map(([k,v]) => v && (
                  <div key={k} className="detail-row"><span>{k}</span><strong>{v}</strong></div>
                ))}
                <div className="ds-title" style={{marginTop:12}}>Registration Info</div>
                {[
                  ['Adviser Code',  detail.adviser_code],
                  ['Member Type',   detail.member_type],
                  ['Member Fees',   detail.member_fees ? `₹${detail.member_fees}` : null],
                  ['Payment Mode',  detail.payment_mode],
                  ['Date of Join',  detail.date_of_joining],
                ].map(([k,v]) => v && (
                  <div key={k} className="detail-row"><span>{k}</span><strong>{v}</strong></div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-danger"
                onClick={() => { setDetail(null); setConfirm({ member: detail, action: 'reject' }); }}>
                ✕ Reject
              </button>
              <button className="btn btn-success btn-lg"
                onClick={() => { setDetail(null); setConfirm({ member: detail, action: 'approve' }); }}>
                ✓ Approve Registration
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Modal */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.action === 'approve' ? '✅ Confirm Approval' : '❌ Confirm Rejection'} size="sm">
        {confirm && (
          <div>
            <p style={{fontSize:'0.9rem',marginBottom:16,lineHeight:1.6}}>
              Are you sure you want to <strong>{confirm.action}</strong> the registration for{' '}
              <strong>{confirm.member.full_name}</strong> ({confirm.member.investor_id})?
            </p>
            {confirm.action === 'approve' && (
              <Alert type="success">
                After approval, the investor will be active and can be assigned an investment plan.
              </Alert>
            )}
            {confirm.action === 'reject' && (
              <Alert type="error">
                Rejected registrations remain in the system but cannot be assigned plans.
              </Alert>
            )}
            <div className="modal-actions" style={{marginTop:16}}>
              <button className="btn btn-outline" onClick={() => setConfirm(null)} disabled={acting}>Cancel</button>
              <button
                className={`btn ${confirm.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                onClick={() => act(confirm.member, confirm.action)}
                disabled={acting}>
                {acting ? 'Processing...' : confirm.action === 'approve' ? '✓ Yes, Approve' : '✕ Yes, Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ─── INVESTMENT PLAN APPROVALS ─── */
function InvApprovals({ onRefresh }) {
  const [data, setData]       = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const [detail, setDetail]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    investmentService.list({ status: 'Pending' })
      .then(r => setData(r.data.data || {}))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (plan, action) => {
    setActing(true);
    try {
      await investmentService.approve(plan.id, action);
      toast.success(
        action === 'approve'
          ? `✅ Plan ${plan.irn} approved — wallet updated`
          : `❌ Plan ${plan.irn} rejected`
      );
      setConfirm(null);
      setDetail(null);
      load();
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally { setActing(false); }
  };

  const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <>
      <Panel
        title="Pending Investment Plans"
        subtitle="Approving a plan deducts from branch wallet and adds commission for the adviser"
        actions={<button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>}
      >
        {loading ? <Loading /> : (
          <>
            {data.items?.length > 0 && (
              <Alert type="warning">
                <strong>Note:</strong> Approving a plan will automatically deduct the monthly amount
                from the branch current balance and add it to the cash wallet.
                Commission will be calculated for the adviser.
              </Alert>
            )}
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>IRN</th>
                  <th>Investor ID</th>
                  <th>Plan</th>
                  <th>Tenure</th>
                  <th>Monthly</th>
                  <th>Total Invest</th>
                  <th>Maturity</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((p, i) => (
                  <tr key={p.id} className="clickable-row" onClick={() => setDetail(p)}>
                    <td>{i + 1}</td>
                    <td><code className="id-code irn">{p.irn}</code></td>
                    <td><code className="id-code">{p.investor_id}</code></td>
                    <td><strong>{p.plan_name}</strong></td>
                    <td>{p.plan_tenure}</td>
                    <td><strong style={{color:'var(--primary)'}}>{fmt(p.monthly_amount)}</strong></td>
                    <td>{fmt(p.total_investment_amount)}</td>
                    <td><strong style={{color:'var(--success)'}}>{fmt(p.total_maturity_amount)}</strong></td>
                    <td>{p.due_date}</td>
                    <td><Badge status={p.approval_status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns">
                        <button className="btn btn-outline btn-sm"
                          onClick={() => setDetail(p)}>👁 View</button>
                        <button className="btn btn-success btn-sm"
                          onClick={() => setConfirm({ plan: p, action: 'approve' })}>✓ Approve</button>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => setConfirm({ plan: p, action: 'reject' })}>✕ Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data.items?.length && (
                  <tr>
                    <td colSpan={11} className="empty-row">
                      <div className="empty-icon">✅</div>
                      <div>No pending investment plans</div>
                      <div className="text-muted" style={{fontSize:'0.78rem'}}>All plans have been processed</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </Panel>

      {/* Plan Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Investment Plan Details" size="md">
        {detail && (
          <div>
            <div className="plan-detail-grid">
              <div className="detail-section">
                <div className="ds-title">Plan Information</div>
                {[
                  ['IRN',             detail.irn],
                  ['Investor ID',     detail.investor_id],
                  ['Plan Name',       detail.plan_name],
                  ['Plan Type',       detail.plan_type],
                  ['Tenure',          detail.plan_tenure],
                  ['Investment Date', detail.investment_date],
                  ['Due Date',        detail.due_date],
                  ['Maturity Date',   detail.maturity_date],
                  ['Installments',    detail.total_installments ? `${detail.total_installments} months` : null],
                ].map(([k,v]) => v && (
                  <div key={k} className="detail-row"><span>{k}</span><strong>{v}</strong></div>
                ))}
              </div>
              <div className="detail-section">
                <div className="ds-title">Financial Details</div>
                <div className="detail-row"><span>Monthly Amount</span>
                  <strong style={{color:'var(--primary)',fontSize:'1rem'}}>{fmt(detail.monthly_amount)}</strong></div>
                <div className="detail-row"><span>Total Investment</span>
                  <strong>{fmt(detail.total_investment_amount)}</strong></div>
                <div className="detail-row"><span>Maturity Amount</span>
                  <strong style={{color:'var(--success)',fontSize:'1rem'}}>{fmt(detail.total_maturity_amount)}</strong></div>
                <div className="detail-row"><span>Payment Mode</span>
                  <strong>{detail.payment_mode}</strong></div>
                <div className="detail-row"><span>Adviser Code</span>
                  <strong><code>{detail.adviser_code}</code></strong></div>
                <div className="ds-title" style={{marginTop:12}}>Wallet Impact on Approval</div>
                <div className="wallet-impact">
                  <div className="wi-row">
                    <span>Current Balance</span>
                    <span className="wi-arrow">−{fmt(detail.monthly_amount)}</span>
                  </div>
                  <div className="wi-row">
                    <span>Cash Wallet</span>
                    <span className="wi-plus">+{fmt(detail.monthly_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-danger"
                onClick={() => { setDetail(null); setConfirm({ plan: detail, action: 'reject' }); }}>
                ✕ Reject
              </button>
              <button className="btn btn-success btn-lg"
                onClick={() => { setDetail(null); setConfirm({ plan: detail, action: 'approve' }); }}>
                ✓ Approve Plan
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Modal */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.action === 'approve' ? '✅ Confirm Plan Approval' : '❌ Confirm Plan Rejection'} size="sm">
        {confirm && (
          <div>
            <p style={{fontSize:'0.9rem',marginBottom:16,lineHeight:1.6}}>
              Are you sure you want to <strong>{confirm.action}</strong> plan{' '}
              <strong>{confirm.plan.irn}</strong> for investor{' '}
              <strong>{confirm.plan.investor_id}</strong>?
            </p>
            {confirm.action === 'approve' && (
              <Alert type="warning">
                This will deduct <strong>₹{Number(confirm.plan.monthly_amount).toLocaleString('en-IN')}</strong> from
                the branch current balance and add it to the cash wallet.
                Commission will be auto-calculated for the adviser.
              </Alert>
            )}
            <div className="modal-actions" style={{marginTop:16}}>
              <button className="btn btn-outline" onClick={() => setConfirm(null)} disabled={acting}>Cancel</button>
              <button
                className={`btn ${confirm.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                onClick={() => act(confirm.plan, confirm.action)}
                disabled={acting}>
                {acting ? 'Processing...' : confirm.action === 'approve' ? '✓ Yes, Approve' : '✕ Yes, Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}