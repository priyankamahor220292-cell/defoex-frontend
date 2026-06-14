import React, { useState, useEffect } from 'react';
import Panel from '../../components/Panel/Panel';
import Badge from '../../components/Badge/Badge';
import Pagination from '../../components/Pagination/Pagination';
import Loading from '../../components/Loading/Loading';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './CommissionsPage.css';

export default function CommissionsPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Commissions</h1>
        <div className="tabs">
          <button className={`tab-btn ${tab===0?'active':''}`} onClick={() => setTab(0)}>Commission Records</button>
          <button className={`tab-btn ${tab===1?'active':''}`} onClick={() => setTab(1)}>Rate Chart</button>
        </div>
      </div>
      {tab === 0 ? <CommissionList /> : <CommissionChart />}
    </div>
  );
}

function CommissionList() {
  const [data, setData]   = useState({ items:[], total:0, pages:1, current_page:1 });
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status:'', adviser_code:'' });

  const load = (p=1) => {
    setLoading(true);
    api.get('/api/commissions/', { params:{ page:p, ...filters } })
      .then(r => setData(r.data.data || {}))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(page); }, [page]);

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;
  const total = data.items?.reduce((s,c) => s+(c.commission_amount||0), 0) || 0;

  return (
    <Panel title="Commission Records"
      actions={
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input className="form-input" placeholder="Adviser code" value={filters.adviser_code}
            onChange={e => setFilters({...filters, adviser_code:e.target.value})} style={{width:140}} />
          <select className="form-input" value={filters.status}
            onChange={e => setFilters({...filters, status:e.target.value})} style={{width:110}}>
            <option value="">All Status</option>
            <option>Pending</option><option>Paid</option><option>Cancelled</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => load(1)}>Search</button>
        </div>
      }>
      {data.items?.length > 0 && (
        <div className="comm-summary">
          <div className="cs-item"><span>Total Commission</span><strong>{fmt(total)}</strong></div>
          <div className="cs-item"><span>Records</span><strong>{data.total}</strong></div>
        </div>
      )}
      {loading ? <Loading /> : (
        <>
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Adviser</th><th>Rank</th><th>Plan</th><th>Tenure</th><th>Investment</th><th>Rate</th><th>Commission</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.items?.map((c,i) => (
                <tr key={c.id}>
                  <td>{i+1}</td>
                  <td><code style={{fontSize:'0.78rem'}}>{c.adviser_code}</code></td>
                  <td><span className="rank-badge">{c.adviser_rank}</span></td>
                  <td>{c.plan_type}</td>
                  <td>{c.plan_tenure}</td>
                  <td>{fmt(c.investment_amount)}</td>
                  <td>{c.commission_rate}%</td>
                  <td><strong style={{color:'var(--success)'}}>{fmt(c.commission_amount)}</strong></td>
                  <td><Badge status={c.status} /></td>
                </tr>
              ))}
              {!data.items?.length && <tr><td colSpan={9} className="text-center text-muted" style={{padding:32}}>No commission records</td></tr>}
            </tbody>
          </table>
          <Pagination currentPage={data.current_page} totalPages={data.pages} onPageChange={p => { setPage(p); load(p); }} />
        </>
      )}
    </Panel>
  );
}

function CommissionChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState('mis');

  useEffect(() => {
    api.get('/api/commissions/chart').then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const chart = planType === 'mis' ? data?.mis : data?.sis;
  const tenures = planType === 'mis' ? ['3Y','5Y','7Y'] : ['3Y','5Y','7.5Y'];

  return (
    <Panel title="Commission Rate Chart"
      subtitle="Rates by adviser rank × plan tenure (%)"
      actions={
        <div className="tabs">
          <button className={`tab-btn ${planType==='mis'?'active':''}`} onClick={() => setPlanType('mis')}>MIS</button>
          <button className={`tab-btn ${planType==='sis'?'active':''}`} onClick={() => setPlanType('sis')}>SIS</button>
        </div>
      }>
      {chart && (
        <div style={{overflowX:'auto'}}>
          <table className="data-table comm-chart-table">
            <thead>
              <tr>
                <th>Rank</th>
                {tenures.map(t => <th key={t} style={{textAlign:'center'}}>{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(chart).map(([rank, rates]) => (
                <tr key={rank}>
                  <td><span className="rank-badge">{rank}</span></td>
                  {tenures.map(t => (
                    <td key={t} style={{textAlign:'center',fontWeight:700,color:'var(--primary)'}}>{rates[t]}%</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
