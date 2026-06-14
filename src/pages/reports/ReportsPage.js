import React, { useState, useEffect } from 'react';
import Panel from '../../components/Panel/Panel';
import Loading from '../../components/Loading/Loading';
import Pagination from '../../components/Pagination/Pagination';
import Badge from '../../components/Badge/Badge';
import { reportService } from '../../services/reportService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import './ReportsPage.css';

export default function ReportsPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Reports</h1>
        <div className="tabs">
          <button className={`tab-btn ${tab===0?'active':''}`} onClick={() => setTab(0)}>Business Summary</button>
          <button className={`tab-btn ${tab===1?'active':''}`} onClick={() => setTab(1)}>List Investors</button>
        </div>
      </div>
      {tab === 0 ? <BusinessSummary /> : <ListInvestors />}
    </div>
  );
}

function BusinessSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.businessSummary().then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;
  const periods = {
    '1_month': '1 Month', '3_months': '3 Months', '6_months': '6 Months',
    '1_year': '1 Year', 'overall': 'Overall',
  };

  const chartData = data ? Object.entries(periods).map(([key, label]) => ({
    name: label,
    amount: data.summary[key]?.total_business || 0,
    count: data.summary[key]?.investment_count || 0,
  })) : [];

  return (
    <>
      {data?.wallet && (
        <div className="wallet-summary-bar">
          <div className="wsb-item">
            <span>Current Balance</span>
            <strong className={data.wallet.is_low_balance ? 'low' : ''}>{fmt(data.wallet.current_balance)}</strong>
          </div>
          <div className="wsb-item">
            <span>Cash Wallet</span>
            <strong>{fmt(data.wallet.cash_wallet)}</strong>
          </div>
          {data.wallet.is_low_balance && <div className="wsb-alert">⚠️ Low Balance</div>}
        </div>
      )}

      <div className="report-grid">
        {Object.entries(periods).map(([key, label]) => (
          <div key={key} className="report-period-card">
            <div className="rpc-label">{label}</div>
            <div className="rpc-value">{fmt(data?.summary[key]?.total_business)}</div>
            <div className="rpc-count">{data?.summary[key]?.investment_count || 0} plans</div>
          </div>
        ))}
      </div>

      <Panel title="Business Volume Chart" className="mt-3">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
            <Tooltip formatter={(v, n) => [n === 'amount' ? fmt(v) : v, n === 'amount' ? 'Business' : 'Plans']} />
            <Bar dataKey="amount" fill="var(--primary)" radius={[4,4,0,0]} name="amount" />
            <Bar dataKey="count" fill="var(--accent)" radius={[4,4,0,0]} name="count" />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </>
  );
}

function ListInvestors() {
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });
  const [data, setData] = useState({ items: [], total: 0, pages: 1, current_page: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetch = (p = 1) => {
    setLoading(true);
    reportService.listInvestors({ ...filters, page: p })
      .then(r => setData(r.data.data || {}))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(1); }, []);

  return (
    <Panel title="List of Investors"
      actions={
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input className="form-input" type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} style={{ width:140 }} />
          <span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>to</span>
          <input className="form-input" type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} style={{ width:140 }} />
          <button className="btn btn-primary btn-sm" onClick={() => fetch(1)}>Search</button>
        </div>
      }
    >
      <div className="list-summary">Total: <strong>{data.total}</strong> investors</div>
      {loading ? <Loading /> : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Sr.</th><th>Investor Name</th><th>Investor ID</th><th>DOJ</th>
                <th>Adviser ID</th><th>Mobile</th><th>City</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((m, i) => (
                <tr key={m.investor_id}>
                  <td>{((data.current_page-1)*20)+i+1}</td>
                  <td><strong>{m.investor_name}</strong></td>
                  <td><code>{m.investor_id}</code></td>
                  <td>{m.date_of_joining}</td>
                  <td>{m.adviser_code}</td>
                  <td>{m.mobile}</td>
                  <td>{m.city || '—'}</td>
                  <td><Badge status={m.status} /></td>
                </tr>
              ))}
              {!data.items?.length && <tr><td colSpan={8} className="text-center text-muted" style={{padding:'32px'}}>No records</td></tr>}
            </tbody>
          </table>
          <Pagination currentPage={data.current_page} totalPages={data.pages} onPageChange={p => { setPage(p); fetch(p); }} />
        </>
      )}
    </Panel>
  );
}
