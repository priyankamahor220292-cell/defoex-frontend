import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Pagination from '../../components/Pagination/Pagination';
import { commissionService } from '../../services/commissionService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './CommissionsPage.css';

const fmt = n => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;

const fmtIST = (utcStr) => {
  if (!utcStr) return '—';
  const d = new Date(utcStr);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const yy = ist.getUTCFullYear();
  return `${dd}/${mm}/${yy}`;
};

const RANK_ORDER = [
  'SR', 'SO', 'SD', 'SI', 'DO', 'RO', 'ZO', 'EM',
  'EM I', 'EM II', 'EM R', 'EM C',
  'House 1', 'House 2', 'House 3', 'House 4',
  'House 5', 'House 6', 'House 7', 'House 8',
];

const buildRateRows = (rates = {}) =>
  RANK_ORDER.map((name, i) => {
    const r = rates[name] || {};
    return {
      id: i + 1,
      name,
      label: `${name} (${i + 1})`,
      r3: r['3Y'] ?? 0,
      r5: r['5Y'] ?? 0,
      r7: r['7Y'] ?? r['7.5Y'] ?? 0,
    };
  });

const calcCommission = (planType, tenure, amount, rankId, misRates, sisRates) => {
  const row = buildRateRows(planType === 'SIS' ? sisRates : misRates).find(r => r.id === rankId);
  if (!row) return null;
  const tenureKey = planType === 'SIS' ? '7.5Y' : tenure;
  const rateMap = planType === 'SIS' ? sisRates[row.name] : misRates[row.name];
  const rate = rateMap?.[tenureKey] ?? 0;
  const base = parseFloat(amount) || 0;
  const commission = base * rate / 100;
  return {
    plan: `${planType} ${tenureKey}`,
    rank: row.label,
    rate,
    commission,
    formula: `${fmt(base)} × ${rate}% = ${fmt(commission)}`,
  };
};

const emptySummary = () => ({ total: 0, totalCommission: 0, paid: 0, pending: 0, paidAmount: 0 });

async function fetchAllItems(statusFilter) {
  const params = {};
  if (statusFilter) params.status = statusFilter;
  const first = await commissionService.list({ ...params, page: 1 });
  const meta = first.data.data || {};
  const items = [...(meta.items || [])];
  const pages = meta.pages || 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        commissionService.list({ ...params, page: i + 2 })
      )
    );
    rest.forEach(r => items.push(...(r.data.data?.items || [])));
  }
  return items;
}

function buildSummary(items, planFilter) {
  const list = planFilter ? items.filter(c => c.plan_type === planFilter) : items;
  const paid = list.filter(c => c.status === 'Paid');
  const pending = list.filter(c => c.status === 'Pending');
  return {
    total: list.length,
    totalCommission: list.reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0),
    paid: paid.length,
    pending: pending.length,
    paidAmount: paid.reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0),
  };
}

export default function CommissionsPage() {
  const { user } = useAuth();
  const isBM = user?.role === 'branchmanager';

  const [view, setView] = useState('list');
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [summary, setSummary] = useState(emptySummary());
  const [misRates, setMisRates] = useState({});
  const [sisRates, setSisRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [calc, setCalc] = useState({ plan_type: 'MIS', tenure: '3Y', amount: 1000, rank_id: 20 });
  const [calcResult, setCalcResult] = useState(null);

  const rateRows = useMemo(() => buildRateRows(misRates), [misRates]);

  useEffect(() => {
    commissionService.chart()
      .then(r => {
        setMisRates(r.data.data?.mis || {});
        setSisRates(r.data.data?.sis || {});
      })
      .catch(() => {});
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const items = await fetchAllItems(filterStatus);
      setSummary(buildSummary(items, filterType));
    } catch {
      setSummary(emptySummary());
    } finally {
      setSummaryLoading(false);
    }
  }, [filterStatus, filterType]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page };
    if (filterStatus) params.status = filterStatus;
    commissionService.list(params)
      .then(r => setData(r.data.data || { items: [], total: 0, pages: 1 }))
      .catch(() => toast.error('Failed to load benefits'))
      .finally(() => setLoading(false));
  }, [page, filterStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const refresh = () => { load(); loadSummary(); };

  const filteredItems = useMemo(() => {
    const items = data.items || [];
    if (!filterType) return items;
    return items.filter(c => c.plan_type === filterType);
  }, [data.items, filterType]);

  const runCalc = () => {
    const result = calcCommission(calc.plan_type, calc.tenure, calc.amount, calc.rank_id, misRates, sisRates);
    if (!result) return toast.error('Could not calculate — rates not loaded');
    setCalcResult(result);
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Benefits</h1>
          <p className="text-muted">{isBM ? 'Your branch adviser benefits' : 'All adviser benefits across branches'}</p>
        </div>
        <div className="page-actions">
          <button type="button" className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('list')}>Records</button>
          <button type="button" className={`btn ${view === 'rates' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('rates')}>Rate Chart</button>
          <button type="button" className={`btn ${view === 'calc' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('calc')}>Calculator</button>
        </div>
      </div>

      {view === 'list' && (
        <>
          <div className="comm-hero">
            <div className="comm-hero-stat">
              <span>Total Records</span>
              <strong>{summaryLoading ? '…' : summary.total}</strong>
            </div>
            <div className="comm-hero-stat">
              <span>Total Benefits</span>
              <strong className="green">{summaryLoading ? '…' : fmt(summary.totalCommission)}</strong>
            </div>
            <div className="comm-hero-stat">
              <span>Paid</span>
              <strong className="blue">{summaryLoading ? '…' : summary.paid}</strong>
            </div>
            <div className="comm-hero-stat">
              <span>Pending</span>
              <strong className="warn">{summaryLoading ? '…' : summary.pending}</strong>
            </div>
          </div>

          <div className="comm-filters">
            <div className="comm-filter-group">
              <span className="comm-filter-label">Plan:</span>
              {['', 'MIS', 'SIS'].map(t => (
                <button
                  key={t || 'all'}
                  type="button"
                  className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilterType(t)}
                >
                  {t || 'All'}
                </button>
              ))}
            </div>
            <div className="comm-filter-group">
              <span className="comm-filter-label">Status:</span>
              {['', 'Paid', 'Pending'].map(s => (
                <button
                  key={s || 'all'}
                  type="button"
                  className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setFilterStatus(s); setPage(1); }}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={refresh} style={{ marginLeft: 'auto' }}>↻ Refresh</button>
          </div>

          <Panel title={`Benefits Records (${summary.total})`}>
            {loading ? <Loading /> : (
              <>
                <div className="comm-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Adviser</th>
                        <th>Rank</th>
                        <th>Plan</th>
                        <th>Tenure</th>
                        <th>Base</th>
                        <th>Rate</th>
                        <th>Benefits</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((c, i) => (
                        <tr key={c.id}>
                          <td>{(page - 1) * 20 + i + 1}</td>
                          <td>
                            <code className="comm-code">{c.adviser_code}</code>
                          </td>
                          <td><span className="comm-rank-badge">{c.adviser_rank || '—'}</span></td>
                          <td>
                            <span className={c.plan_type === 'MIS' ? 'comm-plan-mis' : 'comm-plan-sis'}>{c.plan_type}</span>
                          </td>
                          <td>{c.plan_tenure || '—'}</td>
                          <td><strong>{fmt(c.investment_amount)}</strong></td>
                          <td><span className="comm-rate">{c.commission_rate}%</span></td>
                          <td><strong className="comm-amt">{fmt(c.commission_amount)}</strong></td>
                          <td>
                            <span className={c.status === 'Paid' ? 'comm-status-paid' : 'comm-status-pending'}>
                              {c.status}
                            </span>
                          </td>
                          <td className="comm-date">{fmtIST(c.created_at)}</td>
                        </tr>
                      ))}
                      {!filteredItems.length && (
                        <tr>
                          <td colSpan={10} className="comm-empty">No benefits records found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={page} totalPages={data.pages || 1} onPageChange={setPage} />
              </>
            )}
          </Panel>
        </>
      )}

      {view === 'rates' && (
        <Panel title="MIS Benefits Rate Chart" subtitle="Rates loaded from server — applied on monthly amount">
          {rateRows.length ? (
            <>
              <div className="comm-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th className="comm-chart-col-3y">3 Year (36M)</th>
                      <th className="comm-chart-col-5y">5 Year (60M)</th>
                      <th className="comm-chart-col-7y">7 Year (84M)</th>
                      <th>Example ₹1,000/mo (3Y)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateRows.map(row => (
                      <tr key={row.name}>
                        <td><strong>{row.label}</strong></td>
                        <td className="comm-chart-col-3y" style={{ textAlign: 'center' }}><span className="comm-rate">{row.r3}%</span></td>
                        <td className="comm-chart-col-5y" style={{ textAlign: 'center' }}><span className="comm-rate">{row.r5}%</span></td>
                        <td className="comm-chart-col-7y" style={{ textAlign: 'center' }}><span className="comm-rate">{row.r7}%</span></td>
                        <td style={{ textAlign: 'center' }}><strong className="comm-amt">{fmt(1000 * row.r3 / 100)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="comm-chart-note">
                <strong>Formula:</strong> Benefits = Monthly Amount × Rate%
                &nbsp;·&nbsp;
                <strong>Team Benefits:</strong> Higher rank adviser gets the difference between their rate and the lower adviser's rate on downline business
                <br />
                <strong>DEFOEX CODE (Rank 20):</strong> Flat 2% on every approved investment
                &nbsp;·&nbsp;
                <strong>SIS:</strong> Rate applied on total investment amount (lump sum)
              </div>
            </>
          ) : (
            <Loading text="Loading rate chart..." />
          )}
        </Panel>
      )}

      {view === 'calc' && (
        <div className="comm-calc-grid">
          <Panel title="Benefits Calculator">
            <div className="reg-form-row">
              <Field label="Plan Type">
                <Select
                  value={calc.plan_type}
                  onChange={e => {
                    const plan_type = e.target.value;
                    setCalc(c => ({
                      ...c,
                      plan_type,
                      tenure: plan_type === 'SIS' ? '7Y' : c.tenure,
                    }));
                    setCalcResult(null);
                  }}
                >
                  <option value="MIS">MIS</option>
                  <option value="SIS">SIS</option>
                </Select>
              </Field>
              <Field label="Tenure">
                <Select
                  value={calc.tenure}
                  onChange={e => setCalc(c => ({ ...c, tenure: e.target.value }))}
                  disabled={calc.plan_type === 'SIS'}
                >
                  <option value="3Y">3 Year</option>
                  <option value="5Y">5 Year</option>
                  <option value="7Y">{calc.plan_type === 'SIS' ? '7.5 Year' : '7 Year'}</option>
                </Select>
              </Field>
            </div>
            <div className="reg-form-row">
              <Field label={calc.plan_type === 'MIS' ? 'Monthly Amount (₹)' : 'Total Investment (₹)'}>
                <Input
                  type="number"
                  value={calc.amount}
                  min="1"
                  onChange={e => setCalc(c => ({ ...c, amount: parseFloat(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Adviser Rank">
                <Select value={calc.rank_id} onChange={e => setCalc(c => ({ ...c, rank_id: parseInt(e.target.value, 10) }))}>
                  {rateRows.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <button type="button" className="btn btn-primary btn-full" onClick={runCalc}>
              Calculate Benefits →
            </button>

            {calcResult && (
              <div className="comm-calc-result">
                <div className="comm-calc-result-title">✅ Benefits Result</div>
                {[
                  ['Plan', calcResult.plan],
                  ['Rank', calcResult.rank],
                  ['Base', fmt(calc.amount)],
                  ['Rate', `${calcResult.rate}%`],
                  ['Formula', calcResult.formula],
                ].map(([k, v]) => (
                  <div key={k} className="comm-calc-row">
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
                <div className="comm-calc-total">
                  <span>Direct Benefits</span>
                  <span>{fmt(calcResult.commission)}</span>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Quick Reference — ₹1,000/month">
            <div className="comm-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>3Y</th>
                    <th>5Y</th>
                    <th>7Y</th>
                  </tr>
                </thead>
                <tbody>
                  {rateRows.map(row => (
                    <tr key={row.name} className={row.id === calc.rank_id ? 'comm-ref-highlight' : ''}>
                      <td><strong>{row.label}</strong></td>
                      <td style={{ textAlign: 'center' }}>{fmt(1000 * row.r3 / 100)}</td>
                      <td style={{ textAlign: 'center' }}>{fmt(1000 * row.r5 / 100)}</td>
                      <td style={{ textAlign: 'center' }}>{fmt(1000 * row.r7 / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
