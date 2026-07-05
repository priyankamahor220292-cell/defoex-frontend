import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Loading from '../../components/Loading/Loading';
import Modal from '../../components/Modal/Modal';
import RegistrationForm from './RegistrationForm';
import InvestorCredentialsModal from '../../components/InvestorCredentialsModal/InvestorCredentialsModal';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './MembersPage.css';

export default function MembersPage() {
  const [view, setView] = useState('list'); // 'list' | 'create' | 'approved'
  return (
    <div className="page-enter">
      <div className="page-header">
        <div><h1>Investor Management</h1><p className="text-muted">Manage investor registrations and approvals</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className={`btn ${view==='list'    ?'btn-primary':'btn-outline'}`} onClick={()=>setView('list')}>List Investors</button>
          <button className={`btn ${view==='create'  ?'btn-primary':'btn-outline'}`} onClick={()=>setView('create')}>+ New Registration</button>
          <button className={`btn ${view==='approved'?'btn-primary':'btn-outline'}`} onClick={()=>setView('approved')}>Approved Investor</button>
        </div>
      </div>
      {view === 'list'     && <ListInvestors onView={() => setView('list')} />}
      {view === 'create'   && <NewRegistration onDone={() => setView('approved')} onCancel={() => setView('list')} />}
      {view === 'approved' && <ApprovedInvestors />}
    </div>
  );
}

/* ══ LIST INVESTORS ══ */
function ListInvestors() {
  const [data,    setData]    = useState({ items:[], total:0, pages:1 });
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [dateFrom,setDateFrom]= useState('');
  const [dateTo,  setDateTo]  = useState('');
  const [page,    setPage]    = useState(1);
  const [detail,  setDetail]  = useState(null);
  const { user }              = useAuth();
  const isAdmin               = user?.role === 'superadmin';

  const load = useCallback((pg=1) => {
    setLoading(true);
    api.get('/api/registration/list', { params:{ page:pg, date_from:dateFrom, date_to:dateTo } })
      .then(r => setData(r.data.data || {}))
      .catch(() => toast.error('Failed to load investors'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => { load(1); }, [load]);

  // Search by Investor ID
  const searchResult = search
    ? (data.items||[]).filter(m =>
        m.investor_id?.toLowerCase().includes(search.toLowerCase()) ||
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.mobile?.includes(search))
    : (data.items||[]);

  const blacklist = async (m) => {
    if (!isAdmin) return toast.error('Only Admin can blacklist');
    if (!window.confirm(`Blacklist ${m.full_name}?`)) return;
    try {
      await api.post(`/api/registration/${m.id}/blacklist`);
      toast.success(`${m.full_name} blacklisted`);
      load(page);
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <>
      <Panel title="List of Investors" subtitle="Filtered by date of joining">
        {/* Search box — Find by Investor ID */}
        <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
          <input style={{flex:'1 1 200px',padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.85rem'}}
            placeholder="🔍 Search by Investor ID / Name / Mobile"
            value={search} onChange={e=>setSearch(e.target.value)} />
          <input type="date" style={{padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.82rem'}}
            value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          <span style={{alignSelf:'center',color:'var(--text-muted)',fontSize:'0.82rem'}}>to</span>
          <input type="date" style={{padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.82rem'}}
            value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          <button className="btn btn-primary" onClick={()=>load(1)}>Search</button>
          {search && <button className="btn btn-outline" onClick={()=>setSearch('')}>✕</button>}
        </div>

        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Sr. No</th><th>Investor ID</th><th>Investor Name</th>
                <th>Father Name</th><th>Mobile</th><th>Date of Joining</th>
                <th>Adviser Name</th><th>Adviser ID</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {searchResult.map((m,i) => (
                <tr key={m.id}>
                  <td>{i+1}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.78rem',background:'var(--primary-glow)',color:'var(--primary)',padding:'2px 7px',borderRadius:4}}>{m.investor_id}</code></td>
                  <td><strong>{m.full_name}</strong></td>
                  <td>{m.father_spouse_name||'—'}</td>
                  <td>{m.mobile}</td>
                  <td style={{fontSize:'0.78rem'}}>{m.date_of_joining}</td>
                  <td style={{fontSize:'0.82rem'}}>{m.adviser_name||'—'}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem'}}>{m.adviser_code}</code></td>
                  <td>
                    <span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,
                      background:m.status==='Active'?'var(--success-bg)':m.is_blacklisted?'var(--danger-bg)':'var(--warning-bg)',
                      color:     m.status==='Active'?'var(--success)':  m.is_blacklisted?'var(--danger)':    'var(--warning)'}}>
                      {m.is_blacklisted?'Blacklisted':m.status}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn btn-outline btn-sm" onClick={()=>setDetail(m)}>View</button>
                      {isAdmin && !m.is_blacklisted && (
                        <button className="btn btn-danger btn-sm" onClick={()=>blacklist(m)}>Blacklist</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {searchResult.length===0 && (
                <tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                  {search ? `No results for "${search}"` : 'No investors found'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </Panel>

      {/* More Details Modal → All Details + List All Plan */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title="Investor Details" size="lg">
        {detail && <InvestorDetail investor={detail} onClose={()=>setDetail(null)} />}
      </Modal>
    </>
  );
}

/* ══ INVESTOR DETAIL MODAL ══ */
function InvestorDetail({ investor: m, onClose }) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    api.get('/api/investment-plans/list', { params:{ investor_id: m.investor_id } })
      .then(r => setPlans(r.data.data?.items || []))
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, [m.investor_id]);

  const fmt = n => '\u20b9' + (n||0).toLocaleString('en-IN');

  return (
    <div>
      {/* 1. All Details of Investor */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px 16px',marginBottom:20}}>
        {[
          ['Investor ID',    m.investor_id], ['Full Name',      m.full_name],
          ['Father Name',    m.father_spouse_name||'—'], ['Mobile',         m.mobile],
          ['Email',          m.email||'—'], ['Date of Birth',  m.date_of_birth||'—'],
          ['Date of Joining',m.date_of_joining], ['City',          m.corr_city||'—'],
          ['State',          m.corr_state||'—'], ['Aadhar No.',    m.aadhar_number ? `XXXX-${m.aadhar_number.slice(-4)}` : '—'],
          ['PAN No.',        m.pan_number||'—'], ['Adviser ID',    m.adviser_code],
          ['Nominee Name',   m.nominee_name||'—'], ['Relation',    m.nominee_relationship||'—'],
          ['Bank',           m.bank_name||'—'], ['Account No.',   m.account_number||'—'],
          ['Member Type',    m.member_type||'Investor'], ['Member Fees', fmt(m.member_fees||650)],
          ['Payment Mode',   m.payment_mode||'—'], ['Status',       m.status||m.approval_status],
        ].map(([k,v]) => (
          <div key={k} style={{padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{k}</div>
            <div style={{fontSize:'0.82rem',fontWeight:600}}>{v}</div>
          </div>
        ))}
      </div>

      {/* 2. List All Plan */}
      <div style={{fontWeight:700,marginBottom:10,borderTop:'1px solid var(--border)',paddingTop:14}}>
        Investment Plans
      </div>
      {loadingPlans ? <Loading /> : plans.length === 0 ? (
        <div style={{textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:'0.85rem'}}>No plans yet</div>
      ) : (
        <table className="data-table">
          <thead><tr><th>IRN</th><th>Plan</th><th>Monthly</th><th>Total</th><th>Maturity</th><th>ROI</th><th>Status</th></tr></thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id}>
                <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--success)'}}>{p.irn}</code></td>
                <td><strong>{p.plan_name}</strong></td>
                <td><strong style={{color:'var(--primary)'}}>{fmt(p.monthly_amount)}</strong></td>
                <td>{fmt(p.total_investment_amount)}</td>
                <td><strong style={{color:'var(--success)'}}>{fmt(p.total_maturity_amount)}</strong></td>
                <td>{p.roi_display}</td>
                <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 8px',borderRadius:10,
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
function NewRegistration({ onDone, onCancel }) {
  return (
    <Panel title="New Investor Registration">
      <RegistrationForm onSuccess={onDone} onCancel={onCancel} />
    </Panel>
  );
}

/* ══ APPROVED INVESTORS ══ */
function ApprovedInvestors() {
  const [pending,  setPending]  = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [credModal,setCredModal]= useState(null);
  const { user }               = useAuth();

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/api/registration/pending'),
      api.get('/api/registration/list'),
    ]).then(([p,a]) => {
      if(p.status==='fulfilled') setPending(p.value.data.data?.items||[]);
      if(a.status==='fulfilled') setApproved(a.value.data.data?.items||[]);
    }).finally(()=>setLoading(false));
  }, []);

  useEffect(()=>{load();},[load]);

  // Flowchart: Click Approve → Generate Username & Password → Display in Toaster
  const approve = async (member, action) => {
    try {
      const { data } = await api.post(`/api/registration/approve/${member.id}`, { action });
      if (action === 'approve') {
        toast.success(`Approved: ${member.full_name}`);
        const creds = data?.data?.credentials;
        if (creds?.username) {
          setCredModal({
            ...creds,
            full_name: creds.full_name || member.full_name,
            investor_id: creds.investor_id || member.investor_id,
          });
        }
      } else {
        toast.success(`Rejected: ${member.full_name}`);
      }
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Action failed');
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      {/* Pending Approval */}
      {pending.length > 0 && (
        <Panel title={`Pending Approval (${pending.length})`} className="mb-3"
          subtitle="Click Approve to generate Username & Password (DEFIN202601 format)">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Investor ID</th><th>Full Name</th><th>Mobile</th><th>Adviser</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {pending.map((m,i) => (
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
                      <button className="btn btn-danger btn-sm"  onClick={()=>approve(m,'reject')}>✕ Reject</button>
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
            {approved.map((m,i) => (
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
            {approved.length===0&&(
              <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>No approved investors yet</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      <InvestorCredentialsModal creds={credModal} onClose={() => setCredModal(null)} />
    </>
  );
}