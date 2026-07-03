import React, { useEffect, useState, useCallback } from 'react';
import Panel from '../../../components/Panel/Panel';
import Loading from '../../../components/Loading/Loading';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import './AdvisorDashboard.css';

const fmt  = n => `\u20b9${(n||0).toLocaleString('en-IN')}`;
const fmtN = n => (n||0).toLocaleString('en-IN');

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState('dashboard');

  const NAV = [
    { key: 'dashboard',   icon: '📊', label: 'Dashboard'          },
    { key: 'info',        icon: '👤', label: 'Adviser Info'        },
    { key: 'self',        icon: '💼', label: 'Self Contribution'   },
    { key: 'down',        icon: '🌐', label: 'Down Contribution'   },
  ];

  return (
    <div className="adv-layout">
      {/* ── Sidebar ── */}
      <aside className="adv-sidebar">
        <div className="adv-sidebar-brand">
          <div className="adv-brand-name">DEFOEX</div>
          <div className="adv-brand-sub">ADVISER PORTAL</div>
        </div>
        <nav className="adv-nav">
          {NAV.map(n => (
            <button key={n.key}
              className={`adv-nav-item ${view === n.key ? 'active' : ''}`}
              onClick={() => setView(n.key)}>
              <span className="adv-nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="adv-sidebar-footer">
          <div className="adv-user-name">{user?.full_name}</div>
          <div className="adv-user-role">Adviser Account</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="adv-main">
        {view === 'dashboard' && <DashboardView />}
        {view === 'info'      && <AdviserInfoView />}
        {view === 'self'      && <SelfContributionView />}
        {view === 'down'      && <DownContributionView />}
      </main>
    </div>
  );
}

/* ══ DASHBOARD ══ */
function DashboardView() {
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/api/adviser-portal/dashboard'),
      api.get('/api/commissions/', { params: { page: 1 } }),
    ]).then(([dash, comms]) => {
      const d = dash.status === 'fulfilled' ? dash.value.data.data : {};
      const c = comms.status === 'fulfilled' ? comms.value.data.data?.items || [] : [];
      setData({ ...d, commissions: c });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data)   return <div className="adv-error">Could not load dashboard</div>;

  const totalComm = (data.commissions||[]).reduce((s,c) => s + parseFloat(c.commission_amount||0), 0);
  const adv = data.adviser || {};

  const STATS = [
    { label: 'My Investors',    value: fmtN(data.my_investors||0),  icon: '👤', color: 'var(--primary)'  },
    { label: 'My Investments',  value: fmtN(data.my_investments||0),icon: '📈', color: 'var(--success)'  },
    { label: 'My Commission',   value: fmt(data.my_commission||totalComm), icon: '💰', color: '#ff9800'  },
    { label: 'Downline',        value: fmtN(data.downline_count||0), icon: '🌐', color: '#9c27b0'        },
    { label: 'Down Investors',  value: fmtN(data.down_investors||0), icon: '👥', color: 'var(--primary)' },
    { label: 'Total Business',  value: fmt(data.total_business||0),  icon: '🏦', color: 'var(--success)' },
  ];

  return (
    <div className="page-enter">
      <div className="adv-page-header">
        <h1>Welcome, {adv.full_name || user?.full_name}</h1>
        <p className="text-muted">
          {adv.rank_name} &nbsp;·&nbsp;
          Code: <code style={{fontFamily:'monospace',color:'var(--primary)'}}>{adv.adviser_code}</code>
        </p>
      </div>

      <div className="adv-stats-grid">
        {STATS.map(s => (
          <div key={s.label} className="adv-stat-card" style={{'--card-color': s.color}}>
            <div className="adv-stat-icon">{s.icon}</div>
            <div className="adv-stat-value">{s.value}</div>
            <div className="adv-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent commissions */}
      {data.commissions?.length > 0 && (
        <Panel title="Recent Commissions">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Plan</th><th>Tenure</th><th>Base</th><th>Rate</th><th>Commission</th><th>Type</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.commissions.slice(0,5).map((c,i) => (
                <tr key={c.id}>
                  <td>{i+1}</td>
                  <td>{c.plan_type}</td>
                  <td>{c.plan_tenure}</td>
                  <td><strong>{fmt(c.investment_amount||c.base_amount)}</strong></td>
                  <td style={{color:'var(--primary)',fontWeight:700}}>{c.commission_rate}%</td>
                  <td><strong style={{color:'var(--success)'}}>{fmt(c.commission_amount)}</strong></td>
                  <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 8px',borderRadius:4,
                    background:c.commission_type==='Direct'?'var(--success-bg)':'var(--warning-bg)',
                    color:c.commission_type==='Direct'?'var(--success)':'var(--warning)'}}>{c.commission_type||'Direct'}</span></td>
                  <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,
                    background:c.status==='Paid'?'var(--success-bg)':'var(--warning-bg)',
                    color:c.status==='Paid'?'var(--success)':'var(--warning)'}}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

/* ══ ADVISER INFO ══ */
function AdviserInfoView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/adviser-portal/info')
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data)   return <div className="adv-error">Could not load adviser info</div>;

  return (
    <div className="page-enter">
      <div className="adv-page-header"><h1>Adviser Info</h1></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <Panel title="Personal Details">
          {[
            ['Adviser Code',  data.adviser_code],
            ['Full Name',     data.full_name],
            ['Father Name',   data.father_name||'—'],
            ['Mobile',        data.mobile],
            ['Email',         data.email||'—'],
            ['Rank',          `${data.rank_name} (Rank ${data.rank_id})`],
            ['Joined',        data.created_at?.split('T')[0]||'—'],
            ['Promoter Code', data.parent_adviser_code||'—'],
            ['Promoter Name', data.promoter?.full_name||'—'],
            ['Promoter Rank', data.promoter?.rank_name||'—'],
          ].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:'0.85rem'}}>
              <span style={{color:'var(--text-muted)'}}>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </Panel>
        <Panel title="Commission Summary">
          {[
            ['Total Commission',   fmt(data.total_commission),   'var(--text-primary)'],
            ['Paid Commission',    fmt(data.paid_commission),    'var(--success)'],
            ['Pending Commission', fmt(data.pending_commission), 'var(--warning)'],
            ['Direct Investors',   fmtN(data.investors_count),  'var(--primary)'],
          ].map(([k,v,color]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:'0.85rem'}}>
              <span style={{color:'var(--text-muted)'}}>{k}</span>
              <strong style={{color,fontSize:'1rem'}}>{v}</strong>
            </div>
          ))}
          <div style={{marginTop:16,padding:14,background:'var(--success-bg)',borderRadius:'var(--border-radius-md)',textAlign:'center'}}>
            <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:4}}>Total Earned</div>
            <div style={{fontSize:'1.8rem',fontWeight:800,color:'var(--success)'}}>{fmt(data.total_commission)}</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ══ SELF CONTRIBUTION INFO ══ */
function SelfContributionView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/adviser-portal/self-contribution', { params:{ page } })
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page-enter">
      <div className="adv-page-header">
        <h1>Self Contribution Info</h1>
        <p className="text-muted">List of all investments made by this adviser</p>
      </div>

      {data && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
          {[
            ['Total Investments', fmtN(data.total),            'var(--primary)'],
            ['Total Business',    fmt(data.total_business),    'var(--success)'],
            ['Direct Commission', fmt(data.direct_commission), '#ff9800'],
          ].map(([label,val,color]) => (
            <div key={label} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderLeft:`3px solid ${color}`,borderRadius:'var(--border-radius-lg)',padding:'12px 16px'}}>
              <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:3}}>{label}</div>
              <div style={{fontSize:'1.2rem',fontWeight:800,color}}>{val}</div>
            </div>
          ))}
        </div>
      )}

      <Panel title="My Investors' Investment List">
        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>IRN</th><th>Investor Name</th><th>Investor ID</th><th>Plan</th><th>Monthly</th><th>Total</th><th>Maturity</th><th>ROI</th></tr>
            </thead>
            <tbody>
              {(data?.items||[]).map((inv,i) => (
                <tr key={inv.id}>
                  <td>{(page-1)*20+i+1}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--success)'}}>{inv.irn}</code></td>
                  <td><strong>{inv.investor_name||'—'}</strong></td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--primary)'}}>{inv.investor_id}</code></td>
                  <td><strong>{inv.plan_name}</strong></td>
                  <td><strong style={{color:'var(--primary)'}}>{fmt(inv.monthly_amount)}</strong></td>
                  <td>{fmt(inv.total_investment_amount)}</td>
                  <td><strong style={{color:'var(--success)'}}>{fmt(inv.total_maturity_amount)}</strong></td>
                  <td style={{color:'var(--primary)',fontWeight:700}}>{inv.roi_display}</td>
                </tr>
              ))}
              {!(data?.items||[]).length && (
                <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No investments yet</td></tr>
              )}
            </tbody>
          </table>
        )}
        {data?.pages > 1 && (
          <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>
            <button className="btn btn-outline btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <span style={{padding:'6px 12px',fontSize:'0.82rem',color:'var(--text-muted)'}}>{page} / {data.pages}</span>
            <button className="btn btn-outline btn-sm" disabled={page>=data.pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ══ DOWN CONTRIBUTION INFO ══ */
function DownContributionView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tab,  setTab]  = useState('investments');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/adviser-portal/down-contribution', { params:{ page } })
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page-enter">
      <div className="adv-page-header">
        <h1>Down Contribution Info</h1>
        <p className="text-muted">All investment records made through advisers in your downline network</p>
      </div>

      {data && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
          {[
            ['Downline Advisers', fmtN(data.downline_count),  'var(--primary)'],
            ['Total Business',    fmt(data.total_business),   'var(--success)'],
            ['Upper Commission',  fmt(data.upper_commission), '#ff9800'],
          ].map(([label,val,color]) => (
            <div key={label} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderLeft:`3px solid ${color}`,borderRadius:'var(--border-radius-lg)',padding:'12px 16px'}}>
              <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:3}}>{label}</div>
              <div style={{fontSize:'1.2rem',fontWeight:800,color}}>{val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <button className={`btn btn-sm ${tab==='investments'?'btn-primary':'btn-outline'}`} onClick={()=>setTab('investments')}>All Investments</button>
        <button className={`btn btn-sm ${tab==='by_adviser'?'btn-primary':'btn-outline'}`} onClick={()=>setTab('by_adviser')}>By Adviser</button>
      </div>

      {tab === 'investments' && (
        <Panel title="Downline Investment Records">
          {loading ? <Loading /> : (
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>IRN</th><th>Investor</th><th>Adviser</th><th>Plan</th><th>Monthly</th><th>Total</th><th>Maturity</th></tr>
              </thead>
              <tbody>
                {(data?.items||[]).map((inv,i) => (
                  <tr key={inv.id}>
                    <td>{(page-1)*20+i+1}</td>
                    <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--success)'}}>{inv.irn}</code></td>
                    <td><strong>{inv.investor_name||inv.investor_id}</strong></td>
                    <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--primary)'}}>{inv.adviser_code}</code><br/><small style={{color:'var(--text-muted)'}}>{inv.adviser_name}</small></td>
                    <td>{inv.plan_name}</td>
                    <td><strong style={{color:'var(--primary)'}}>{fmt(inv.monthly_amount)}</strong></td>
                    <td>{fmt(inv.total_investment_amount)}</td>
                    <td><strong style={{color:'var(--success)'}}>{fmt(inv.total_maturity_amount)}</strong></td>
                  </tr>
                ))}
                {!(data?.items||[]).length && (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No downline investments yet</td></tr>
                )}
              </tbody>
            </table>
          )}
          {data?.pages > 1 && (
            <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>
              <button className="btn btn-outline btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
              <span style={{padding:'6px 12px',fontSize:'0.82rem',color:'var(--text-muted)'}}>{page} / {data.pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page>=data.pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
            </div>
          )}
        </Panel>
      )}

      {tab === 'by_adviser' && (
        <Panel title="Business by Downline Adviser">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Adviser Code</th><th>Name</th><th>Rank</th><th>Investments</th><th>Business</th></tr>
            </thead>
            <tbody>
              {(data?.by_adviser||[]).map((a,i) => (
                <tr key={a.adviser_code}>
                  <td>{i+1}</td>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--primary)'}}>{a.adviser_code}</code></td>
                  <td><strong>{a.adviser_name}</strong></td>
                  <td><span style={{background:'var(--bg-table-head)',padding:'2px 8px',borderRadius:4,fontSize:'0.75rem',fontWeight:700}}>{a.rank_name}</span></td>
                  <td style={{textAlign:'center'}}><strong>{a.inv_count}</strong></td>
                  <td><strong style={{color:'var(--success)',fontSize:'1rem'}}>{fmt(a.business)}</strong></td>
                </tr>
              ))}
              {!(data?.by_adviser||[]).length && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No downline advisers yet</td></tr>
              )}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}