import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Panel from '../../components/Panel/Panel';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Modal from '../../components/Modal/Modal';
import Alert from '../../components/Alert/Alert';
import InvestorCredentialsModal, { showInvestorCredentialToasts } from '../../components/InvestorCredentialsModal/InvestorCredentialsModal';
import api from '../../services/api';
import { memberService } from '../../services/memberService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './MembersPage.css';

const STEPS = ['Adviser Verify', 'Personal Info', 'Address & KYC', 'Nominee & Bank', 'Confirm'];
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const INVESTOR_FEE = 10;

export default function MembersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdviser = user?.role === 'advisor' || user?.role === 'adviser';
  const [view, setView] = useState('list');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (location.pathname.endsWith('/new')) setView('create');
  }, [location.pathname]);

  const refreshPending = useCallback(() => {
    if (isAdviser) return;
    api.get('/api/registration/pending').then(r => {
      setPendingCount(r.data.data?.items?.length || 0);
    }).catch(() => {});
  }, [isAdviser]);

  useEffect(() => { refreshPending(); }, [refreshPending]);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>{isAdviser ? 'My Investors' : 'Investor Management'}</h1>
          <p className="text-muted">
            {isAdviser
              ? 'Investors registered under your adviser code only'
              : 'Manage investor registrations and approvals'}
          </p>
        </div>
        <div className="page-actions">
          <button className={`btn ${view==='list'?'btn-primary':'btn-outline'}`} onClick={()=>setView('list')}>
            {isAdviser ? 'My Investors' : 'List Investors'}
          </button>
          {!isAdviser && (
            <>
              <button className={`btn ${view==='create'?'btn-primary':'btn-outline'}`} onClick={()=>setView('create')}>+ New Registration</button>
              <button className={`btn ${view==='approved'?'btn-primary':'btn-outline'}`} onClick={()=>setView('approved')}>
                Approved Investor
                {pendingCount > 0 && <span className="badge-count">{pendingCount}</span>}
              </button>
            </>
          )}
        </div>
      </div>

      {view==='list'     && <ListInvestors />}
      {view==='create'   && <NewRegistration onDone={()=>{ setView('approved'); refreshPending(); }} />}
      {view==='approved' && <ApprovedInvestors onRefresh={refreshPending} />}
    </div>
  );
}

/* ══ LIST INVESTORS ══ */
function ListInvestors() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'superadmin';
  const [data,    setData]    = useState({ items:[], total:0 });
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [dateFrom,setDateFrom]= useState('');
  const [dateTo,  setDateTo]  = useState('');
  const [page,    setPage]    = useState(1);
  const [detail,  setDetail]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/registration/list', { params:{ page, date_from:dateFrom, date_to:dateTo } })
      .then(r => setData(r.data.data||{}))
      .catch(()=>toast.error('Failed to load investors'))
      .finally(()=>setLoading(false));
  }, [page, dateFrom, dateTo]);

  useEffect(()=>{ load(); },[load]);

  // Search by Investor ID — local filter on loaded data
  const filtered = search
    ? (data.items||[]).filter(m =>
        m.investor_id?.toLowerCase().includes(search.toLowerCase()) ||
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.mobile?.includes(search))
    : (data.items||[]);

  const blacklist = async (m) => {
    if (!isAdmin) { toast.error('Only Admin can blacklist investors'); return; }
    if (!window.confirm(`Blacklist ${m.full_name}?`)) return;
    try {
      await api.post(`/api/registration/${m.id}/blacklist`);
      toast.success(`${m.full_name} blacklisted`);
      load();
    } catch(e) { toast.error(e.response?.data?.message||'Failed'); }
  };

  return (
    <>
      <Panel title="List of Investors">
        {/* Search Box — find by Investor ID */}
        <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
          <input
            style={{flex:'1 1 220px',padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.85rem'}}
            placeholder="🔍 Search by Investor ID / Name / Mobile"
            value={search} onChange={e=>setSearch(e.target.value)}
          />
          <input type="date" style={{padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.82rem'}}
            value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          <span style={{alignSelf:'center',color:'var(--text-muted)',fontSize:'0.82rem'}}>to</span>
          <input type="date" style={{padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.82rem'}}
            value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={()=>load()}>Search</button>
          {search && <button className="btn btn-outline btn-sm" onClick={()=>setSearch('')}>✕</button>}
        </div>

        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Sr. No</th><th>Investor ID</th><th>Investor Name</th>
                <th>Father Name</th><th>Mobile Number</th><th>Date of Joining</th>
                <th>Adviser Name</th><th>Adviser ID</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m,i) => (
                <tr key={m.id}>
                  <td>{i+1}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.78rem',background:'var(--primary-glow)',color:'var(--primary)',padding:'2px 7px',borderRadius:4}}>{m.investor_id}</code></td>
                  <td><strong>{m.full_name}</strong></td>
                  <td>{m.father_spouse_name||'—'}</td>
                  <td>{m.mobile}</td>
                  <td style={{fontSize:'0.78rem'}}>{m.date_of_joining}</td>
                  <td style={{fontSize:'0.82rem'}}>{m.adviser_name||'—'}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem'}}>{m.adviser_code||'—'}</code></td>
                  <td>
                    {/* Status: Active / Not Active / Blacklist */}
                    <span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,
                      background:m.is_blacklisted?'var(--danger-bg)':m.status==='Active'?'var(--success-bg)':'var(--warning-bg)',
                      color:     m.is_blacklisted?'var(--danger)'   :m.status==='Active'?'var(--success)'   :'var(--warning)'}}>
                      {m.is_blacklisted?'Blacklisted':m.status||'Not Active'}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      {/* More Details (Link) */}
                      <button className="btn btn-outline btn-sm" onClick={()=>setDetail(m)}>View</button>
                      {isAdmin && !m.is_blacklisted && (
                        <button className="btn btn-danger btn-sm" onClick={()=>blacklist(m)}>Blacklist</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && (
                <tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                  {search?`No results for "${search}"` : 'No investors found'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Status legend */}
        <div style={{marginTop:12,padding:'8px 12px',background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',fontSize:'0.75rem',color:'var(--text-muted)'}}>
          <strong>Status:</strong>&nbsp;
          <span style={{color:'var(--success)'}}>Active</span> = has at least one plan &nbsp;|&nbsp;
          <span style={{color:'var(--warning)'}}>Not Active</span> = no plan yet &nbsp;|&nbsp;
          <span style={{color:'var(--danger)'}}>Blacklist</span> = Admin only · adviser can't create investors if blacklisted
        </div>
      </Panel>

      {/* More Details Modal → 1. All Details of Investor  2. List All Plan */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title="Investor Details" size="lg">
        {detail && <InvestorDetailModal investor={detail} onClose={()=>setDetail(null)} />}
      </Modal>
    </>
  );
}

/* ══ INVESTOR DETAIL MODAL ══ */
function InvestorDetailModal({ investor: m, onClose }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const fmt = n => '\u20b9'+(n||0).toLocaleString('en-IN');

  useEffect(()=>{
    api.get('/api/investment-plans/list', { params:{ investor_id: m.investor_id } })
      .then(r => setPlans(r.data.data?.items||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[m.investor_id]);

  return (
    <div>
      {/* 1. All Details of Investor */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px 16px',marginBottom:20}}>
        {[
          ['Investor ID',    m.investor_id],  ['Full Name',       m.full_name],
          ['Father Name',    m.father_spouse_name||'—'], ['Mobile', m.mobile],
          ['Email',          m.email||'—'],   ['Date of Birth',   m.date_of_birth||'—'],
          ['Date of Joining',m.date_of_joining], ['City',          m.corr_city||'—'],
          ['Aadhar',         m.aadhar_number?`XXXX-${m.aadhar_number.slice(-4)}`:'—'],
          ['PAN',            m.pan_number||'—'], ['Adviser ID',    m.adviser_code||'—'],
          ['Nominee',        m.nominee_name||'—'], ['Relation',    m.nominee_relationship||'—'],
          ['Bank',           m.bank_name||'—'], ['A/C No.',       m.account_number||'—'],
          ['IFSC',           m.ifsc_code||'—'], ['Member Type',   m.member_type||'Investor'],
          ['Member Fees',    fmt(m.member_fees||10)], ['Status',   m.approval_status],
        ].map(([k,v])=>(
          <div key={k} style={{padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{k}</div>
            <div style={{fontSize:'0.82rem',fontWeight:600}}>{v}</div>
          </div>
        ))}
      </div>

      {/* 2. List All Plan */}
      <div style={{fontWeight:700,marginBottom:10,borderTop:'1px solid var(--border)',paddingTop:14}}>Investment Plans</div>
      {loading ? <Loading /> : plans.length===0 ? (
        <div style={{textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:'0.85rem'}}>No plans yet</div>
      ) : (
        <table className="data-table">
          <thead><tr><th>IRN</th><th>Plan</th><th>Monthly</th><th>Total</th><th>Return of Investment</th><th>ROI</th><th>Status</th></tr></thead>
          <tbody>
            {plans.map(p=>(
              <tr key={p.id}>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--success)'}}>{p.irn}</code></td>
                <td><strong>{p.plan_name}</strong></td>
                <td><strong style={{color:'var(--primary)'}}>{fmt(p.monthly_amount)}</strong></td>
                <td>{fmt(p.total_investment_amount)}</td>
                <td><strong style={{color:'var(--success)'}}>{fmt(p.total_maturity_amount)}</strong></td>
                <td style={{color:'var(--primary)',fontWeight:700}}>{p.roi_display}</td>
                <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,
                  background:p.approval_status==='Approved'?'var(--success-bg)':'var(--warning-bg)',
                  color:p.approval_status==='Approved'?'var(--success)':'var(--warning)'}}>{p.approval_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{marginTop:14,display:'flex',justifyContent:'flex-end'}}>
        <button className="btn btn-outline" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* ══ NEW INVESTOR REGISTRATION ══ */
function NewRegistration({ onDone }) {
  const { user }      = useAuth();
  const [step,        setStep]        = useState(0);
  const [advisers,    setAdvisers]    = useState([]);
  const [adviserCode, setAdviserCode] = useState('');
  const [adviser,     setAdviser]     = useState(null);
  const [adviserErr,  setAdviserErr]  = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [credModal,   setCredModal]   = useState(null);
  const [form, setForm] = useState({
    salutation:'', full_name:'', father_spouse_name:'', date_of_birth:'', gender:'Male',
    marital_status:'Single', nationality:'Indian', mobile:'', phone_office:'', email:'',
    corr_address:'', corr_city:'', corr_state:'', corr_pincode:'',
    same_as_corr:false, perm_address:'', perm_city:'', perm_state:'', perm_pincode:'',
    aadhar_number:'', pan_number:'', voter_id:'', driving_license:'',
    nominee_name:'', nominee_age:'', nominee_relationship:'', nominee_address:'',
    bank_name:'', account_number:'', ifsc_code:'', upi_id:'',
    occupation:'', annual_income:'',
    member_type:'Investor', member_fees:INVESTOR_FEE, promoter_fees:0, payment_mode:'Cash',
    date_of_joining: todayISO(),
  });

  useEffect(()=>{
    api.get('/api/advisers/').then(r=>setAdvisers(r.data.data||[])).catch(()=>{});
  },[]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const verifyAdviser = async () => {
    setAdviserErr('');
    if (!adviserCode.trim()) { setAdviserErr('Enter Adviser ID'); return; }
    try {
      const { data } = await memberService.checkAdviser(adviserCode.trim());
      setAdviser(data.data);
    } catch(e) {
      setAdviserErr(e.response?.data?.message||'Adviser not found or blacklisted');
    }
  };

  const handleSameAddress = (checked) => {
    set('same_as_corr', checked);
    if (checked) {
      set('perm_address', form.corr_address);
      set('perm_city',    form.corr_city);
      set('perm_state',   form.corr_state);
      set('perm_pincode', form.corr_pincode);
    }
  };

  const submit = async () => {
    if (!form.full_name||!form.mobile||!form.aadhar_number) {
      toast.error('Full Name, Mobile, Aadhar required'); return;
    }
    setSubmitting(true);
    try {
      const { data } = await memberService.register({
        ...form,
        adviser_code: adviserCode.trim(),
        member_type: 'Investor',
        member_fees: INVESTOR_FEE,
        date_of_joining: todayISO(),
      });
      const creds = data.data?.credentials;
      const investorId = data.data?.investor_id || '';
      if (creds?.username) {
        setCredModal(creds);
        showInvestorCredentialToasts(creds);
      } else {
        toast.success(`Investor created! ID: ${investorId}`);
      }
      onDone();
    } catch(e) {
      toast.error(e.response?.data?.message||'Registration failed');
    } finally { setSubmitting(false); }
  };

  return (
    <>
    <Panel title="New Investor Registration">
      {/* Step indicators */}
      <div style={{display:'flex',alignItems:'center',marginBottom:24}}>
        {STEPS.map((s,i)=>(
          <React.Fragment key={i}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',cursor:i<step?'pointer':'default'}} onClick={()=>i<step&&setStep(i)}>
              <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'0.85rem',
                background:i===step?'var(--primary)':i<step?'var(--success)':'var(--bg-table-head)',
                color:i<=step?'#fff':'var(--text-muted)',border:`2px solid ${i===step?'var(--primary)':i<step?'var(--success)':'var(--border)'}`}}>
                {i<step?'✓':i+1}
              </div>
              <div style={{fontSize:'0.65rem',marginTop:4,color:i===step?'var(--primary)':'var(--text-muted)',fontWeight:i===step?700:400,whiteSpace:'nowrap'}}>{s}</div>
            </div>
            {i<STEPS.length-1&&<div style={{flex:1,height:2,background:i<step?'var(--success)':'var(--border)',margin:'0 4px',marginBottom:16}}/>}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 0: Adviser Verify ── */}
      {step===0 && (
        <div>
          <div style={{fontWeight:700,marginBottom:6}}>Enter Adviser ID</div>
          <p style={{color:'var(--text-muted)',fontSize:'0.82rem',marginBottom:14}}>
            Every investor must be registered under an active Adviser ID.
          </p>

          {/* Note: investor create fee is ₹10 deducted from branch panel limit */}
          <Alert type="info" style={{marginBottom:14}}>
            <strong>Note:</strong> Investor create fee is ₹10, which is deducted from branch panel limit (if investor successfully created).
          </Alert>

          {advisers.length>0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:'0.78rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:6}}>Available Adviser Codes — click to select:</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {advisers.map(a=>(
                  <button key={a.adviser_code}
                    style={{padding:'4px 12px',fontSize:'0.75rem',fontFamily:'monospace',cursor:'pointer',
                      background:adviserCode===a.adviser_code?'var(--primary)':'var(--bg-input)',
                      color:adviserCode===a.adviser_code?'#fff':'var(--text-primary)',
                      border:'1px solid var(--border)',borderRadius:20}}
                    onClick={()=>{setAdviserCode(a.adviser_code);setAdviserErr('');setAdviser(null);}}>
                    {a.adviser_code} — {a.full_name} ({a.rank_name})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <input
              style={{flex:1,padding:'10px 12px',border:`1.5px solid ${adviserErr?'var(--danger)':'var(--border)'}`,borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontFamily:'monospace',fontSize:'0.9rem'}}
              placeholder="Enter Adviser Code *"
              value={adviserCode}
              onChange={e=>{setAdviserCode(e.target.value.trim());setAdviserErr('');setAdviser(null);}}
            />
            <button className="btn btn-primary" onClick={verifyAdviser}>Verify →</button>
          </div>
          {adviserErr && <div style={{color:'var(--danger)',fontSize:'0.8rem',marginBottom:8}}>{adviserErr}</div>}

          {adviser && (
            <div style={{background:'var(--success-bg)',border:'1px solid var(--success)',borderRadius:'var(--border-radius-sm)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12}}>
              <div>
                <div style={{fontWeight:700,color:'var(--success)',marginBottom:3}}>✅ Adviser Verified</div>
                <div style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>
                  <code style={{fontFamily:'monospace',fontWeight:700}}>{adviser.adviser_code}</code>
                  {' — '}{adviser.full_name} ({adviser.rank_name})
                </div>
              </div>
              <button className="btn btn-primary" onClick={()=>setStep(1)}>Next → Personal Info</button>
            </div>
          )}

          <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap'}}>
            <Field label="Member Type">
              <Input value="Investor" readOnly disabled />
            </Field>
            <Field label="Member Fees (₹)">
              <Input type="number" value={INVESTOR_FEE} readOnly disabled />
            </Field>
            <Field label="Payment Mode">
              <Select value={form.payment_mode} onChange={e=>set('payment_mode',e.target.value)}>
                {['Cash','Cheque','DD','UPI','NEFT'].map(m=><option key={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Date of Registration">
              <Input type="date" value={todayISO()} readOnly disabled />
            </Field>
          </div>
        </div>
      )}

      {/* ── STEP 1: Personal Info ── */}
      {step===1 && (
        <div>
          <div className="reg-form-row">
            <Field label="Salutation"><Select value={form.salutation} onChange={e=>set('salutation',e.target.value)}><option value="">—</option>{['Mr.','Mrs.','Ms.','Dr.'].map(s=><option key={s}>{s}</option>)}</Select></Field>
            <Field label="Full Name *"><Input value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="As per Aadhar" /></Field>
          </div>
          <div className="reg-form-row">
            <Field label="Father / Spouse Name"><Input value={form.father_spouse_name} onChange={e=>set('father_spouse_name',e.target.value)} /></Field>
            <Field label="Mobile Number *"><Input value={form.mobile} onChange={e=>set('mobile',e.target.value.replace(/\D/g,'').slice(0,10))} maxLength={10} placeholder="10-digit" /></Field>
          </div>
          <div className="reg-form-row">
            <Field label="Date of Birth"><Input type="date" value={form.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)} /></Field>
            <Field label="Gender"><Select value={form.gender} onChange={e=>set('gender',e.target.value)}>{['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}</Select></Field>
          </div>
          <div className="reg-form-row">
            <Field label="Marital Status"><Select value={form.marital_status} onChange={e=>set('marital_status',e.target.value)}>{['Single','Married','Divorced','Widowed'].map(s=><option key={s}>{s}</option>)}</Select></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e=>set('email',e.target.value)} /></Field>
          </div>
        </div>
      )}

      {/* ── STEP 2: Address & KYC ── */}
      {step===2 && (
        <div>
          <div style={{fontWeight:700,marginBottom:10}}>Correspondence Address</div>
          <div className="reg-form-row">
            <Field label="Address"><Input value={form.corr_address} onChange={e=>set('corr_address',e.target.value)} /></Field>
            <Field label="City"><Input value={form.corr_city} onChange={e=>set('corr_city',e.target.value)} /></Field>
          </div>
          <div className="reg-form-row">
            <Field label="State"><Input value={form.corr_state} onChange={e=>set('corr_state',e.target.value)} /></Field>
            <Field label="Pincode"><Input value={form.corr_pincode} onChange={e=>set('corr_pincode',e.target.value)} maxLength={6} /></Field>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'0.85rem',marginBottom:12}}>
            <input type="checkbox" checked={form.same_as_corr} onChange={e=>handleSameAddress(e.target.checked)} />
            Same as Correspondence Address
          </label>
          <div style={{fontWeight:700,marginBottom:10}}>KYC Documents</div>
          <div className="reg-form-row">
            <Field label="Aadhar Number *"><Input value={form.aadhar_number} onChange={e=>set('aadhar_number',e.target.value.replace(/\D/g,'').slice(0,12))} maxLength={12} placeholder="12-digit" /></Field>
            <Field label="PAN Number"><Input value={form.pan_number} onChange={e=>set('pan_number',e.target.value.toUpperCase())} /></Field>
          </div>
          <div className="reg-form-row">
            <Field label="Voter ID"><Input value={form.voter_id} onChange={e=>set('voter_id',e.target.value)} /></Field>
            <Field label="Driving License"><Input value={form.driving_license} onChange={e=>set('driving_license',e.target.value)} /></Field>
          </div>
        </div>
      )}

      {/* ── STEP 3: Nominee & Bank ── */}
      {step===3 && (
        <div>
          <div style={{fontWeight:700,marginBottom:10}}>Nominee Details</div>
          <div className="reg-form-row">
            <Field label="Nominee Name"><Input value={form.nominee_name} onChange={e=>set('nominee_name',e.target.value)} /></Field>
            <Field label="Relationship"><Select value={form.nominee_relationship} onChange={e=>set('nominee_relationship',e.target.value)}><option value="">—</option>{['Son','Daughter','Spouse','Father','Mother','Brother','Sister','Other'].map(r=><option key={r}>{r}</option>)}</Select></Field>
          </div>
          <Field label="Nominee Age" style={{maxWidth:200}}><Input type="number" value={form.nominee_age} onChange={e=>set('nominee_age',e.target.value)} /></Field>
          <div style={{fontWeight:700,margin:'14px 0 10px'}}>Bank Details</div>
          <div className="reg-form-row">
            <Field label="Bank Name"><Input value={form.bank_name} onChange={e=>set('bank_name',e.target.value)} /></Field>
            <Field label="Account Number"><Input value={form.account_number} onChange={e=>set('account_number',e.target.value)} /></Field>
          </div>
          <div className="reg-form-row">
            <Field label="IFSC Code"><Input value={form.ifsc_code} onChange={e=>set('ifsc_code',e.target.value.toUpperCase())} /></Field>
            <Field label="UPI ID"><Input value={form.upi_id} onChange={e=>set('upi_id',e.target.value)} /></Field>
          </div>
          <div className="reg-form-row">
            <Field label="Occupation"><Input value={form.occupation} onChange={e=>set('occupation',e.target.value)} /></Field>
            <Field label="Annual Income"><Input type="number" value={form.annual_income} onChange={e=>set('annual_income',e.target.value)} /></Field>
          </div>
        </div>
      )}

      {/* ── STEP 4: Confirm ── */}
      {step===4 && (
        <div>
          <Alert type="info" style={{marginBottom:14}}>
            Review all details below. After submission → go to <strong>Approved Investor</strong> tab.
          </Alert>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',fontSize:'0.85rem'}}>
            {[
              ['Adviser Code',   adviserCode],
              ['Full Name',      form.full_name],
              ['Father Name',    form.father_spouse_name||'—'],
              ['Mobile',         form.mobile],
              ['Date of Birth',  form.date_of_birth||'—'],
              ['Gender',         form.gender],
              ['Aadhar',         form.aadhar_number?`XXXX-${form.aadhar_number.slice(-4)}`:'—'],
              ['PAN',            form.pan_number||'—'],
              ['City',           form.corr_city||'—'],
              ['Nominee',        form.nominee_name||'—'],
              ['Bank',           form.bank_name||'—'],
              ['Member Fees',    `\u20b9${INVESTOR_FEE}`],
              ['Payment Mode',   form.payment_mode],
            ].map(([k,v])=>(
              <div key={k} style={{padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{color:'var(--text-muted)',fontSize:'0.72rem'}}>{k}</span>
                <div style={{fontWeight:600}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{marginTop:20,display:'flex',justifyContent:'space-between'}}>
        <div>
          {step>0 && <button className="btn btn-outline" onClick={()=>setStep(s=>s-1)}>← Back</button>}
        </div>
        <div style={{display:'flex',gap:8}}>
          {step===0 && (
            adviser
              ? <button className="btn btn-primary" onClick={()=>setStep(1)}>Next → Personal Info</button>
              : <button className="btn btn-primary" onClick={verifyAdviser} disabled={!adviserCode}>Verify & Next →</button>
          )}
          {step>0 && step<STEPS.length-1 && (
            <button className="btn btn-primary" onClick={()=>{
              if(step===1&&(!form.full_name||!form.mobile)){toast.error('Fill Name and Mobile');return;}
              if(step===2&&!form.aadhar_number){toast.error('Fill Aadhar Number');return;}
              setStep(s=>s+1);
            }}>Next →</button>
          )}
          {step===STEPS.length-1 && (
            <button className="btn btn-success btn-lg" onClick={submit} disabled={submitting}>
              {submitting?'Submitting...':'✓ Submit Registration'}
            </button>
          )}
        </div>
      </div>
    </Panel>
    <InvestorCredentialsModal creds={credModal} onClose={() => setCredModal(null)} />
  </>
  );
}

/* ══ APPROVED INVESTORS ══ */
function ApprovedInvestors({ onRefresh }) {
  const [pending,  setPending]  = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [credModal,setCredModal]= useState(null);

  const load = useCallback(()=>{
    setLoading(true);
    Promise.allSettled([
      api.get('/api/registration/pending'),
      api.get('/api/registration/list'),
    ]).then(([p,a])=>{
      if(p.status==='fulfilled') setPending(p.value.data.data?.items||[]);
      if(a.status==='fulfilled') setApproved(a.value.data.data?.items||[]);
    }).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{ load(); },[load]);

  // Click the Approve Investor → Generate Username & Password → Display in Toaster
  const approve = async (member, action) => {
    try {
      const { data } = await api.post(`/api/registration/approve/${member.id}`,{ action });
      if (action==='approve') {
        const creds = data.data?.credentials;
        if (creds?.username) {
          setCredModal(creds);
          showInvestorCredentialToasts(creds);
        } else {
          toast.success(`✅ Approved: ${member.full_name}`);
        }
      } else {
        toast.success(`Registration rejected`);
      }
      load(); onRefresh?.();
    } catch(e) {
      toast.error(e.response?.data?.message||'Action failed');
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      {/* Pending Approval */}
      {pending.length>0 && (
        <Panel title={`Pending Approval (${pending.length})`} className="mb-3"
          subtitle="Click Approve → generates DEFIN202601 username & password">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Investor ID</th><th>Full Name</th><th>Mobile</th><th>Adviser</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {pending.map((m,i)=>(
                <tr key={m.id}>
                  <td>{i+1}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.78rem'}}>{m.investor_id}</code></td>
                  <td><strong>{m.full_name}</strong></td>
                  <td>{m.mobile}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem'}}>{m.adviser_code}</code></td>
                  <td style={{fontSize:'0.78rem'}}>{m.date_of_joining}</td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-success btn-sm" onClick={()=>approve(m,'approve')}>✓ Approve</button>
                      <button className="btn btn-danger btn-sm"  onClick={()=>approve(m,'reject')}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Approved list */}
      <Panel title={`Approved Investors (${approved.length})`}>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Investor ID</th><th>Name</th><th>Mobile</th><th>Adviser</th><th>DOJ</th><th>Status</th></tr>
          </thead>
          <tbody>
            {approved.map((m,i)=>(
              <tr key={m.id||i}>
                <td>{i+1}</td>
                <td><code style={{fontFamily:'monospace',fontSize:'0.78rem',background:'var(--primary-glow)',color:'var(--primary)',padding:'2px 7px',borderRadius:4}}>{m.investor_id}</code></td>
                <td><strong>{m.full_name||m.investor_name}</strong></td>
                <td>{m.mobile}</td>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem'}}>{m.adviser_code}</code></td>
                <td style={{fontSize:'0.78rem'}}>{m.date_of_joining}</td>
                <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,
                  background:m.status==='Active'?'var(--success-bg)':'var(--warning-bg)',
                  color:m.status==='Active'?'var(--success)':'var(--warning)'}}>{m.status||'Not Active'}</span></td>
              </tr>
            ))}
            {approved.length===0 && (
              <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>No approved investors yet</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      {/* Credentials modal (approve flow for legacy pending records) */}
      <InvestorCredentialsModal creds={credModal} onClose={() => setCredModal(null)} />
    </>
  );
}