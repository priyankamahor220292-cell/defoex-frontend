import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './SearchEngine.css';

const fmt = n => n != null ? '\u20b9' + Number(n).toLocaleString('en-IN') : '\u2014';

const SEARCH_TYPES = [
  { key: 'irn',      label: 'Search by Plan ID',  placeholder: 'Enter Plan ID e.g. 9-MISINV202601',  icon: '\ud83d\udcdc' },
  { key: 'investor', label: 'Search by Investor',     placeholder: 'Enter name, investor ID or mobile',   icon: '\ud83d\udc64' },
  { key: 'adviser',  label: 'Search by Adviser',      placeholder: 'Enter adviser code, name or mobile',  icon: '\ud83c\udfc5' },
];

export default function SearchEngine() {
  const [activeType, setActiveType] = useState('irn');
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const wrapRef  = useRef();
  const inputRef = useRef();
  const debRef   = useRef();

  const currentType = SEARCH_TYPES.find(t => t.key === activeType);

  // Close dropdown on outside click
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const doSearch = useCallback(async (q, by) => {
    if (!q || q.trim().length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/api/reports/search', { params: { q: q.trim(), by } });
      setResults(data.data);
      setOpen(true);
    } catch {
      setResults(null);
    } finally { setLoading(false); }
  }, []);

  const onInput = e => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => doSearch(q, activeType), 400);
  };

  const switchType = key => {
    setActiveType(key);
    setQuery('');
    setResults(null);
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const clear = () => { setQuery(''); setResults(null); setOpen(false); };

  const total = results
    ? (results.investors?.length || 0) + (results.investments?.length || 0) + (results.advisers?.length || 0)
    : 0;

  return (
    <div className="se-root" ref={wrapRef}>
      <div className="se-type-bar">
        {SEARCH_TYPES.map(t => (
          <button
            key={t.key}
            type="button"
            className={`se-type-btn ${activeType === t.key ? 'active' : ''}`}
            onClick={() => switchType(t.key)}
          >
            <span className="se-type-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search Input ── */}
      <div className="se-input-wrap">
        <div className={`se-input-box ${open ? 'focused' : ''}`}>
          <span className="se-input-icon">{loading ? '⟳' : '🔍'}</span>
          <input
            ref={inputRef}
            className="se-input"
            placeholder={currentType.placeholder}
            value={query}
            onChange={onInput}
            onFocus={() => { if (results && total > 0) setOpen(true); }}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="se-clear-btn" onClick={clear}>✕</button>
          )}
          <button
            className="se-search-btn"
            onClick={() => doSearch(query, activeType)}
            disabled={loading || query.length < 2}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* ── Results Dropdown ── */}
        {open && (
          <div className="se-results">
            {total === 0 && !loading && (
              <div className="se-no-result">
                <span style={{fontSize:'1.6rem'}}>🔍</span>
                <p>No results found for <strong>"{query}"</strong></p>
                <p className="se-hint">Try a different spelling or search type</p>
              </div>
            )}

            {/* IRN Results */}
            {results?.investments?.length > 0 && (
              <div className="se-group">
                <div className="se-group-title">📜 Investment Bonds (IRN)</div>
                {results.investments.map(inv => (
                  <div key={inv.id} className="se-result-item">
                    <div className="se-result-top">
                      <code className="se-chip irn">{inv.irn}</code>
                      <span className="se-result-name">{inv.investor_name}</span>
                      <span className={`se-status ${inv.approval_status?.toLowerCase()}`}>{inv.approval_status}</span>
                    </div>
                    <div className="se-result-meta">
                      <span>Plan <b>{inv.plan_name}</b></span>
                      <span>Monthly <b>{fmt(inv.monthly_amount)}</b></span>
                      <span>Return of Investment <b className="se-green">{fmt(inv.total_maturity_amount)}</b></span>
                      <span>ROI <b>{inv.roi_display}</b></span>
                      <span>📱 {inv.investor_mobile}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Investor Results */}
            {results?.investors?.length > 0 && (
              <div className="se-group">
                <div className="se-group-title">👤 Investors</div>
                {results.investors.map(m => (
                  <div key={m.id} className="se-result-item">
                    <div className="se-result-top">
                      <code className="se-chip inv">{m.investor_id}</code>
                      <span className="se-result-name">{m.full_name}</span>
                      <span className={`se-status ${m.status === 'Active' ? 'approved' : 'pending'}`}>{m.status}</span>
                    </div>
                    <div className="se-result-meta">
                      <span>📱 <b>{m.mobile}</b></span>
                      <span>Adviser {m.adviser_code}</span>
                      <span>{m.plan_count} plan{m.plan_count !== 1 ? 's' : ''}</span>
                      <span>📍 {m.corr_city || '\u2014'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adviser Results */}
            {results?.advisers?.length > 0 && (
              <div className="se-group">
                <div className="se-group-title">🏅 Advisers</div>
                {results.advisers.map(a => (
                  <div key={a.id} className="se-result-item">
                    <div className="se-result-top">
                      <code className="se-chip adv">{a.adviser_code}</code>
                      <span className="se-result-name">{a.full_name}</span>
                      <span className={`se-status ${a.is_active ? 'approved' : 'rejected'}`}>{a.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="se-result-meta">
                      <span>📱 <b>{a.mobile}</b></span>
                      <span>Rank <b>{a.rank_name}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {total > 0 && (
              <div className="se-results-footer">{total} result{total !== 1 ? 's' : ''} for "{query}"</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}