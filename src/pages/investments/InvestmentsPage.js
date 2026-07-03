import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Alert from '../../components/Alert/Alert';
import api from '../../services/api';
import { investmentService } from '../../services/investmentService';
import { useAuth } from '../../context/AuthContext';
import PrintReceipt from './PrintReceipt';
import BranchReceipt from './BranchReceipt';
import toast from 'react-hot-toast';

const MIS_TABLE = {
  '3Y': { months:36, label:'3 Years' },
  '5Y': { months:60, label:'5 Years' },
  '7Y': { months:84, label:'7 Years' },
};
const ROI = {
  '3Y': { num:7,  den:6,  pct:'16.67', label:'16.67%' },
  '5Y': { num:4,  den:3,  pct:'33.33', label:'33.33%' },
  '7Y': { num:19, den:14, pct:'35.71', label:'35.71%' },
};
const calcMaturity = (monthly, tenure, months) => {
  const r = ROI[tenure];
  return Math.round((monthly * months * r.num) / r.den);
};
const fmt = n => '\u20b9' + (n||0).toLocaleString('en-IN');

export default function InvestmentsPage() {
  const [view, setView] = useState('list');
  const { user } = useAuth();
  return (
    <div className="page-enter">
      <div className="page-header">
        <div><h1>Investment Plans</h1><p className="text-muted">MIS / SIS plan management</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className={`btn ${view==='list'?'btn-primary':'btn-outline'}`} onClick={()=>setView('list')}>All Plans</button>
          <button className={`btn ${view==='mis'?'btn-primary':'btn-outline'}`} onClick={()=>setView('mis')}>New MIS Plan</button>
          <button className={`btn ${view==='sis'?'btn-primary':'btn-outline'}`} onClick={()=>setView('sis')}>New SIS Plan</button>
          <button className={`btn ${view==='contrib'?'btn-primary':'btn-outline'}`} onClick={()=>setView('contrib')}>MIS Contribution</button>
          <button className={`btn ${view==='approve'?'btn-primary':'btn-outline'}`} onClick={()=>setView('approve')}>Approve Investment</button>
        </div>
      </div>

      {view === 'list'    && <PlanList onView={setView} />}
      {view === 'mis'     && <NewPlanForm type="MIS" onDone={()=>setView('approve')} />}
      {view === 'sis'     && <NewPlanForm type="SIS" onDone={()=>setView('approve')} />}
      {view === 'contrib' && <MISContribution />}
      {view === 'approve' && <ApproveInvestment />}
    </div>
  );
}

/* ══ LIST INVESTMENT ══ */
function PlanList() {
  const { user } = useAuth();
  const [data, setData] = useState({ items:[], total:0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [receiptIrn, setReceiptIrn] = useState(null);
  const [branchReceiptIrn, setBranchReceiptIrn] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    investmentService.list({ page:1 })
      .then(r => setData(r.data.data || {}))
      .catch(e => toast.error(e.response?.data?.message || 'Cannot connect to server'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? (data.items||[]).filter(p =>
        p.irn?.toLowerCase().includes(search.toLowerCase()) ||
        p.investor_id?.toLowerCase().includes(search.toLowerCase()) ||
        p.plan_name?.toLowerCase().includes(search.toLowerCase()))
    : (data.items||[]);

  return (
    <>
      <Panel title="All Investment Plans">
        {/* Search by Bond No. */}
        <div style={{display:'flex',gap:10,marginBottom:14,maxWidth:400}}>
          <input style={{flex:1,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.85rem'}}
            placeholder="🔍 Search by Bond No. (IRN) / Investor ID"
            value={search} onChange={e=>setSearch(e.target.value)} />
          {search && <button className="btn btn-outline btn-sm" onClick={()=>setSearch('')}>✕</button>}
        </div>

        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>IRN (Bond No.)</th><th>Investor ID</th>
                <th>Plan</th><th>Monthly</th><th>Total Invest</th>
                <th>Maturity</th><th>ROI</th>
                <th>Investment Status</th>
                <th>Approval</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,i) => (
                <tr key={p.id}>
                  <td>{i+1}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--success)'}}>{p.irn}</code></td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--primary)'}}>{p.investor_id}</code></td>
                  <td><strong>{p.plan_name}</strong></td>
                  <td><strong style={{color:'var(--primary)'}}>{fmt(p.monthly_amount)}</strong></td>
                  <td>{fmt(p.total_investment_amount)}</td>
                  <td><strong style={{color:'var(--success)'}}>{fmt(p.total_maturity_amount)}</strong></td>
                  <td style={{color:'var(--primary)',fontWeight:700}}>{p.roi_display}</td>
                  {/* Investment Status: 3M-1of36, 5M-1of60, 6M-1of84 */}
                  <td>
                    <span style={{fontFamily:'monospace',fontSize:'0.75rem',background:'var(--bg-table-head)',padding:'2px 8px',borderRadius:4,fontWeight:700}}>
                      {p.plan_tenure==='3Y'?'3M':p.plan_tenure==='5Y'?'5M':'7M'}-{p.installments_paid||0}of{p.total_installments}
                    </span>
                  </td>
                  <td>
                    <span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,
                      background:p.approval_status==='Approved'?'var(--success-bg)':p.approval_status==='Rejected'?'var(--danger-bg)':'var(--warning-bg)',
                      color:p.approval_status==='Approved'?'var(--success)':p.approval_status==='Rejected'?'var(--danger)':'var(--warning)'}}>
                      {p.approval_status}
                    </span>
                  </td>
                  <td>
                    {user?.role === 'superadmin'
                      ? <button className="btn btn-primary btn-sm" onClick={()=>setReceiptIrn(p.irn)} title="Print Investment Bond">📜 Bond</button>
                      : <button className="btn btn-outline btn-sm" onClick={()=>setBranchReceiptIrn(p.irn)} title="Print Receipt">🧾 Receipt</button>
                    }
                  </td>
                </tr>
              ))}
              {filtered.length===0&&(
                <tr><td colSpan={11} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                  {search?`No results for "${search}"` : 'No plans found'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </Panel>
      {receiptIrn && <PrintReceipt irn={receiptIrn} onClose={()=>setReceiptIrn(null)} />}
      {branchReceiptIrn && <BranchReceipt irn={branchReceiptIrn} onClose={()=>setBranchReceiptIrn(null)} />}
    </>
  );
}

/* ══ NEW MIS / SIS PLAN FORM ══ */
function NewPlanForm({ type, onDone }) {
  const { user }      = useAuth();
  const [investorId,  setInvestorId]  = useState('');
  const [investorInfo,setInvestorInfo]= useState(null);
  const [tenure,      setTenure]      = useState('3Y');
  const [monthly,     setMonthly]     = useState('');
  const [payMode,     setPayMode]     = useState('Cash');
  const [invDate,     setInvDate]     = useState(new Date().toISOString().split('T')[0]);
  const [submitting,  setSubmitting]  = useState(false);

  const months   = MIS_TABLE[tenure]?.months || 36;
  const total    = parseFloat(monthly||0) * months;
  const maturity = calcMaturity(parseFloat(monthly||0), tenure, months);
  const roi      = ROI[tenure];

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
    if (!investorId || !monthly || parseFloat(monthly)<=0) {
      toast.error('Enter Investor ID and Monthly Amount'); return;
    }
    setSubmitting(true);
    try {
      await investmentService.create({
        investor_id:    investorId.trim(),
        plan_tenure:    tenure,
        monthly_amount: parseFloat(monthly),
        payment_mode:   payMode,
        investment_date:invDate,
        plan_type:      type,
      });
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

        <div className="reg-form-row">
          <Field label={`Monthly Amount (\u20b9) *`}>
            <Input type="number" value={monthly} onChange={e=>setMonthly(e.target.value)} placeholder="e.g. 1000" min="100" />
          </Field>
          <Field label="Payment Mode">
            <Select value={payMode} onChange={e=>setPayMode(e.target.value)}>
              {['Cash','Cheque','DD','UPI','NEFT'].map(m=><option key={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
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
          ['Plan Tenure',       `${MIS_TABLE[tenure]?.label} (${months} months)`],
          ['Total Installments', months],
          ['Monthly Amount',    <span style={{color:'var(--accent-light)',fontWeight:700}}>{fmt(parseFloat(monthly)||0)}</span>],
          ['Total Investment',  fmt(total)],
          ['Maturity Amount',   <span style={{color:'#a5d6a7',fontWeight:800,fontSize:'1.1rem'}}>{fmt(maturity)}</span>],
          ['ROI',               <span style={{color:'var(--accent-light)',fontWeight:700}}>{roi.label}</span>],
          ['First Due Date',    (() => { const d=new Date(invDate); d.setMonth(d.getMonth()+1); return d.toISOString().split('T')[0]; })()],
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
                {/* Investment Status: 1 of 36 */}
                <span style={{fontFamily:'monospace',fontWeight:700,fontSize:'0.85rem',background:'var(--bg-table-head)',padding:'4px 12px',borderRadius:6}}>
                  {plan.status_label}
                </span>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'4px 16px',fontSize:'0.82rem',marginBottom:12}}>
                <div><span style={{color:'var(--text-muted)'}}>Monthly: </span><strong>{fmt(plan.monthly_amount)}</strong></div>
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
  const [data,    setData]    = useState({ items:[] });
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);

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
      await investmentService.approve(plan.id, action);
      if (action === 'approve') {
        toast.success(`✅ Investment approved! Investment ID: ${plan.irn}`, { duration: 6000 });
        setTimeout(() => toast(`Investment ID: ${plan.irn}`, {icon:'🎉', duration:8000}), 500);
      } else {
        toast.success(`❌ Investment deleted: ${plan.irn}`);
      }
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally { setActing(null); }
  };

  return (
    <Panel title="Approve Investment" subtitle="Click Approve to generate Investment ID and display in Toaster">
      {loading ? <Loading /> : (
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>IRN</th><th>Investor ID</th><th>Plan</th><th>Monthly</th><th>Total</th><th>Maturity</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(data.items||[]).map((p,i) => (
              <tr key={p.id}>
                <td>{i+1}</td>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--success)'}}>{p.irn}</code></td>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--primary)'}}>{p.investor_id}</code></td>
                <td><strong>{p.plan_name}</strong></td>
                <td><strong style={{color:'var(--primary)'}}>{fmt(p.monthly_amount)}</strong></td>
                <td>{fmt(p.total_investment_amount)}</td>
                <td><strong style={{color:'var(--success)'}}>{fmt(p.total_maturity_amount)}</strong></td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    {/* Approve → Generate Investment ID → Display in Toaster */}
                    <button className="btn btn-success btn-sm"
                      disabled={acting===p.id}
                      onClick={()=>act(p,'approve')}>
                      {acting===p.id?'...':'✓ Approve'}
                    </button>
                    <button className="btn btn-danger btn-sm"
                      disabled={acting===p.id}
                      onClick={()=>act(p,'reject')}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!(data.items||[]).length && (
              <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                No pending investments. Create a plan first.
              </td></tr>
            )}
          </tbody>
        </table>
      )}
    </Panel>
  );
}