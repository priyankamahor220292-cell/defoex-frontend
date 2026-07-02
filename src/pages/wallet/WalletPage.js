import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatIST } from '../../utils/dateTime';
import './WalletPage.css';

// ── Format helpers ──────────────────────────────
const fmt       = n => `₹${(parseFloat(n)||0).toLocaleString('en-IN')}`;

// FIX 2: Show ₹1,00,00,00,000 style (Indian number system)
const fmtIndian = n => `₹${(parseFloat(n)||0).toLocaleString('en-IN')}`;

const fmtCr = n => {
  const num = parseFloat(n) || 0;
  if (num >= 10000000) return `₹${(num/10000000).toLocaleString('en-IN',{maximumFractionDigits:2})} Cr`;
  if (num >= 100000)   return `₹${(num/100000).toLocaleString('en-IN',{maximumFractionDigits:2})} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};


const MAX_TXN = 1_000_000_000; // ₹1,00,00,00,000 (100 Cr) — admin limit & max per transaction
const ADMIN_LIMIT = MAX_TXN;

const calcAdminStats = (aw = {}) => {
  const distributed = parseFloat(aw.total_distributed ?? aw.distributed ?? 0);
  const returned = parseFloat(aw.total_returned ?? 0);
  const used = parseFloat(aw.used_amount ?? aw.used_balance ?? distributed - returned);
  const available = ADMIN_LIMIT - distributed + returned;
  const usedPct = ADMIN_LIMIT > 0 ? (distributed / ADMIN_LIMIT) * 100 : 0;
  return { distributed, returned, used, available, usedPct };
};

export default function WalletPage() {
  const { user } = useAuth();
  return user?.role === 'superadmin' ? <AdminWalletView /> : <BMWalletView />;
}

/* ══ ADMIN VIEW ══ */
function AdminWalletView() {
  const [loading,   setLoading]   = useState(true);
  const [data,      setData]      = useState(null);
  const [selBranch, setSelBranch] = useState('');
  const [amount,    setAmount]    = useState('');
  const [desc,      setDesc]      = useState('');
  const [topping,   setTopping]   = useState(false);
  const [amtErr,    setAmtErr]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/api/branches/admin-wallet'),
      api.get('/api/branches/'),
    ]).then(([walletRes, branchRes]) => {
      if (walletRes.status === 'fulfilled') {
        const d = walletRes.value.data.data;
        setData(d);
        if (d?.branch_wallets?.length) setSelBranch(d.branch_wallets[0].branch_id);
      } else if (branchRes.status === 'fulfilled') {
        const bws = (branchRes.value.data.data || []).map(b => ({
          branch_id: b.id, branch_code: b.branch_code, branch_name: b.branch_name,
          current_balance: 0, cash_wallet: 0, is_low_balance: false,
        }));
        setData({ admin_wallet: {}, branch_wallets: bws, transactions: [] });
        if (bws.length) setSelBranch(bws[0].branch_id);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAmountChange = (e) => {
    const val = e.target.value;
    if (!val) { setAmount(''); setAmtErr(''); return; }
    const n = parseFloat(val);
    // FIX 1: Enforce max ₹1,00,00,00,000
    if (n > MAX_TXN) {
      setAmtErr('Maximum amount is ₹1,00,00,00,000');
      setAmount(String(MAX_TXN));
      return;
    }
    if (n <= 0) { setAmtErr('Amount must be positive'); }
    else { setAmtErr(''); }
    setAmount(val);
  };

  const doTopup = async () => {
    if (!selBranch)  return toast.error('Select a branch');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)   return toast.error('Enter valid amount');
    const aw = data?.admin_wallet || {};
    const { available } = calcAdminStats(aw);
    if (amt > MAX_TXN) return toast.error('Max ₹1,00,00,00,000 per transaction');
    if (amt > available) {
      return toast.error(`Insufficient balance. Available: ${fmtIndian(available)}`);
    }
    setTopping(true);
    try {
      const { data: resp } = await api.post(`/api/branches/${selBranch}/topup`, {
        amount: amt, description: desc || 'Admin top-up'
      });
      const topupAt = resp?.data?.topup_at;
      toast.success(
        topupAt
          ? `${fmtIndian(amt)} sent to branch at ${formatIST(topupAt)}`
          : `${fmtIndian(amt)} sent to branch!`
      );
      setAmount(''); setDesc('');
      load();
    } catch(e) {
      toast.error(e.response?.data?.message || 'Top-up failed');
    } finally { setTopping(false); }
  };

  if (loading) return <Loading />;
  const aw = data?.admin_wallet || {};
  const bws = data?.branch_wallets || [];
  const txns = data?.transactions || [];
  const { distributed, used, available, usedPct } = calcAdminStats(aw);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Admin Wallet</h1>
          <p className="text-muted">Global ₹1,00,00,00,000 fund — distribute to branches</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* ── Admin Wallet Hero Card ── */}
      <div className="admin-wallet-hero">
        <div className="awh-left">
          <div className="awh-label">TOTAL ADMIN LIMIT</div>
          <div className="awh-amount">{fmtIndian(ADMIN_LIMIT)}</div>
          <div className="awh-sub">Fixed limit — ₹1,00,00,00,000 (100 Cr)</div>
        </div>
        <div className="awh-divider" />
        <div className="awh-mid">
          <div className="awh-stat">
            <div className="awh-stat-label">Distributed to Branches</div>
            <div className="awh-stat-val red">{fmtCr(distributed)}</div>
          </div>
          <div className="awh-stat">
            <div className="awh-stat-label">Available Balance</div>
            <div className="awh-stat-val green">{fmtIndian(available)}</div>
          </div>
          <div className="awh-stat">
            <div className="awh-stat-label">Currently in Use</div>
            <div className="awh-stat-val blue">{fmtCr(used)}</div>
          </div>
        </div>
        <div className="awh-right">
          <div className="awh-label">USED</div>
          <div className="awh-pct">{usedPct < 0.1 && usedPct > 0 ? '<0.1' : usedPct.toFixed(1)}%</div>
          <div className="awh-bar-bg">
            <div className="awh-bar-fill" style={{ width: `${Math.min(Math.max(usedPct, usedPct > 0 ? 2 : 0), 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="wallet-grid">
        {/* ── Top Up Form ── */}
        <Panel title="Top Up Branch Wallet" subtitle="Transfer funds from admin wallet to branch">
          <Field label="Select Branch" required>
            <Select value={selBranch} onChange={e => setSelBranch(e.target.value)}>
              {bws.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name} ({b.branch_code}) — Balance: {fmtIndian(b.current_balance)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Amount (₹)" required error={amtErr}>
            <Input type="number" value={amount} onChange={onAmountChange}
              placeholder="e.g. 500000" min="1" max={MAX_TXN} />
          </Field>

          <p className="topup-hint">
            Max per transaction: <strong>{fmtIndian(MAX_TXN)}</strong>
          </p>

          <div className="quick-amounts">
            {[100000, 500000, 1000000, 5000000, 10000000, 50000000].map(v => (
              <button key={v} type="button" className="qa-btn" onClick={() => { setAmount(String(v)); setAmtErr(''); }}>
                {fmtCr(v)}
              </button>
            ))}
          </div>

          <Field label="Description">
            <Input value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="e.g. June 2026 allocation" />
          </Field>

          <button className="btn btn-primary btn-full" onClick={doTopup}
            disabled={topping || !!amtErr || !amount}>
            {topping ? 'Processing...' : '+ Send Funds to Branch'}
          </button>

          <div className="topup-note">
            Admin available: <strong className="text-success">{fmtIndian(available)}</strong>
          </div>
        </Panel>

        <Panel title="Branch Wallet Status" subtitle={`${bws.length} branches`}>
          <div className="branch-wallet-list">
            {bws.length === 0 ? (
              <div className="empty-state">No branches found</div>
            ) : bws.map(b => (
              <div key={b.branch_id} className={`branch-wallet-row${b.is_low_balance ? ' low' : ''}`}>
                <div className="bwr-info">
                  <div className="bwr-name">{b.branch_name}</div>
                  <div className="bwr-code">{b.branch_code}</div>
                </div>
                <div className="bwr-balances">
                  <div className="bwr-bal">
                    <span className="bwr-bal-label">Current</span>
                    <span className={`bwr-bal-val${b.is_low_balance ? ' red' : ''}`}>{fmtIndian(b.current_balance)}</span>
                  </div>
                  <div className="bwr-bal">
                    <span className="bwr-bal-label">Cash</span>
                    <span className="bwr-bal-val blue">{fmtIndian(b.cash_wallet)}</span>
                  </div>
                </div>
                {b.is_low_balance && <span className="bwr-low-badge">⚠️ Low</span>}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Transaction History ── */}
      <Panel title="Transaction History" subtitle="All top-ups and deductions across branches" className="mt-3">
        {txns.length === 0 ? (
          <div className="empty-state">No transactions yet</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Date & Time (IST)</th><th>Branch</th>
                <th>Type</th><th>Amount</th><th>Description</th>
                <th>Balance After</th><th>Cash Wallet</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t, i) => (
                <tr key={t.id}>
                  <td>{i+1}</td>
                  {/* FIX 3: Correct IST time */}
                  <td style={{fontSize:'0.78rem',fontFamily:'monospace'}}>{formatIST(t.created_at)}</td>
                  <td><strong>{t.branch_name}</strong></td>
                  <td>
                    <span className={`txn-badge ${t.transaction_type?.toLowerCase()}`}>
                      {t.transaction_type}
                    </span>
                  </td>
                  <td>
                    <strong style={{color: t.transaction_type==='TopUp' ? 'var(--success)' : 'var(--danger)'}}>
                      {t.transaction_type==='TopUp' ? '+' : '−'}{fmt(t.amount)}
                    </strong>
                  </td>
                  <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{t.description}</td>
                  <td><strong>{fmt(t.balance_after)}</strong></td>
                  <td>{fmt(t.cash_wallet_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

/* ══ BRANCH MANAGER VIEW ══ */
function BMWalletView() {
  const { user }   = useAuth();
  const branchId   = user?.branch_id;
  const [data,     setData]    = useState(null);
  const [txns,     setTxns]    = useState([]);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    Promise.allSettled([
      api.get(`/api/branches/${branchId}`),
      api.get(`/api/branches/${branchId}/wallet-history`),
    ]).then(([b, h]) => {
      if (b.status==='fulfilled') setData(b.value.data.data?.wallet);
      if (h.status==='fulfilled') setTxns(h.value.data.data?.items || []);
    }).finally(() => setLoading(false));
  }, [branchId]);

  if (loading) return <Loading />;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Branch Wallet</h1>
          <p className="text-muted">Current balance, cash wallet, and transaction history</p>
        </div>
      </div>
      {data && (
        <div className="bm-wallet-cards">
          <div className={`bm-wallet-card dark ${data.is_low_balance ? 'low' : ''}`}>
            <div className="bwc-label">CURRENT BALANCE</div>
            <div className="bwc-amount">{fmtIndian(data.current_balance)}</div>
            <div className="bwc-sub">Admin-assigned spending limit</div>
            {data.is_low_balance && <div className="bwc-alert">⚠️ Low Balance — Contact Admin</div>}
          </div>
          <div className="bm-wallet-card blue">
            <div className="bwc-label">CASH WALLET</div>
            <div className="bwc-amount">{fmtIndian(data.cash_wallet)}</div>
            <div className="bwc-sub">Accumulated from approved plans</div>
          </div>
        </div>
      )}
      <Panel title="Transaction History" className="mt-3">
        {txns.length===0 ? <div className="empty-state">No transactions yet</div> : (
          <table className="data-table">
            <thead>
              <tr><th>Date & Time (IST)</th><th>Type</th><th>Amount</th><th>Description</th><th>Balance After</th><th>Cash</th></tr>
            </thead>
            <tbody>
              {txns.map(t => (
                <tr key={t.id}>
                  <td style={{fontSize:'0.78rem',fontFamily:'monospace'}}>{formatIST(t.created_at)}</td>
                  <td><span className={`txn-badge ${t.transaction_type?.toLowerCase()}`}>{t.transaction_type}</span></td>
                  <td><strong style={{color:t.transaction_type==='TopUp'?'var(--success)':'var(--danger)'}}>
                    {t.transaction_type==='TopUp'?'+':'−'}{fmt(t.amount)}
                  </strong></td>
                  <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{t.description}</td>
                  <td><strong>{fmt(t.balance_after)}</strong></td>
                  <td>{fmt(t.cash_wallet_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}