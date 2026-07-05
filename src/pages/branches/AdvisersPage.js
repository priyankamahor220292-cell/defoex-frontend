import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Modal from '../../components/Modal/Modal';
import Loading from '../../components/Loading/Loading';
import AdviserRegistrationForm from './AdviserRegistrationForm';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatLocalDate } from '../../utils/dateTime';
import './AdvisersPage.css';

export default function AdvisersPage() {
  const { user }   = useAuth();
  const isAdmin    = user?.role === 'superadmin';
  const [view,     setView]     = useState('list');    // 'list' | 'create' | 'approved'
  const [advisers, setAdvisers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [detail,   setDetail]   = useState(null);
  const [credModal,setCredModal]= useState(null);  // {username, password}

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([api.get('/api/advisers/'), api.get('/api/branches/')])
      .then(([a,b]) => {
        if (a.status==='fulfilled') setAdvisers(a.value.data.data || []);
        if (b.status==='fulfilled') setBranches(b.value.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Flowchart: Click Approve → Generate Username & Password → Display in Toaster
  const approveAdviser = async (adviser) => {
    try {
      const { data } = await api.post(`/api/advisers/${adviser.id}/approve`, { action: 'approve' });
      const creds = data.data?.credentials;
      toast.success('Adviser approved!');
      if (creds) {
        setTimeout(() => {
          toast((t) => (
            <div>
              <div style={{fontWeight:700,color:'#00c853',marginBottom:6}}>🎉 Congratulations Adviser Created!</div>
              <div style={{fontFamily:'monospace',fontSize:'0.85rem',lineHeight:2}}>
                <div>Username: <strong>{creds.username}</strong></div>
                <div>Password: <strong>{creds.password}</strong></div>
              </div>
              <div style={{fontSize:'0.72rem',color:'#999',marginTop:4}}>10-digit hexadecimal password</div>
            </div>
          ), { duration: 15000, style:{minWidth:260} });
        }, 400);
        setCredModal(creds);
      }
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  // Flowchart: Admin can blacklist adviser
  const blacklistAdviser = async (adviser) => {
    if (!window.confirm(`Blacklist ${adviser.full_name}? They will not be able to create investors.`)) return;
    try {
      await api.post(`/api/advisers/${adviser.id}/blacklist`);
      toast.success(`${adviser.full_name} blacklisted`);
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const deleteAdviser = async (adviser) => {
    if (!window.confirm(`Delete ${adviser.full_name}?`)) return;
    try {
      await api.put(`/api/advisers/${adviser.id}`, { is_active: false });
      toast.success('Adviser deleted');
      load();
    } catch(e) { toast.error('Failed'); }
  };

  // Flowchart: Status logic
  const getStatus = (a) => {
    if (a.is_blacklisted) return 'blacklist';
    if (!a.is_active)     return 'Not Active';
    return a.investor_count > 0 ? 'Active' : 'Not Active';
  };

  // Filter by search
  const filtered = advisers.filter(a =>
    !search ||
    a.adviser_code?.toLowerCase().includes(search.toLowerCase()) ||
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.mobile?.includes(search)
  );

  // Pending approval = not yet active (no login user)
  const pending  = filtered.filter(a => !a.is_active && !a.is_blacklisted);
  const approved = filtered.filter(a =>  a.is_active && !a.is_blacklisted);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Advisers</h1>
          <p className="text-muted">Manage adviser registrations, approvals and status</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className={`btn ${view==='list'    ?'btn-primary':'btn-outline'}`} onClick={() => setView('list')}>List Adviser</button>
          <button className={`btn ${view==='create'  ?'btn-primary':'btn-outline'}`} onClick={() => setView('create')}>+ New Adviser Registration</button>
          <button className={`btn ${view==='approved'?'btn-primary':'btn-outline'}`} onClick={() => setView('approved')}>
            Approved Adviser
            {pending.length > 0 && <span style={{marginLeft:6,background:'#ff5252',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:'0.7rem',fontWeight:700}}>{pending.length}</span>}
          </button>
        </div>
      </div>

      {/* ══ LIST ADVISER ══ */}
      {view === 'list' && (
        <Panel title="All Advisers">
          {/* Search Box — Find by Adviser ID */}
          <div style={{display:'flex',gap:10,marginBottom:16,maxWidth:400}}>
            <input
              className="form-input"
              style={{flex:1,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.85rem'}}
              placeholder="🔍 Search by Adviser ID, Name, Mobile"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="btn btn-outline btn-sm" onClick={() => setSearch('')}>✕</button>}
          </div>

          {loading ? <Loading /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sr. No</th>
                  <th>Adviser ID</th>
                  <th>Rank Name & Number</th>
                  <th>Adviser Name</th>
                  <th>Father Name</th>
                  <th>Mobile Number</th>
                  <th>Date of Joining</th>
                  <th>Promoter Adviser Name</th>
                  <th>Promoter Adviser ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const status = getStatus(a);
                  return (
                    <tr key={a.id}>
                      <td>{i+1}</td>
                      <td><code style={{fontFamily:'monospace',fontSize:'0.78rem',background:'var(--primary-glow)',color:'var(--primary)',padding:'2px 7px',borderRadius:4}}>{a.adviser_code}</code></td>
                      <td><span style={{fontWeight:700}}>{a.rank_name}</span> <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>(Rank {a.rank_id})</span></td>
                      <td><strong>{a.full_name}</strong></td>
                      <td>{a.father_name || '—'}</td>
                      <td>{a.mobile}</td>
                      <td style={{fontSize:'0.78rem'}}>{formatLocalDate(a.created_at)}</td>
                      <td style={{fontSize:'0.78rem'}}>{a.parent_adviser_name || '—'}</td>
                      <td style={{fontSize:'0.78rem',fontFamily:'monospace'}}>{a.parent_adviser_code || '—'}</td>
                      <td>
                        <span style={{
                          fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,
                          background: status==='Active' ? 'var(--success-bg)' : status==='blacklist' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                          color:      status==='Active' ? 'var(--success)'    : status==='blacklist' ? 'var(--danger)'    : 'var(--warning)',
                        }}>
                          {status==='blacklist' ? 'Blacklisted' : status}
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:4,flexWrap:'nowrap'}}>
                          <button className="btn btn-outline btn-sm" onClick={() => setDetail(a)}>View</button>
                          {isAdmin && status !== 'blacklist' && (
                            <button className="btn btn-danger btn-sm" onClick={() => blacklistAdviser(a)}>Blacklist</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>No advisers found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {/* ══ NEW ADVISER REGISTRATION ══ */}
      {view === 'create' && (
        <AdviserRegistrationForm
          branches={branches}
          defaultBranchId={user?.branch_id || (branches.length === 1 ? branches[0].id : '')}
          onCancel={() => setView('list')}
          onSuccess={() => { load(); setView('approved'); }}
        />
      )}

      {/* ══ APPROVED ADVISER TAB ══ */}
      {view === 'approved' && (
        <>
          {/* Pending Approval */}
          {pending.length > 0 && (
            <Panel title={`Pending Approval (${pending.length})`} className="mb-3"
              subtitle="Click Approve to generate Username & Password">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Adviser ID</th><th>Name</th><th>Rank</th><th>Mobile</th><th>Promoter</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pending.map((a,i) => (
                    <tr key={a.id}>
                      <td>{i+1}</td>
                      <td><code style={{fontFamily:'monospace',fontSize:'0.78rem'}}>{a.adviser_code}</code></td>
                      <td><strong>{a.full_name}</strong></td>
                      <td>{a.rank_name}</td>
                      <td>{a.mobile}</td>
                      <td style={{fontSize:'0.78rem',fontFamily:'monospace'}}>{a.parent_adviser_code||'—'}</td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          {/* Flowchart: Click Approve → Generate Username & Password → Display in Toaster */}
                          <button className="btn btn-success btn-sm" onClick={() => approveAdviser(a)}>
                            ✓ Approve
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteAdviser(a)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          {/* Approved Advisers */}
          <Panel title={`Approved Advisers (${approved.length})`}>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Adviser ID</th><th>Name</th><th>Rank</th><th>Mobile</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {approved.map((a,i) => (
                  <tr key={a.id}>
                    <td>{i+1}</td>
                    <td><code style={{fontFamily:'monospace',fontSize:'0.78rem',background:'var(--primary-glow)',color:'var(--primary)',padding:'2px 7px',borderRadius:4}}>{a.adviser_code}</code></td>
                    <td><strong>{a.full_name}</strong></td>
                    <td><span style={{background:'var(--bg-table-head)',padding:'2px 8px',borderRadius:4,fontSize:'0.75rem',fontWeight:700}}>{a.rank_name}</span></td>
                    <td>{a.mobile}</td>
                    <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,background:'var(--success-bg)',color:'var(--success)'}}>Active</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-outline btn-sm" onClick={() => setDetail(a)}>View</button>
                        {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => blacklistAdviser(a)}>Blacklist</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {approved.length === 0 && (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>No approved advisers yet</td></tr>
                )}
              </tbody>
            </table>
          </Panel>
        </>
      )}

      {/* ══ DETAIL MODAL — More Details (Link) ══ */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Adviser Details" size="md">
        {detail && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',fontSize:'0.85rem',marginBottom:16}}>
              {[
                ['Adviser ID',     detail.adviser_code],
                ['Full Name',      detail.full_name],
                ['Father Name',    detail.father_name || '—'],
                ['Mobile',         detail.mobile],
                ['Email',          detail.email || '—'],
                ['Rank',           `${detail.rank_name} (Rank ${detail.rank_id})`],
                ['Date Joined',    formatLocalDate(detail.created_at)],
                ['Promoter ID',    detail.parent_adviser_code || '—'],
                ['Promoter Name',  detail.parent_adviser_name || '—'],
                ['Branch',         detail.branch_id ? `Branch #${detail.branch_id}` : '—'],
                ['Status',         detail.is_active ? 'Active' : detail.is_blacklisted ? 'Blacklisted' : 'Not Active'],
              ].map(([k,v]) => (
                <div key={k} style={{padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>{k}</span>
                  <div style={{fontWeight:600}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',padding:'12px',fontSize:'0.82rem'}}>
              <div style={{fontWeight:700,marginBottom:8}}>Status Logic</div>
              <div style={{color:'var(--text-muted)',lineHeight:1.8}}>
                • <strong>Active</strong> — Has at least 1 investor<br/>
                • <strong>Not Active</strong> — Has no investors yet<br/>
                • <strong>Blacklist</strong> — Admin only · Cannot create investors
              </div>
            </div>
            <div style={{marginTop:12,display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ CREDENTIALS MODAL ══ */}
      <Modal open={!!credModal} onClose={() => setCredModal(null)} title="🎉 Adviser Account Created!" size="sm">
        {credModal && (
          <div style={{textAlign:'center',padding:'8px 0'}}>
            <div style={{fontSize:'2.5rem',marginBottom:12}}>🎊</div>
            <div style={{fontWeight:700,fontSize:'1rem',marginBottom:16,color:'var(--success)'}}>
              Congratulations Adviser Created!
            </div>
            <div style={{background:'var(--bg-input)',borderRadius:'var(--border-radius-md)',padding:'16px',fontFamily:'monospace',fontSize:'0.9rem',lineHeight:2.2,marginBottom:16}}>
              <div>Username: <strong style={{color:'var(--primary)'}}>{credModal.username}</strong></div>
              <div>Password: <strong style={{color:'var(--primary)'}}>{credModal.password}</strong></div>
            </div>
            <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:16}}>
              10-digit hexadecimal password · Share with adviser
            </div>
            <button className="btn btn-primary" onClick={() => {
              navigator.clipboard.writeText(`Username: ${credModal.username}\nPassword: ${credModal.password}`);
              toast.success('Credentials copied!');
            }}>Copy Credentials</button>
            {' '}
            <button className="btn btn-outline" onClick={() => setCredModal(null)}>Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}