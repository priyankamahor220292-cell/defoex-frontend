import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './SearchEngine.css';

const TABS = [
  { key: 'all',      label: 'All',        icon: '🔍' },
  { key: 'irn',      label: 'IRN / Bond', icon: '📜' },
  { key: 'investor', label: 'Investor',   icon: '👤' },
  { key: 'adviser',  label: 'Adviser',    icon: '🏅' },
  { key: 'mobile',   label: 'Mobile',     icon: '📱' },
];

const fmt = n => n != null ? '20b9' + Number(n).toLocaleString('en-IN') : '2014';

export default function SearchEngine({ onSelectInvestor, onSelectPlan }) {
  const [query,   setQuery]   = useState('');
  const [tab,     setTab]     = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [error,   setError]   = useState('');
  const inputRef  = useRef();
  const boxRef    = useRef();
  const debounce  = useRef();

  useEffect(() => {
    const h = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const doSearch = useCallback(async (q, by) => {
    if (!q || q.length < 2) { setResults(null); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/api/reports/search', { params: { q, by } });
      setResults(data.data);
      setOpen(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Search failed');
      setResults(null);
    } finally { setLoading(false); }
  }, []);

  const onInput = e => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(q, tab), 350);
  };

  const switchTab = t => { setTab(t); if (query.length >= 2) doSearch(query, t); };
  const clear     = () => { setQuery(''); setResults(null); setOpen(false); };

  const total = results
    ? (results.investors?.length||0) + (results.investments?.length||0) + (results.advisers?.length||0)
    : 0;

  return (
    <div className="se-wrap" ref={boxRef}>
      <div className="se-bar">
        <span className="se-icon">🔍</span>
        <input ref={inputRef} className="se-input"
          placeholder="Search by IRN · Investor · Adviser · Mobile  (⌘K)"
          value={query} onChange={onInput}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          autoComplete="off" spellCheck={false} />
        {loading && <span className="se-spin">◌</span>}
        {query && <button className="se-clear" onClick={clear}>✕</button>}
        <span className="se-kbd">⌘K</span>
      </div>

      {open && query.length >= 2 && (
        <div className="se-dropdown">
          <div className="se-tabs">
            {TABS.map(t => (
              <button key={t.key} className={`se-tab ${tab===t.key?'active':''}`} onClick={() => switchTab(t.key)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {error && <div className="se-error">⚠ {error}</div>}

          {!loading && results && total === 0 && (
            <div className="se-empty">
              <div style={{fontSize:'1.8rem',marginBottom:8}}>🔍</div>
              No results for "<strong>{query}</strong>"
            </div>
          )}

          {/* IRN / Investment Plans */}
          {results?.investments?.length > 0 && (
            <div className="se-section">
              <div className="se-section-title">📜 Investment Bonds (IRN)</div>
              {results.investments.map(inv => (
                <div key={inv.id} className="se-item" onClick={() => { onSelectPlan?.(inv); setOpen(false); }}>
                  <div className="se-item-row">
                    <code className="se-code irn">{inv.irn}</code>
                    <strong className="se-name">{inv.investor_name}</strong>
                    <span className={`se-pill ${inv.approval_status?.toLowerCase()}`}>{inv.approval_status}</span>
                  </div>
                  <div className="se-item-meta">
                    <span>Plan <b>{inv.plan_name}</b></span>
                    <span>Monthly <b>{fmt(inv.monthly_amount)}</b></span>
                    <span>Maturity <b className="se-green">{fmt(inv.total_maturity_amount)}</b></span>
                    <span>ROI {inv.roi_display}</span>
                    <span>{inv.investor_mobile}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Investors */}
          {results?.investors?.length > 0 && (
            <div className="se-section">
              <div className="se-section-title">👤 Investors</div>
              {results.investors.map(m => (
                <div key={m.id} className="se-item" onClick={() => { onSelectInvestor?.(m); setOpen(false); }}>
                  <div className="se-item-row">
                    <code className="se-code inv">{m.investor_id}</code>
                    <strong className="se-name">{m.full_name}</strong>
                    <span className={`se-pill ${m.status==='Active'?'approved':'pending'}`}>{m.status}</span>
                  </div>
                  <div className="se-item-meta">
                    <span>📱 <b>{m.mobile}</b></span>
                    <span>Adviser {m.adviser_code}</span>
                    <span>{m.plan_count} plan{m.plan_count!==1?'s':''}</span>
                    <span>📍 {m.corr_city || '—'}</span>
                    <span>{m.approval_status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Advisers */}
          {results?.advisers?.length > 0 && (
            <div className="se-section">
              <div className="se-section-title">🏅 Advisers</div>
              {results.advisers.map(a => (
                <div key={a.id} className="se-item">
                  <div className="se-item-row">
                    <code className="se-code adv">{a.adviser_code}</code>
                    <strong className="se-name">{a.full_name}</strong>
                    <span className={`se-pill ${a.is_active?'approved':'rejected'}`}>{a.is_active?'Active':'Inactive'}</span>
                  </div>
                  <div className="se-item-meta">
                    <span>📱 <b>{a.mobile}</b></span>
                    <span>Rank <b>{a.rank_name}</b></span>
                    <span>{a.email || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results && total > 0 && (
            <div className="se-footer">{total} result{total!==1?'s':''} · "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
}