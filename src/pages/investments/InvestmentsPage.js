import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Modal from '../../components/Modal/Modal';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Alert from '../../components/Alert/Alert';
import api from '../../services/api';
import { investmentService } from '../../services/investmentService';
import { useAuth } from '../../context/AuthContext';
import PrintReceipt from './PrintReceipt';
import BranchReceipt from './BranchReceipt';
import PaymentModeSection, { validateUpiPayment } from '../../components/PaymentMode/PaymentModeSection';
import toast from 'react-hot-toast';
import { todayISOLocal, addMonthsISO, formatLocal, formatLocalDate } from '../../utils/dateTime';
import MemberPortfolio from '../dashboards/member/MemberPortfolio';

const MIS_TABLE = {
  '3Y': { months:36, label:'3 Years' },
  '5Y': { months:60, label:'5 Years' },
  '7Y': { months:84, label:'7 Years' },
};
// Official MIS monthly amounts — ₹100 to ₹30,000 per month
const MIS_MIN = 100;
const MIS_MAX = 30000;
const MIS_AMOUNTS = [
  100, 200, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000,
  5000, 6000, 7500, 9000, 10000, 12000, 15000, 20000, 25000, 30000,
];
const ROI = {
  '3Y': { num:7,  den:6,  pct:'16.67', label:'16.67%' },
  '5Y': { num:4,  den:3,  pct:'33.33', label:'33.33%' },
  '7Y': { num:19, den:14, pct:'35.71', label:'35.71%' },
};
const calcMaturity = (monthly, tenure, months) => {
  const r = ROI[tenure];
  return Math.round((monthly * months * r.num) / r.den);
};
const calcMISRow = (monthly) => ({
  monthly,
  '3Y': { total: monthly * 36, maturity: calcMaturity(monthly, '3Y', 36) },
  '5Y': { total: monthly * 60, maturity: calcMaturity(monthly, '5Y', 60) },
  '7Y': { total: monthly * 84, maturity: calcMaturity(monthly, '7Y', 84) },
});
const MIS_RATE_CHART = MIS_AMOUNTS.map(calcMISRow);

const SIS_PLAN = { tenure: '7.5Y', months: 90, label: '7.5 Years', roi: '100%' };
const SIS_AMOUNTS = [
  5000, 10000, 20000, 30000, 40000, 50000,
  100000, 150000, 200000, 250000, 300000, 350000,
  400000, 450000, 500000, 600000, 700000, 800000,
  900000, 1000000,
];
const SIS_RATE_CHART = SIS_AMOUNTS.map(amt => ({
  investment: amt,
  maturity: amt * 2,
}));

const displayTenure = (plan) =>
  plan?.plan_tenure_display || (plan?.plan_type === 'SIS' ? '7.5Y' : plan?.plan_tenure);

const fmt = n => '\u20b9' + (n||0).toLocaleString('en-IN');

/** TRI = installments paid × monthly amount (e.g. ₹1000/mo, 2 paid → ₹2000) */
const calcTRI = (p) => {
  if (p?.tri != null) return p.tri;
  if (p?.total_received_investment != null) return p.total_received_investment;
  const paid = p?.installments_paid || 0;
  const monthly = parseFloat(p?.monthly_amount || 0);
  if (p?.plan_type === 'SIS') return paid ? monthly : 0;
  return paid && monthly ? paid * monthly : 0;
};

/** SMI status: "1 of 36" / "2 of 60" / "1 of 1" (SIS) */
const formatSmiStatus = (p) =>
  p?.status_label || p?.installment_status || p?.smi_status ||
  `${p?.installments_paid || 0} of ${p?.total_installments || 0}`;

/** TRI display — ₹0 when none paid; — for unpaid SIS */
const displayTRI = (p) => {
  const tri = calcTRI(p);
  if (p?.plan_type === 'SIS' && !(p?.installments_paid > 0)) return '—';
  return fmt(tri);
};

const approvalBadge = (status) => {
  const s = status || 'Pending';
  const bg = s === 'Approved' ? 'var(--success-bg)' : s === 'Rejected' ? 'var(--danger-bg)' : 'var(--warning-bg)';
  const color = s === 'Approved' ? 'var(--success)' : s === 'Rejected' ? 'var(--danger)' : 'var(--warning)';
  return (
    <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'2px 9px', borderRadius:10, background:bg, color }}>
      {s}
    </span>
  );
};

export default function InvestmentsPage() {
  const [view, setView] = useState('list');
  const [chartPreset, setChartPreset] = useState(null);
  const { user } = useAuth();

  if (user?.role === 'member') {
    return (
      <div className="page-enter">
        <div className="page-header">
          <div>
            <h1>My Investments</h1>
            <p className="text-muted">Your active MIS and SIS plans</p>
          </div>
        </div>
        <MemberPortfolio showStats />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div><h1>Investment Plans</h1><p className="text-muted">MIS / SIS plan management</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className={`btn ${view==='list'?'btn-primary':'btn-outline'}`} onClick={()=>setView('list')}>All Plans</button>
          <button className={`btn ${view==='mis'?'btn-primary':'btn-outline'}`} onClick={()=>setView('mis')}>New MIS Plan</button>
          <button className={`btn ${view==='sis'?'btn-primary':'btn-outline'}`} onClick={()=>setView('sis')}>New SIS Plan</button>
          <button className={`btn ${view==='chart'?'btn-primary':'btn-outline'}`} onClick={()=>setView('chart')}>MIS Rate Chart</button>
          <button className={`btn ${view==='sischart'?'btn-primary':'btn-outline'}`} onClick={()=>setView('sischart')}>SIS Rate Chart</button>
          <button className={`btn ${view==='contrib'?'btn-primary':'btn-outline'}`} onClick={()=>setView('contrib')}>MIS Contribution</button>
          <button className={`btn ${view==='approve'?'btn-primary':'btn-outline'}`} onClick={()=>setView('approve')}>Approve Investment</button>
        </div>
      </div>

      {view === 'list'    && <PlanList onView={setView} />}
      {view === 'mis'     && <NewPlanForm type="MIS" preset={chartPreset} onDone={()=>setView('approve')} />}
      {view === 'sis'     && <NewPlanForm type="SIS" preset={chartPreset?.type === 'SIS' ? chartPreset : null} onDone={()=>setView('approve')} />}
      {view === 'chart'   && <MISRateChart onSelect={(amt, tenure) => { setChartPreset({ monthly: amt, tenure }); setView('mis'); }} />}
      {view === 'sischart'&& <SISRateChart onSelect={(amt) => { setChartPreset({ monthly: amt, type: 'SIS' }); setView('sis'); }} />}
      {view === 'contrib' && <MISContribution />}
      {view === 'approve' && <ApproveInvestment />}
    </div>
  );
}

/* ══ MIS RATE CHART ══ */
function MISRateChart({ onSelect }) {
  return (
    <Panel title="MIS (Monthly Investment Scheme)" subtitle={`Monthly installment: ${fmt(MIS_MIN)} to ${fmt(MIS_MAX)} per month`}>
      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th rowSpan={2}>S.No.</th>
              <th rowSpan={2}>Monthly Investment</th>
              <th colSpan={2} style={{textAlign:'center',background:'rgba(var(--primary-rgb),0.08)'}}>3 Years</th>
              <th colSpan={2} style={{textAlign:'center',background:'rgba(var(--primary-rgb),0.12)'}}>5 Years</th>
              <th colSpan={2} style={{textAlign:'center',background:'rgba(var(--primary-rgb),0.16)'}}>7 Years</th>
              <th rowSpan={2}>Action</th>
            </tr>
            <tr>
              <th style={{background:'rgba(var(--primary-rgb),0.08)'}}>Total Investment</th>
              <th style={{background:'rgba(var(--primary-rgb),0.08)'}}>ROI / Maturity</th>
              <th style={{background:'rgba(var(--primary-rgb),0.12)'}}>Total Investment</th>
              <th style={{background:'rgba(var(--primary-rgb),0.12)'}}>ROI / Maturity</th>
              <th style={{background:'rgba(var(--primary-rgb),0.16)'}}>Total Investment</th>
              <th style={{background:'rgba(var(--primary-rgb),0.16)'}}>ROI / Maturity</th>
            </tr>
          </thead>
          <tbody>
            {MIS_RATE_CHART.map((row, i) => (
              <tr key={row.monthly}>
                <td>{i + 1}</td>
                <td><strong style={{color:'var(--primary)'}}>{fmt(row.monthly)}</strong></td>
                <td>{fmt(row['3Y'].total)}</td>
                <td><strong style={{color:'var(--success)'}}>{fmt(row['3Y'].maturity)}</strong></td>
                <td>{fmt(row['5Y'].total)}</td>
                <td><strong style={{color:'var(--success)'}}>{fmt(row['5Y'].maturity)}</strong></td>
                <td>{fmt(row['7Y'].total)}</td>
                <td><strong style={{color:'var(--success)'}}>{fmt(row['7Y'].maturity)}</strong></td>
                <td>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {['3Y','5Y','7Y'].map(t => (
                      <button key={t} className="btn btn-outline btn-sm"
                        onClick={() => onSelect(row.monthly, t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:14,padding:'12px 16px',background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',fontSize:'0.82rem',color:'var(--text-muted)'}}>
        <strong>Monthly range:</strong> {fmt(MIS_MIN)} to {fmt(MIS_MAX)} per month &nbsp;|&nbsp;
        <strong>ROI:</strong> 3 Year — 16.67% &nbsp;|&nbsp; 5 Year — 33.33% &nbsp;|&nbsp; 7 Year — 35.71%
        &nbsp;|&nbsp; Click a tenure button to create a plan with that amount.
      </div>
    </Panel>
  );
}

/* ══ SIS RATE CHART ══ */
function SISRateChart({ onSelect }) {
  return (
    <Panel title="SIS (Systematic Investment Scheme)" subtitle="7.5 Year lump sum — maturity amount is double the investment">
      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Investment Amount</th>
              <th>Maturity Amount (2×)</th>
              <th>ROI</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {SIS_RATE_CHART.map((row, i) => (
              <tr key={row.investment}>
                <td>{i + 1}</td>
                <td><strong style={{color:'var(--primary)'}}>{fmt(row.investment)}</strong></td>
                <td><strong style={{color:'var(--success)'}}>{fmt(row.maturity)}</strong></td>
                <td style={{fontWeight:700,color:'var(--primary)'}}>100%</td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => onSelect(row.investment)}>
                    Create SIS
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:14,padding:'12px 16px',background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',fontSize:'0.82rem',color:'var(--text-muted)'}}>
        <strong>Tenure:</strong> 7.5 Years (90 months) &nbsp;|&nbsp;
        <strong>ROI:</strong> 100% (amount doubles at maturity) &nbsp;|&nbsp;
        <strong>Range:</strong> ₹5,000 to ₹10,00,000 (multiples of ₹1,000)
      </div>
    </Panel>
  );
}

const PAY_MODES = ['Cash', 'Cheque', 'DD', 'UPI', 'NEFT'];

const emptyPlanEdit = () => ({
  monthly_amount: '',
  plan_tenure: '3Y',
  payment_mode: 'Cash',
  investment_date: todayISOLocal(),
  approval_status: 'Pending',
  status: 'Active',
  installments_paid: '0',
});

/* ══ ADMIN PLAN VIEW / EDIT ══ */
function PlanDetailRows({ plan }) {
  if (!plan) return null;
  const rows = [
    ['IRN', plan.irn],
    ['Investor ID', plan.investor_id],
    ['Investor Name', plan.investor_name || '—'],
    ['Mobile', plan.investor_mobile || '—'],
    ['Branch', plan.branch_name || '—'],
    ['Plan Type', plan.plan_type],
    ['Tenure', displayTenure(plan)],
    ['Monthly Amount', fmt(plan.monthly_amount)],
    ['Total Investment', fmt(plan.total_investment_amount)],
    ['Maturity', fmt(plan.total_maturity_amount)],
    ['ROI', plan.roi_display],
    ['TRI (Total Received)', fmt(calcTRI(plan))],
    ['SMI Status', formatSmiStatus(plan)],
    ['Payment Mode', plan.payment_mode],
    ['Investment Date', formatLocalDate(plan.investment_date)],
    ['Maturity Date', formatLocalDate(plan.maturity_date)],
    ['Approval', plan.approval_status],
    ['Status', plan.status],
    ['Created', formatLocal(plan.created_at)],
  ];
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.85rem', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          <strong style={{ textAlign: 'right' }}>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function PlanAdminModals({ viewPlan, editPlan, editForm, editSaving, onCloseView, onCloseEdit, onEditChange, onSaveEdit }) {
  return (
    <>
      <Modal open={!!viewPlan} onClose={onCloseView} title="Investment Plan Details" size="md">
        <PlanDetailRows plan={viewPlan} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn-primary" onClick={onCloseView}>Close</button>
        </div>
      </Modal>

      <Modal open={!!editPlan} onClose={onCloseEdit} title={`Edit Plan — ${editPlan?.irn || ''}`} size="md">
        {editPlan && (
          <>
            <Alert type="info" className="mb-2">
              {editPlan.approval_status === 'Pending'
                ? 'Pending plans: amount and tenure can be changed.'
                : 'Approved plans: only status, payment mode, dates, and installment count can be updated here.'}
            </Alert>
            <div className="reg-form-row">
              <Field label={editPlan.plan_type === 'SIS' ? 'Investment Amount (₹)' : 'Monthly Amount (₹)'} required>
                {editPlan.plan_type === 'SIS' ? (
                  <Select
                    value={editForm.monthly_amount}
                    onChange={e => onEditChange('monthly_amount', e.target.value)}
                    disabled={editPlan.approval_status !== 'Pending'}
                  >
                    {SIS_AMOUNTS.map(amt => (
                      <option key={amt} value={amt}>{fmt(amt)}</option>
                    ))}
                  </Select>
                ) : (
                  <Select
                    value={editForm.monthly_amount}
                    onChange={e => onEditChange('monthly_amount', e.target.value)}
                    disabled={editPlan.approval_status !== 'Pending'}
                  >
                    {MIS_AMOUNTS.map(amt => (
                      <option key={amt} value={amt}>{fmt(amt)} / month</option>
                    ))}
                  </Select>
                )}
              </Field>
              {editPlan.plan_type === 'MIS' && (
                <Field label="Tenure">
                  <Select
                    value={editForm.plan_tenure}
                    onChange={e => onEditChange('plan_tenure', e.target.value)}
                    disabled={editPlan.approval_status !== 'Pending'}
                  >
                    {Object.keys(MIS_TABLE).map(t => <option key={t} value={t}>{MIS_TABLE[t].label}</option>)}
                  </Select>
                </Field>
              )}
            </div>
            <div className="reg-form-row">
              <Field label="Payment Mode">
                <Select value={editForm.payment_mode} onChange={e => onEditChange('payment_mode', e.target.value)}>
                  {PAY_MODES.map(m => <option key={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Investment Date">
                <Input type="date" value={editForm.investment_date} onChange={e => onEditChange('investment_date', e.target.value)} />
              </Field>
            </div>
            <div className="reg-form-row">
              <Field label="Approval Status">
                <Select value={editForm.approval_status} onChange={e => onEditChange('approval_status', e.target.value)}>
                  {['Pending', 'Approved', 'Rejected'].map(s => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Plan Status">
                <Select value={editForm.status} onChange={e => onEditChange('status', e.target.value)}>
                  {['Active', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Installments Paid">
              <Input
                type="number"
                min="0"
                value={editForm.installments_paid}
                onChange={e => onEditChange('installments_paid', e.target.value)}
              />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={onCloseEdit}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={onSaveEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

/* ══ LIST INVESTMENT ══ */
function PlanList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';
  const [data, setData] = useState({ items:[], total:0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [receiptIrn, setReceiptIrn] = useState(null);
  const [branchReceiptIrn, setBranchReceiptIrn] = useState(null);
  const [viewPlan, setViewPlan] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [editForm, setEditForm] = useState(emptyPlanEdit());
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page: 1, per_page: 100 };
    if (filterType) params.plan_type = filterType;
    if (filterStatus) params.status = filterStatus;
    investmentService.list(params)
      .then(r => setData(r.data.data || { items: [], total: 0 }))
      .catch(e => toast.error(e.response?.data?.message || 'Cannot connect to server'))
      .finally(() => setLoading(false));
  }, [filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const deletePlan = async (plan) => {
    if (!window.confirm(`Delete investment plan ${plan.irn}? This cannot be undone.`)) return;
    try {
      await investmentService.delete(plan.id);
      toast.success(`Investment plan ${plan.irn} deleted`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete plan');
    }
  };

  const openView = async (plan) => {
    try {
      const r = await investmentService.get(plan.id);
      setViewPlan(r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load plan');
    }
  };

  const openEdit = async (plan) => {
    try {
      const r = await investmentService.get(plan.id);
      const p = r.data.data;
      setEditPlan(p);
      setEditForm({
        monthly_amount: String(p.monthly_amount ?? ''),
        plan_tenure: p.plan_tenure || '3Y',
        payment_mode: p.payment_mode || 'Cash',
        investment_date: (p.investment_date || todayISOLocal()).slice(0, 10),
        approval_status: p.approval_status || 'Pending',
        status: p.status || 'Active',
        installments_paid: String(p.installments_paid ?? 0),
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load plan');
    }
  };

  const saveEdit = async () => {
    if (!editPlan) return;
    setEditSaving(true);
    try {
      await investmentService.update(editPlan.id, {
        monthly_amount: parseFloat(editForm.monthly_amount),
        plan_tenure: editForm.plan_tenure,
        payment_mode: editForm.payment_mode,
        investment_date: editForm.investment_date,
        approval_status: editForm.approval_status,
        status: editForm.status,
        installments_paid: parseInt(editForm.installments_paid, 10) || 0,
      });
      toast.success(`Plan ${editPlan.irn} updated`);
      setEditPlan(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update plan');
    } finally {
      setEditSaving(false);
    }
  };

  const filtered = search
    ? (data.items||[]).filter(p =>
        p.irn?.toLowerCase().includes(search.toLowerCase()) ||
        p.investor_id?.toLowerCase().includes(search.toLowerCase()) ||
        p.plan_name?.toLowerCase().includes(search.toLowerCase()))
    : (data.items||[]);

  return (
    <>
      <Panel
        title={`All Investment Plans (${data.total || filtered.length})`}
        actions={
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <select
              className="form-input"
              style={{ width:'auto', fontSize:'0.82rem', padding:'6px 10px' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="MIS">MIS</option>
              <option value="SIS">SIS</option>
            </select>
            <select
              className="form-input"
              style={{ width:'auto', fontSize:'0.82rem', padding:'6px 10px' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
          </div>
        }
      >
        <div style={{ display:'flex', gap:10, marginBottom:14, maxWidth:420 }}>
          <input
            style={{ flex:1, padding:'8px 12px', border:'1px solid var(--border)', borderRadius:'var(--border-radius-md)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:'0.85rem' }}
            placeholder="Search Plan ID / Investor ID / Plan name"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="btn btn-outline btn-sm" onClick={() => setSearch('')}>✕</button>}
        </div>

        {loading ? <Loading /> : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Plan ID</th>
                  <th>Investor ID</th>
                  <th>Plan</th>
                  <th>Monthly</th>
                  <th>Total Inv.</th>
                  <th>TRI</th>
                  <th>Return of Investment</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Date</th>
                  <th>Receipt</th>
                  {isAdmin && <th>Admin</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>
                      <code style={{ fontFamily:'monospace', fontSize:'0.72rem', color:'var(--success)' }}>
                        {p.irn}
                      </code>
                    </td>
                    <td>
                      <code style={{ fontFamily:'monospace', fontSize:'0.72rem', color:'var(--primary)' }}>
                        {p.investor_id}
                      </code>
                    </td>
                    <td><strong style={{ fontSize:'0.82rem' }}>{p.plan_name}</strong></td>
                    <td><strong style={{ color:'var(--primary)' }}>{fmt(p.monthly_amount)}</strong></td>
                    <td>{fmt(p.total_investment_amount)}</td>
                    <td><strong style={{ color:'var(--warning)' }}>{displayTRI(p)}</strong></td>
                    <td><strong style={{ color:'var(--success)' }}>{fmt(p.total_maturity_amount)}</strong></td>
                    <td style={{ fontSize:'0.82rem' }}>{p.payment_mode || 'Cash'}</td>
                    <td>
                      <span style={{ fontFamily:'monospace', fontSize:'0.72rem', background:'var(--bg-table-head)', padding:'2px 8px', borderRadius:4, fontWeight:700 }}>
                        {formatSmiStatus(p)}
                      </span>
                    </td>
                    <td>{approvalBadge(p.approval_status)}</td>
                    <td style={{ fontSize:'0.78rem', whiteSpace:'nowrap' }}>
                      {(p.investment_date || p.created_at || '').slice(0, 10)}
                    </td>
                    <td>
                      {p.approval_status === 'Approved' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setBranchReceiptIrn(p.irn)}
                          title="Print receipt"
                        >
                          🧾 Receipt
                        </button>
                      ) : (
                        <span style={{ color:'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openView(p)} title="View">👁</button>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)} title="Edit">✎</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setReceiptIrn(p.irn)} title="Bond">📜</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deletePlan(p)} title="Delete">✕</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 14 : 13} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                      {search ? `No results for "${search}"` : 'No plans found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <PlanAdminModals
        viewPlan={viewPlan}
        editPlan={editPlan}
        editForm={editForm}
        editSaving={editSaving}
        onCloseView={() => setViewPlan(null)}
        onCloseEdit={() => setEditPlan(null)}
        onEditChange={(k, v) => setEditForm(f => ({ ...f, [k]: v }))}
        onSaveEdit={saveEdit}
      />
      {receiptIrn && <PrintReceipt irn={receiptIrn} onClose={()=>setReceiptIrn(null)} />}
      {branchReceiptIrn && <BranchReceipt irn={branchReceiptIrn} onClose={()=>setBranchReceiptIrn(null)} />}
    </>
  );
}

/* ══ NEW MIS / SIS PLAN FORM ══ */
function NewPlanForm({ type, onDone, preset }) {
  const isSIS = type === 'SIS';
  const [investorId,  setInvestorId]  = useState('');
  const [investorInfo,setInvestorInfo]= useState(null);
  const [tenure,      setTenure]      = useState('3Y');
  const [monthly,     setMonthly]     = useState(isSIS ? '5000' : '100');
  const [payMode,     setPayMode]     = useState('Cash');
  const [txnId,       setTxnId]       = useState('');
  const [upiApp,      setUpiApp]      = useState('');
  const [invDate,     setInvDate]     = useState(todayISOLocal());
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    if (preset?.monthly) setMonthly(String(preset.monthly));
    if (preset?.tenure && !isSIS) setTenure(preset.tenure);
  }, [preset, isSIS]);

  const amountNum = parseFloat(monthly || 0);
  const months   = isSIS ? SIS_PLAN.months : (MIS_TABLE[tenure]?.months || 36);
  const total    = isSIS ? amountNum : amountNum * months;
  const maturity = isSIS ? amountNum * 2 : calcMaturity(amountNum, tenure, months);
  const roi      = isSIS ? { label: '100%' } : ROI[tenure];

  const getDetails = async () => {
    if (!investorId.trim()) { toast.error('Enter Investor ID'); return; }
    try {
      const { data } = await api.get(`/api/investment-plans/get-investor-details/${investorId.trim()}`);
      setInvestorInfo(data.data);
      toast.success('Investor details loaded');
    } catch(e) {
      toast.error(e.response?.data?.message || 'Investor not found');
      setInvestorInfo(null);
    }
  };

  const submit = async () => {
    if (!investorId || !monthly || amountNum <= 0) {
      toast.error(isSIS ? 'Enter Investor ID and Investment Amount' : 'Enter Investor ID and Monthly Amount');
      return;
    }
    const upiErr = validateUpiPayment(payMode, txnId, upiApp);
    if (upiErr) { toast.error(upiErr); return; }
    setSubmitting(true);
    try {
      const payload = {
        investor_id:     investorId.trim(),
        payment_mode:    payMode,
        investment_date: invDate,
        plan_type:       type,
      };
      if (isSIS) {
        payload.lump_amount = amountNum;
      } else {
        payload.plan_tenure = tenure;
        payload.monthly_amount = amountNum;
      }
      if (payMode === 'UPI') {
        payload.transaction_id = txnId.trim();
        payload.upi_app = upiApp;
      }
      await investmentService.create(payload);
      toast.success(`${type} Plan created! Go to Approve Investment tab.`);
      onDone();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to create plan');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16,alignItems:'start'}}>
      <Panel title={`New ${type} Plan`}>

        {/* Step 1: Enter Investor ID + Get Details button */}
        <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',padding:14,marginBottom:14,border:'1px solid var(--border)'}}>
          <Field label="Investor ID *">
            <div style={{display:'flex',gap:8}}>
              <Input value={investorId} onChange={e=>{setInvestorId(e.target.value.trim());setInvestorInfo(null);}}
                placeholder="e.g. DEFIN202601" style={{flex:1,fontFamily:'monospace'}} />
              <button className="btn btn-outline" onClick={getDetails} style={{flexShrink:0}}>Get Details</button>
            </div>
          </Field>

          {investorInfo && (
            <div style={{background:'var(--success-bg)',border:'1px solid var(--success)',borderRadius:'var(--border-radius-sm)',padding:'12px 14px',marginTop:8}}>
              <div style={{fontWeight:700,color:'var(--success)',marginBottom:6}}>✅ Investor Details</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',fontSize:'0.82rem'}}>
                <div><span style={{color:'var(--text-muted)'}}>Investor ID: </span><strong>{investorInfo.investor_id}</strong></div>
                <div><span style={{color:'var(--text-muted)'}}>Name: </span><strong>{investorInfo.investor_name}</strong></div>
                <div><span style={{color:'var(--text-muted)'}}>Father: </span>{investorInfo.father_name||'—'}</div>
                <div><span style={{color:'var(--text-muted)'}}>Mobile: </span><strong>{investorInfo.mobile}</strong></div>
                <div><span style={{color:'var(--text-muted)'}}>Adviser ID: </span><code style={{fontSize:'0.75rem'}}>{investorInfo.adviser_id}</code></div>
                <div><span style={{color:'var(--text-muted)'}}>Adviser: </span>{investorInfo.adviser_name}</div>
                <div><span style={{color:'var(--text-muted)'}}>Nominee: </span>{investorInfo.nominee_name||'—'} ({investorInfo.nominee_relation||'—'})</div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Add Plan */}
        <div style={{fontWeight:700,marginBottom:10}}>Add Plan</div>

        {/* Tenure selector */}
        {isSIS ? (
          <div style={{padding:'14px',textAlign:'center',borderRadius:'var(--border-radius-lg)',marginBottom:14,
            border:'2px solid var(--primary)',background:'var(--primary)'}}>
            <div style={{fontWeight:700,fontSize:'1rem',color:'#fff'}}>SIS 7.5Y</div>
            <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.7)'}}>{SIS_PLAN.label}</div>
            <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.8)'}}>{SIS_PLAN.months} Months · 100% ROI</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
            {Object.entries(MIS_TABLE).map(([key,v]) => (
              <div key={key}
                onClick={()=>setTenure(key)}
                style={{padding:'14px',textAlign:'center',borderRadius:'var(--border-radius-lg)',cursor:'pointer',
                  border:`2px solid ${tenure===key?'var(--primary)':'var(--border)'}`,
                  background:tenure===key?'var(--primary)':'var(--bg-input)'}}>
                <div style={{fontWeight:700,fontSize:'1rem',color:tenure===key?'#fff':'var(--text-primary)'}}>{type} {key}</div>
                <div style={{fontSize:'0.78rem',color:tenure===key?'rgba(255,255,255,0.7)':'var(--text-muted)'}}>{v.label}</div>
                <div style={{fontSize:'0.78rem',color:tenure===key?'rgba(255,255,255,0.8)':'var(--text-muted)'}}>{v.months} Months</div>
              </div>
            ))}
          </div>
        )}

        <Field label={isSIS ? `Investment Amount (\u20b9) *` : `Monthly Amount (\u20b9) *`}>
          {!isSIS && (
            <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:6}}>
              Official chart: {fmt(MIS_MIN)} to {fmt(MIS_MAX)} per month
            </div>
          )}
          {isSIS ? (
            <Select value={monthly} onChange={e=>setMonthly(e.target.value)}>
              <option value="">Select investment amount</option>
              {SIS_AMOUNTS.map(amt => (
                <option key={amt} value={amt}>{fmt(amt)} → Maturity {fmt(amt * 2)}</option>
              ))}
            </Select>
          ) : (
            <Select value={monthly} onChange={e=>setMonthly(e.target.value)}>
              <option value="">Select monthly installment</option>
              {MIS_AMOUNTS.map(amt => (
                <option key={amt} value={amt}>{fmt(amt)} / month</option>
              ))}
            </Select>
          )}
        </Field>

        <PaymentModeSection
          payMode={payMode}
          onPayModeChange={mode => {
            setPayMode(mode);
            if (mode === 'Cash') { setTxnId(''); setUpiApp(''); }
          }}
          transactionId={txnId}
          onTransactionIdChange={setTxnId}
          upiApp={upiApp}
          onUpiAppChange={setUpiApp}
        />

        <Field label="Investment Date">
          <Input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)} />
        </Field>

        <Alert type="warning" style={{marginBottom:12}}>
          After creating, go to <strong>Approve Investment</strong> tab to approve and generate Investment ID.
        </Alert>

        <button className="btn btn-primary btn-full" onClick={submit} disabled={submitting||!monthly}>
          {submitting ? 'Creating...' : `✓ Create ${type} Plan`}
        </button>
      </Panel>

      {/* Plan Preview */}
      <div style={{background:'var(--bg-sidebar)',borderRadius:'var(--border-radius-lg)',padding:20,position:'sticky',top:16}}>
        <div style={{fontWeight:700,color:'#fff',marginBottom:16,fontSize:'0.9rem'}}>Plan Preview</div>
        {[
          ['Plan Tenure',       isSIS ? `${SIS_PLAN.label} (${SIS_PLAN.months} months)` : `${MIS_TABLE[tenure]?.label} (${months} months)`],
          ...(isSIS ? [] : [['Total Installments', months]]),
          [isSIS ? 'Investment Amount' : 'Monthly Amount',
            <span style={{color:'var(--accent-light)',fontWeight:700}}>{fmt(amountNum)}</span>],
          ['Total Investment',  fmt(total)],
          ['Maturity Amount',   <span style={{color:'#a5d6a7',fontWeight:800,fontSize:'1.1rem'}}>{fmt(maturity)}</span>],
          ['ROI',               <span style={{color:'var(--accent-light)',fontWeight:700}}>{roi.label}</span>],
          ['Payment Mode',      payMode],
          ...(payMode === 'UPI' ? [
            ['UPI App',         upiApp ? upiApp.charAt(0).toUpperCase() + upiApp.slice(1) : '—'],
            ['Transaction ID',    <span style={{fontFamily:'monospace',fontSize:'0.78rem'}}>{txnId || '—'}</span>],
          ] : []),
          ...(isSIS ? [] : [['First Due Date', addMonthsISO(invDate, 1)]]),
        ].map(([k,v]) => (
          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',fontSize:'0.82rem'}}>
            <span style={{color:'rgba(255,255,255,0.5)'}}>{k}</span>
            <span style={{color:'#fff',fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ MIS CONTRIBUTION ══ */
function MISContribution() {
  const [investorId,  setInvestorId]  = useState('');
  const [info,        setInfo]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [payingId,    setPayingId]    = useState(null);

  const getDetails = async () => {
    if (!investorId.trim()) { toast.error('Enter Investor ID'); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/api/investment-plans/mis-contribution', {
        params: { investor_id: investorId.trim() }
      });
      setInfo(data.data);
    } catch(e) {
      toast.error(e.response?.data?.message || 'Investor not found');
      setInfo(null);
    } finally { setLoading(false); }
  };

  const payInstallment = async (plan) => {
    setPayingId(plan.id);
    try {
      const { data } = await api.post(`/api/investment-plans/pay-installment/${plan.id}`);
      const r = data.data;
      if (r.is_overdue) {
        toast.success(
          `✅ Payment successful!\n₹${r.base_amount.toLocaleString('en-IN')} + ₹${r.penalty} penalty = ₹${r.amount_paid.toLocaleString('en-IN')}\nGo to Approve Investment Tab.`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          `✅ Payment successful! ₹${r.amount_paid.toLocaleString('en-IN')}\nStatus: ${r.status_label}\nGo to Approve Investment Tab.`,
          { duration: 5000 }
        );
      }
      // Refresh
      getDetails();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Payment failed');
    } finally { setPayingId(null); }
  };

  return (
    <Panel title="MIS Contribution" subtitle="Enter Investor ID to view and pay installments">
      {/* Enter Investor ID + Get Details */}
      <div style={{display:'flex',gap:8,marginBottom:14,maxWidth:500}}>
        <Input value={investorId} onChange={e=>{setInvestorId(e.target.value.trim());setInfo(null);}}
          placeholder="Enter Investor ID (e.g. DEFIN202601)" style={{flex:1,fontFamily:'monospace'}} />
        <button className="btn btn-primary" onClick={getDetails}>Get Details</button>
      </div>

      {loading && <Loading />}

      {info && (
        <>
          {/* Investor info card */}
          <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',padding:'12px 16px',marginBottom:16,border:'1px solid var(--border)'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'4px 16px',fontSize:'0.82rem'}}>
              <div><span style={{color:'var(--text-muted)'}}>Investor ID: </span><strong>{info.investor.investor_id}</strong></div>
              <div><span style={{color:'var(--text-muted)'}}>Name: </span><strong>{info.investor.investor_name}</strong></div>
              <div><span style={{color:'var(--text-muted)'}}>Father: </span>{info.investor.father_name||'—'}</div>
              <div><span style={{color:'var(--text-muted)'}}>Mobile: </span>{info.investor.mobile}</div>
              <div><span style={{color:'var(--text-muted)'}}>Adviser: </span>{info.investor.adviser_id}</div>
              <div><span style={{color:'var(--text-muted)'}}>Nominee: </span>{info.investor.nominee_name||'—'}</div>
            </div>
          </div>

          {/* Plans with installment status */}
          {info.plans.length === 0 ? (
            <Alert type="warning">No approved investment plans found for this investor.</Alert>
          ) : info.plans.map(plan => (
            <div key={plan.id} style={{border:'1px solid var(--border)',borderRadius:'var(--border-radius-lg)',padding:16,marginBottom:12,background:'var(--bg-card)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
                <div>
                  <code style={{fontFamily:'monospace',fontSize:'0.78rem',color:'var(--success)',background:'var(--success-bg)',padding:'2px 8px',borderRadius:4}}>{plan.irn}</code>
                  <span style={{marginLeft:10,fontWeight:700}}>{plan.plan_name}</span>
                </div>
                {/* SMI Status: 1 of 36 */}
                <span style={{fontFamily:'monospace',fontWeight:700,fontSize:'0.85rem',background:'var(--bg-table-head)',padding:'4px 12px',borderRadius:6}}>
                  {formatSmiStatus(plan)}
                </span>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'4px 16px',fontSize:'0.82rem',marginBottom:12}}>
                <div><span style={{color:'var(--text-muted)'}}>Monthly: </span><strong>{fmt(plan.monthly_amount)}</strong></div>
                <div><span style={{color:'var(--text-muted)'}}>TRI: </span><strong style={{color:'var(--warning)'}}>{fmt(calcTRI(plan))}</strong></div>
                <div><span style={{color:'var(--text-muted)'}}>Next Due: </span><strong style={{color:plan.is_overdue?'var(--danger)':'var(--text-primary)'}}>{plan.next_due_date||'—'}{plan.is_overdue?' ⚠️':''}</strong></div>
                <div><span style={{color:'var(--text-muted)'}}>Maturity: </span><strong style={{color:'var(--success)'}}>{fmt(plan.total_maturity_amount)}</strong></div>
              </div>

              {/* Payment amount box — with or without penalty */}
              <div style={{background:plan.is_overdue?'var(--danger-bg)':'var(--success-bg)',border:`1px solid ${plan.is_overdue?'var(--danger)':'var(--success)'}`,borderRadius:'var(--border-radius-sm)',padding:'12px 14px',marginBottom:12}}>
                {plan.is_overdue ? (
                  <>
                    <div style={{fontWeight:700,color:'var(--danger)',marginBottom:4}}>⚠️ Overdue — Penalty Applies</div>
                    <div style={{fontSize:'0.85rem'}}>
                      Base Amount: <strong>{fmt(plan.base_amount)}</strong> + Penalty: <strong>₹{plan.penalty_amount}</strong> = <strong style={{fontSize:'1rem',color:'var(--danger)'}}>{fmt(plan.payable_amount)}</strong> Total
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{fontWeight:700,color:'var(--success)',marginBottom:4}}>✅ On Time</div>
                    <div style={{fontSize:'0.85rem'}}>Amount: <strong style={{fontSize:'1rem'}}>{fmt(plan.payable_amount)}</strong></div>
                  </>
                )}
              </div>

              <button className="btn btn-primary" style={{width:'100%'}}
                onClick={() => payInstallment(plan)}
                disabled={payingId === plan.id || plan.installments_paid >= plan.total_installments}>
                {payingId === plan.id ? 'Processing...' :
                 plan.installments_paid >= plan.total_installments ? '✅ All Paid' :
                 `Continue Investment — Pay ${fmt(plan.payable_amount)}`}
              </button>
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

/* ══ APPROVE INVESTMENT ══ */
function ApproveInvestment() {
  const { user } = useAuth();
  const [data,    setData]    = useState({ items:[] });
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);
  const isAdmin = user?.role === 'superadmin';

  const load = useCallback(() => {
    setLoading(true);
    investmentService.list({ status:'Pending' })
      .then(r => setData(r.data.data || {}))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (plan, action) => {
    setActing(plan.id);
    try {
      if (action === 'reject') {
        await investmentService.delete(plan.id);
        toast.success(`Investment plan deleted: ${plan.irn}`);
      } else {
        await investmentService.approve(plan.id, action);
        toast.success(
          `Investment approved! ID: ${plan.irn} — TRI: ${fmt(plan.monthly_amount)} (1st SMI paid)`,
          { duration: 6000 }
        );
      }
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally { setActing(null); }
  };

  return (
    <Panel title="Approve Investment" subtitle="Approve pending plans — 1st installment is collected from branch wallet">
      {!loading && (data.items||[]).length > 0 && (
        <Alert type="info" style={{ marginBottom: 12 }}>
          Approving deducts the <strong>monthly amount</strong> from the branch wallet and marks the 1st SMI as paid (TRI = monthly amount).
          Ensure the branch has sufficient balance before approving.
        </Alert>
      )}
      {loading ? <Loading /> : (
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>IRN</th><th>Investor ID</th><th>Plan</th><th>Monthly</th><th>Branch Balance</th><th>Total</th><th>Maturity</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(data.items||[]).map((p,i) => {
              const monthly = parseFloat(p.monthly_amount || 0);
              const branchBal = parseFloat(p.branch_current_balance ?? 0);
              const canApprove = branchBal >= monthly;
              return (
              <tr key={p.id}>
                <td>{i+1}</td>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--success)'}}>{p.irn}</code></td>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--primary)'}}>{p.investor_id}</code></td>
                <td><strong>{p.plan_name}</strong></td>
                <td><strong style={{color:'var(--primary)'}}>{fmt(p.monthly_amount)}</strong></td>
                <td>
                  <strong style={{color: canApprove ? 'var(--success)' : 'var(--danger)'}}>
                    {fmt(branchBal)}
                  </strong>
                  {!canApprove && (
                    <div style={{fontSize:'0.7rem',color:'var(--danger)'}}>Insufficient</div>
                  )}
                </td>
                <td>{fmt(p.total_investment_amount)}</td>
                <td><strong style={{color:'var(--success)'}}>{fmt(p.total_maturity_amount)}</strong></td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-success btn-sm"
                      disabled={acting===p.id || !canApprove}
                      title={canApprove ? 'Approve plan' : `Need ${fmt(monthly)} in branch wallet`}
                      onClick={()=>act(p,'approve')}>
                      {acting===p.id?'...':'✓ Approve'}
                    </button>
                    {isAdmin && (
                      <button className="btn btn-danger btn-sm"
                        disabled={acting===p.id}
                        onClick={()=>act(p,'reject')}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );})}
            {!(data.items||[]).length && (
              <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                No pending investments. Create a plan first.
              </td></tr>
            )}
          </tbody>
        </table>
      )}
    </Panel>
  );
}