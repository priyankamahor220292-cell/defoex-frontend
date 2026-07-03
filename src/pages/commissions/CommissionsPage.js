import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Loading from '../../components/Loading/Loading';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const fmt  = n => '\u20b9' + (n||0).toLocaleString('en-IN');
const fmtD = n => typeof n === 'number' ? `${n}%` : n;

const RANK_NAMES = {
  1:'SR',2:'SO',3:'SD',4:'SI',5:'DO',6:'RO',7:'ZO',
  8:'EM',9:'EM I',10:'EM II',11:'EM R',12:'EM C',
  13:'House 1',14:'House 2',15:'House 3',16:'House 4',
  17:'House 5',18:'House 6',19:'House 7',20:'House 8',
};

// MIS rates table for display
const MIS_RATES = [
  ['SR (1)',    7.0, 9.0, 10.0],  ['SO (2)',  7.0, 9.0, 10.0],
  ['SD (3)',    7.0, 9.0, 10.0],  ['SI (4)',  7.0, 9.0, 10.0],
  ['DO (5)',    8.0, 10.0,11.0],  ['RO (6)',  8.0, 10.0,11.0],
  ['ZO (7)',    9.0, 11.0,12.0],  ['EM (8)',  9.0, 11.0,12.0],
  ['EM I (9)', 10.0, 12.0,13.0], ['EM II (10)',11.0,13.0,14.0],
  ['EM R (11)',12.0, 14.0,15.0], ['EM C (12)',13.0,15.0,16.0],
  ['House 1 (13)',13.0,15.0,16.0],['House 2 (14)',13.5,15.5,16.5],
  ['House 3 (15)',14.0,16.0,17.0],['House 4 (16)',14.5,16.0,17.0],
  ['House 5 (17)',14.5,16.0,17.0],['House 6 (18)',14.5,16.0,17.0],
  ['House 7 (19)',14.5,16.0,17.0],['House 8 (20)',14.5,16.5,17.5],
];

export default function CommissionsPage() {
  const { user }     = useAuth();
  const isBM         = user?.role === 'branchmanager';
  const [view,       setView]       = useState('list');
  const [data,       setData]       = useState({ items:[], total:0 });
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterRank, setFilterRank] = useState('');
  const [calc,       setCalc]       = useState({ plan_type:'MIS', tenure:'3Y', amount:1000, rank_id:20 });
  const [calcResult, setCalcResult] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/commissions/', { params: { page, plan_type: filterType } })
      .then(r => setData(r.data.data || {}))
      .catch(() => toast.error('Failed to load commissions'))
      .finally(() => setLoading(false));
  }, [page, filterType]);

  useEffect(() => { load(); }, [load]);

  const runCalc = async () => {
    try {
      const { data } = await api.get('/api/commissions/calculate', { params: calc });
      setCalcResult(data.data);
    } catch(e) {
      // Fallback: calculate locally
      const rate = MIS_RATES.find(r => r[0].includes(`(${calc.rank_id})`));
      if (rate) {
        const idx = calc.tenure === '3Y' ? 1 : calc.tenure === '5Y' ? 2 : 3;
        const pct = rate[idx];
        const amt = calc.amount * pct / 100;
        setCalcResult({
          rate: pct, commission: amt,
          formula: `₹${Number(calc.amount).toLocaleString('en-IN')} × ${pct}% = ₹${amt.toFixed(2)}`,
          plan: `${calc.plan_type} ${calc.tenure}`,
          rank: rate[0],
        });
      }
    }
  };

  const totalCommission = (data.items||[]).reduce((s,c) => s + parseFloat(c.commission_amount||0), 0);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Commissions</h1>
          <p className="text-muted">{isBM ? 'Your branch adviser commissions' : 'All adviser commissions'}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className={`btn ${view==='list'?'btn-primary':'btn-outline'}`} onClick={()=>setView('list')}>Commission Records</button>
          <button className={`btn ${view==='rates'?'btn-primary':'btn-outline'}`} onClick={()=>setView('rates')}>Rate Chart</button>
          <button className={`btn ${view==='calc'?'btn-primary':'btn-outline'}`} onClick={()=>setView('calc')}>Calculator</button>
        </div>
      </div>

      {/* ── COMMISSION RECORDS ── */}
      {view === 'list' && (
        <>
          {/* Summary cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
            {[
              ['Total Records',    data.total||0,          'var(--primary)'],
              ['Total Commission', fmt(totalCommission),    'var(--success)'],
              ['Pending',          (data.items||[]).filter(c=>c.status==='Pending').length, 'var(--warning)'],
            ].map(([label,val,color]) => (
              <div key={label} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--border-radius-lg)',padding:'14px 16px',borderLeft:`3px solid ${color}`}}>
                <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:4}}>{label}</div>
                <div style={{fontSize:'1.3rem',fontWeight:800,color}}>{val}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            {['','MIS','SIS'].map(t => (
              <button key={t} className={`btn btn-sm ${filterType===t?'btn-primary':'btn-outline'}`}
                onClick={()=>{setFilterType(t);setPage(1);}}>
                {t||'All'}
              </button>
            ))}
          </div>

          <Panel title={`Commission Records (${data.total||0})`}>
            {loading ? <Loading /> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Adviser Code</th><th>Adviser Name</th><th>Rank</th>
                    <th>Type</th><th>Plan</th><th>Tenure</th>
                    <th>Base Amount</th><th>Rate</th><th>Commission</th>
                    <th>Commission Type</th><th>Status</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items||[]).map((c,i) => (
                    <tr key={c.id}>
                      <td>{(page-1)*20+i+1}</td>
                      <td><code style={{fontFamily:'monospace',fontSize:'0.75rem',background:'var(--primary-glow)',color:'var(--primary)',padding:'2px 7px',borderRadius:4}}>{c.adviser_code}</code></td>
                      <td>{c.adviser_name||'—'}</td>
                      <td><span style={{background:'var(--bg-table-head)',padding:'2px 8px',borderRadius:4,fontSize:'0.75rem',fontWeight:700}}>{c.adviser_rank}</span></td>
                      <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:c.plan_type==='MIS'?'var(--primary-glow)':'rgba(255,152,0,0.12)',color:c.plan_type==='MIS'?'var(--primary)':'#ff9800'}}>{c.plan_type}</span></td>
                      <td>{c.plan_name||c.plan_type}</td>
                      <td>{c.plan_tenure}</td>
                      <td><strong>{fmt(c.investment_amount||c.base_amount)}</strong></td>
                      <td><strong style={{color:'var(--primary)'}}>{c.commission_rate}%</strong></td>
                      <td><strong style={{color:'var(--success)',fontSize:'1rem'}}>{fmt(c.commission_amount)}</strong></td>
                      <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 8px',borderRadius:4,background:c.commission_type==='Direct'?'var(--success-bg)':'var(--warning-bg)',color:c.commission_type==='Direct'?'var(--success)':'var(--warning)'}}>{c.commission_type||'Direct'}</span></td>
                      <td><span style={{fontSize:'0.72rem',fontWeight:700,padding:'2px 9px',borderRadius:10,background:c.status==='Paid'?'var(--success-bg)':'var(--warning-bg)',color:c.status==='Paid'?'var(--success)':'var(--warning)'}}>{c.status}</span></td>
                      <td style={{fontSize:'0.75rem'}}>{c.created_at?.split('T')[0]}</td>
                    </tr>
                  ))}
                  {!(data.items||[]).length && (
                    <tr><td colSpan={13} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No commission records yet</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}

      {/* ── RATE CHART ── */}
      {view === 'rates' && (
        <Panel title="MIS Commission Rate Chart" subtitle="Rate applied on monthly amount">
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th style={{background:'rgba(var(--primary-rgb),0.1)'}}>3 Year (36M)</th>
                  <th style={{background:'rgba(var(--primary-rgb),0.15)'}}>5 Year (60M)</th>
                  <th style={{background:'rgba(var(--primary-rgb),0.2)'}}>7 Year (84M)</th>
                  <th>Example ₹1000/mo (3Y)</th>
                </tr>
              </thead>
              <tbody>
                {MIS_RATES.map(([rank, r3, r5, r7]) => (
                  <tr key={rank}>
                    <td><strong>{rank}</strong></td>
                    <td style={{textAlign:'center'}}><span style={{fontWeight:700,color:'var(--primary)'}}>{r3}%</span></td>
                    <td style={{textAlign:'center'}}><span style={{fontWeight:700,color:'var(--primary)'}}>{r5}%</span></td>
                    <td style={{textAlign:'center'}}><span style={{fontWeight:700,color:'var(--primary)'}}>{r7}%</span></td>
                    <td style={{textAlign:'center'}}><strong style={{color:'var(--success)'}}>{fmt(1000*r3/100)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:16,padding:'12px 16px',background:'var(--bg-input)',borderRadius:'var(--border-radius-sm)',fontSize:'0.82rem',color:'var(--text-muted)'}}>
            <strong>Formula:</strong> Commission = Monthly Amount × Rate%
            &nbsp;|&nbsp;
            <strong>Upper Rank:</strong> Higher rank adviser gets the difference between their rate and the lower adviser's rate
            &nbsp;|&nbsp;
            <strong>SIS:</strong> Rate applied on total investment amount (lump sum)
          </div>
        </Panel>
      )}

      {/* ── CALCULATOR ── */}
      {view === 'calc' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
          <Panel title="Commission Calculator">
            <div className="reg-form-row">
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:4,display:'block'}}>Plan Type</label>
                <select style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)'}}
                  value={calc.plan_type} onChange={e=>setCalc(c=>({...c,plan_type:e.target.value}))}>
                  <option value="MIS">MIS</option>
                  <option value="SIS">SIS</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:4,display:'block'}}>Tenure</label>
                <select style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)'}}
                  value={calc.tenure} onChange={e=>setCalc(c=>({...c,tenure:e.target.value}))}>
                  <option value="3Y">3 Year</option>
                  <option value="5Y">5 Year</option>
                  <option value="7Y">7 Year</option>
                </select>
              </div>
            </div>
            <div className="reg-form-row">
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:4,display:'block'}}>
                  {calc.plan_type==='MIS'?'Monthly Amount (₹)':'Total Investment (₹)'}
                </label>
                <input type="number" style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)'}}
                  value={calc.amount} onChange={e=>setCalc(c=>({...c,amount:parseFloat(e.target.value)||0}))} />
              </div>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:4,display:'block'}}>Adviser Rank</label>
                <select style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:'var(--border-radius-md)',background:'var(--bg-input)',color:'var(--text-primary)'}}
                  value={calc.rank_id} onChange={e=>setCalc(c=>({...c,rank_id:parseInt(e.target.value)}))}>
                  {MIS_RATES.map(([name],i) => <option key={i+1} value={i+1}>{name}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-full" style={{marginTop:8}} onClick={runCalc}>
              Calculate Commission →
            </button>

            {calcResult && (
              <div style={{marginTop:16,background:'var(--success-bg)',border:'1px solid var(--success)',borderRadius:'var(--border-radius-md)',padding:16}}>
                <div style={{fontWeight:700,color:'var(--success)',marginBottom:10}}>✅ Commission Result</div>
                <div style={{display:'grid',gap:6,fontSize:'0.85rem'}}>
                  {[
                    ['Plan',      calcResult.plan],
                    ['Rank',      calcResult.rank],
                    ['Base',      fmt(calc.amount)],
                    ['Rate',      `${calcResult.rate}%`],
                    ['Formula',   calcResult.formula],
                  ].map(([k,v]) => (
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                      <span style={{color:'var(--text-muted)'}}>{k}</span>
                      <strong>{v}</strong>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',marginTop:4}}>
                    <span style={{fontWeight:700}}>Direct Commission</span>
                    <span style={{fontWeight:800,fontSize:'1.3rem',color:'var(--success)'}}>{fmt(calcResult.commission)}</span>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          {/* Quick reference */}
          <Panel title="Quick Reference — ₹1000/month">
            <table className="data-table">
              <thead>
                <tr><th>Rank</th><th>3Y Commission</th><th>5Y Commission</th><th>7Y Commission</th></tr>
              </thead>
              <tbody>
                {MIS_RATES.map(([rank,r3,r5,r7]) => (
                  <tr key={rank} style={{background:rank.includes(`(${calc.rank_id})`)?'rgba(var(--primary-rgb),0.08)':''}}>
                    <td><strong>{rank}</strong></td>
                    <td style={{textAlign:'center'}}>{fmt(1000*r3/100)}</td>
                    <td style={{textAlign:'center'}}>{fmt(1000*r5/100)}</td>
                    <td style={{textAlign:'center'}}>{fmt(1000*r7/100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}
    </div>
  );
}