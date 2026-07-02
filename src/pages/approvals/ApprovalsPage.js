import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Panel from '../../components/Panel/Panel';
import Badge from '../../components/Badge/Badge';
import Loading from '../../components/Loading/Loading';
import Modal from '../../components/Modal/Modal';
import Alert from '../../components/Alert/Alert';
import { memberService } from '../../services/memberService';
import { investmentService } from '../../services/investmentService';
import InvestorCredentialsModal from '../../components/InvestorCredentialsModal/InvestorCredentialsModal';
import { formatISTDate } from '../../utils/dateTime';
import { useAuth } from '../../context/AuthContext';
import { branchService } from '../../services/branchService';
import './ApprovalsPage.css';

export default function ApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'plans' ? 1 : 0;
  const [tab, setTab] = useState(initialTab);
  const [regCount,  setRegCount]  = useState(0);
  const [planCount, setPlanCount] = useState(0);

  const refreshCounts = useCallback(() => {
    memberService.pending(1).then(r => {
      const d = r.data.data || {};
      setRegCount(Number(d.total ?? d.items?.length) || 0);
    }).catch(() => {});
    investmentService.list({ status: 'pending', per_page: 1 })
      .then(r => setPlanCount(Number(r.data.total ?? (r.data.data || []).length) || 0))
      .catch(() => {});
  }, []);

  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'plans') setTab(1);
    else if (t === 'registrations') setTab(0);
  }, [searchParams]);

  const switchTab = (index) => {
    setTab(index);
    setSearchParams({ tab: index === 0 ? 'registrations' : 'plans' }, { replace: true });
  };

  return (
    <div className="approvals-page page-enter">
      <div className="page-header">
        <div>
          <h1>Approvals Queue</h1>
          <p className="text-muted">Review and approve investor registrations and investment plans</p>
        </div>
      </div>

      <div className="approval-summary">
        <button
          type="button"
          className={`as-card${tab === 0 ? ' active' : ''}${regCount > 0 ? ' has-pending' : ''}`}
          onClick={() => switchTab(0)}
        >
          <div className="as-card-main">
            <div className="as-icon">👤</div>
            <div>
              <div className="as-label">Pending Registrations</div>
              <div className="as-sub">Investor sign-ups waiting for approval</div>
            </div>
          </div>
          <div className={`as-count${regCount > 0 ? ' warning' : ''}`}>{regCount}</div>
        </button>
        <button
          type="button"
          className={`as-card${tab === 1 ? ' active' : ''}${planCount > 0 ? ' has-pending' : ''}`}
          onClick={() => switchTab(1)}
        >
          <div className="as-card-main">
            <div className="as-icon accent">📈</div>
            <div>
              <div className="as-label">Pending Investment Plans</div>
              <div className="as-sub">MIS / SIS plans waiting for approval</div>
            </div>
          </div>
          <div className={`as-count accent${planCount > 0 ? ' warning' : ''}`}>{planCount}</div>
        </button>
      </div>

      <div className="approval-tabs">
        <button type="button" className={`tab-btn${tab === 0 ? ' active' : ''}`} onClick={() => switchTab(0)}>
          Registrations {regCount > 0 && <span className="tab-count">{regCount}</span>}
        </button>
        <button type="button" className={`tab-btn${tab === 1 ? ' active' : ''}`} onClick={() => switchTab(1)}>
          Investment Plans {planCount > 0 && <span className="tab-count accent">{planCount}</span>}
        </button>
      </div>

      {tab === 0
        ? <RegApprovals onRefresh={refreshCounts} />
        : <InvApprovals onRefresh={refreshCounts} setPlanCount={setPlanCount} />}
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
  const [credModal, setCredModal] = useState(null);

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
        if (creds?.username) {
          setCredModal({
            ...creds,
            full_name: member.full_name,
            investor_id: member.investor_id,
          });
        } else {
          toast.success(`✅ Registration approved for ${member.full_name}`, { duration: 4000 });
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

      <InvestorCredentialsModal creds={credModal} onClose={() => setCredModal(null)} />
    </>
  );
}
function InvApprovals({ onRefresh, setPlanCount }) {
  const { user, wallet: authWallet } = useAuth();
  const [data, setData]       = useState({ items: [], total: 0 });
  const [branchBalance, setBranchBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);

  const loadWallet = useCallback(() => {
    if (authWallet?.current_balance != null) {
      setBranchBalance(Number(authWallet.current_balance));
      return;
    }
    branchService.list()
      .then(r => {
        const branches = r.data?.data || [];
        const branch = branches.find(b => b.id === user?.branch_id) || branches[0];
        setBranchBalance(Number(branch?.wallet?.current_balance ?? 0));
      })
      .catch(() => setBranchBalance(null));
  }, [authWallet, user?.branch_id]);

  const load = useCallback(() => {
    setLoading(true);
    investmentService.list({ status: 'pending', per_page: 100 })
      .then(r => {
        const items = r.data.data || [];
        const total = Number(r.data.total ?? items.length) || 0;
        setData({ items, total });
        if (setPlanCount) setPlanCount(total);
      })
      .finally(() => setLoading(false));
  }, [setPlanCount]);

  useEffect(() => { loadWallet(); }, [loadWallet]);
  useEffect(() => { load(); }, [load]);

  const canAfford = (plan) => branchBalance == null || Number(plan.monthly_amount || 0) <= branchBalance;

  const act = async (plan, action) => {
    if (action === 'approve' && !canAfford(plan)) {
      toast.error(
        `Insufficient branch balance. Need ₹${Number(plan.monthly_amount).toLocaleString('en-IN')}, ` +
        `available ₹${Number(branchBalance || 0).toLocaleString('en-IN')}. Ask admin to top up Branch Wallet.`
      );
      return;
    }
    setActing(true);
    try {
      const { data: resp } = await investmentService.approve(plan.id, action);
      toast.success(resp?.message || (
        action === 'approve'
          ? `✅ Plan ${plan.irn} approved — wallet updated`
          : `❌ Plan ${plan.irn} rejected`
      ));
      setConfirm(null);
      setDetail(null);
      load();
      loadWallet();
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
        subtitle="Approving a plan deducts from branch wallet and adds benefits for the adviser"
        actions={<button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>}
      >
        {loading ? <Loading /> : (
          <>
            {data.items?.length > 0 && (
              <Alert type="warning">
                <strong>Note:</strong> Approving a plan will automatically deduct the monthly amount
                from the branch current balance and add it to the cash wallet.
                Benefits will be calculated for the adviser.
                {branchBalance != null && (
                  <> Branch current balance: <strong>₹{branchBalance.toLocaleString('en-IN')}</strong>.</>
                )}
              </Alert>
            )}
            {data.items?.some(p => !canAfford(p)) && (
              <Alert type="error">
                One or more plans cannot be approved — branch wallet balance is too low.
                Go to <strong>Branch Wallet</strong> or ask Super Admin to top up funds first.
              </Alert>
            )}
            <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Plan ID</th>
                  <th>Investor ID</th>
                  <th>Plan</th>
                  <th>Tenure</th>
                  <th>Monthly</th>
                  <th>Total Invest</th>
                  <th>Return of Investment</th>
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
                    <td>{formatISTDate(p.due_date)}</td>
                    <td><Badge status={p.approval_status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns">
                        <button className="btn btn-outline btn-sm"
                          onClick={() => setDetail(p)}>👁 View</button>
                        <button className="btn btn-success btn-sm"
                          disabled={!canAfford(p)}
                          title={!canAfford(p) ? 'Insufficient branch wallet balance' : 'Approve plan'}
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
            </div>
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
                  ['Plan ID',         detail.irn || detail.plan_id],
                  ['Investor ID',     detail.investor_id],
                  ['Plan Name',       detail.plan_name],
                  ['Plan Type',       detail.plan_type],
                  ['Tenure',          detail.plan_tenure],
                  ['Investment Date', formatISTDate(detail.investment_date)],
                  ['Due Date',        formatISTDate(detail.due_date)],
                  ['Return of Investment Date', formatISTDate(detail.maturity_date)],
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
                <div className="detail-row"><span>Return of Investment</span>
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
                disabled={!canAfford(detail)}
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
                Benefits will be auto-calculated for the adviser.
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