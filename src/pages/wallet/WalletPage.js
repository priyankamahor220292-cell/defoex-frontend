import React, { useState, useEffect, useCallback } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input, Select } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import Alert from '../../components/Alert/Alert';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './WalletPage.css';

const CR  = 1_00_00_000;  // 1 Crore
const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`;
const fmtCr = n => {
  if (!n) return '₹0';
  if (n >= CR) return `₹${(n / CR).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return fmt(n);
};

export default function WalletPage() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'superadmin';
  const isBM      = user?.role === 'branchmanager';

  return isAdmin ? <AdminWalletView /> : <BMWalletView />;
}

/* ══════════════════════════════════════════════
   SUPERADMIN VIEW — ₹100 Crore wallet panel
══════════════════════════════════════════════ */
function AdminWalletView() {
  const [loading, setLoading]   = useState(true);
  const [data, setData]         = useState(null);
  const [selBranch, setSelBranch] = useState('');
  const [amount, setAmount]     = useState('');
  const [desc, setDesc]         = useState('');
  const [topping, setTopping]   = useState(false);

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
      } else {
        // admin-wallet failed — still show branches from /api/branches/
        if (branchRes.status === 'fulfilled') {
          const bws = (branchRes.value.data.data || []).map(b => ({
            branch_id: b.id, branch_code: b.branch_code, branch_name: b.branch_name,
            current_balance: b.wallet?.current_balance || 0,
            cash_wallet: b.wallet?.cash_wallet || 0, is_low_balance: false,
          }));
          setData({ admin_wallet: null, branch_wallets: bws, transactions: [] });
          if (bws.length) setSelBranch(bws[0].branch_id);
        }
        toast.error('Admin wallet loading — may need setup');
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const doTopup = async () => {
    if (!selBranch) return toast.error('Select a branch');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error('Enter valid amount');
    setTopping(true);
    try {
      const { data: r } = await api.post(`/api/branches/${selBranch}/topup`, {
        amount: amt, description: desc || 'Admin top-up'
      });
      toast.success(`₹${amt.toLocaleString('en-IN')} sent to branch!`);
      setAmount(''); setDesc('');
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Top-up failed'); }
    finally { setTopping(false); }
  };

  if (loading) return <Loading />;
  const aw  = data?.admin_wallet || {};
  const bws = data?.branch_wallets || [];
  const txns= data?.transactions || [];

  const usedPct = aw.used_pct || 0;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Admin Wallet</h1>
          <p className="text-muted">Global ₹100 Crore fund — distribute to branches</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* ── Admin Wallet Card ── */}
      <div className="admin-wallet-hero">
        <div className="awh-left">
          <div className="awh-label">TOTAL ADMIN LIMIT</div>
          <div className="awh-amount">{fmtCr(aw.total_limit)}</div>
          <div className="awh-sub">Fixed limit — ₹100,00,00,000</div>
        </div>
        <div className="awh-divider" />
        <div className="awh-mid">
          <div className="awh-stat">
            <div className="awh-stat-label">Distributed to Branches</div>
            <div className="awh-stat-val red">{fmtCr(aw.total_distributed)}</div>
          </div>
          <div className="awh-stat">
            <div className="awh-stat-label">Available Balance</div>
            <div className="awh-stat-val green">{fmtCr(aw.available_balance)}</div>
          </div>
          <div className="awh-stat">
            <div className="awh-stat-label">Currently in Use</div>
            <div className="awh-stat-val blue">{fmtCr(aw.used_amount)}</div>
          </div>
        </div>
        <div className="awh-right">
          <div className="awh-label">USED</div>
          <div className="awh-pct">{usedPct.toFixed(1)}%</div>
          <div className="awh-bar-bg">
            <div className="awh-bar-fill" style={{width:`${Math.min(usedPct,100)}%`}} />
          </div>
          {aw.is_low_balance && (
            <div className="awh-alert">⚠️ Low Balance Alert</div>
          )}
        </div>
      </div>

      <div className="wallet-grid">
        {/* ── Top Up Form ── */}
        <Panel title="Top Up Branch Wallet" subtitle="Transfer funds from admin wallet to branch">
          <Field label="Select Branch" required>
            <Select value={selBranch} onChange={e => setSelBranch(e.target.value)}>
              {bws.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name} ({b.branch_code}) — Balance: {fmtCr(b.current_balance)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (₹)" required>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 500000" autoFocus />
          </Field>
          <div className="quick-amounts">
            {[100000,500000,1000000,5000000,10000000].map(v => (
              <button key={v} className="qa-btn" onClick={() => setAmount(v)}>
                {fmtCr(v)}
              </button>
            ))}
          </div>
          <Field label="Description">
            <Input value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="e.g. June 2026 allocation" />
          </Field>
          <button className="btn btn-primary btn-full" onClick={doTopup} disabled={topping}>
            {topping ? 'Processing...' : '+ Send Funds to Branch'}
          </button>
          {aw.available_balance > 0 && (
            <div className="topup-note">
              Admin available: <strong>{fmtCr(aw.available_balance)}</strong>
            </div>
          )}
        </Panel>

        {/* ── Branch Wallets Summary ── */}
        <Panel title="Branch Wallet Status">
          {bws.map(b => (
            <div key={b.branch_id} className={`branch-wallet-row ${b.is_low_balance ? 'low' : ''}`}>
              <div className="bwr-info">
                <div className="bwr-name">{b.branch_name}</div>
                <div className="bwr-code">{b.branch_code}</div>
              </div>
              <div className="bwr-balances">
                <div className="bwr-bal">
                  <span className="bwr-bal-label">Current</span>
                  <span className={`bwr-bal-val ${b.is_low_balance ? 'red' : ''}`}>{fmtCr(b.current_balance)}</span>
                </div>
                <div className="bwr-bal">
                  <span className="bwr-bal-label">Cash</span>
                  <span className="bwr-bal-val blue">{fmtCr(b.cash_wallet)}</span>
                </div>

              </div>
              {b.is_low_balance && <div className="bwr-low">⚠️ Low</div>}
            </div>
          ))}
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
                <th>#</th>
                <th>Date & Time</th>
                <th>Branch</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Balance After</th>
                <th>Cash Wallet</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t, i) => (
                <tr key={t.id}>
                  <td>{i+1}</td>
                  <td style={{fontSize:'0.78rem'}}>{t.created_at?.replace('T',' ').slice(0,16)}</td>
                  <td><strong>{t.branch_name}</strong></td>
                  <td>
                    <span className={`txn-badge ${t.transaction_type?.toLowerCase()}`}>
                      {t.transaction_type}
                    </span>
                  </td>
                  <td>
                    <strong className={t.transaction_type === 'TopUp' ? 'text-success' : 'text-danger'}>
                      {t.transaction_type === 'TopUp' ? '+' : '−'}{fmt(t.amount)}
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

/* ══════════════════════════════════════════════
   BRANCH MANAGER VIEW
══════════════════════════════════════════════ */
function BMWalletView() {
  const { user }  = useAuth();
  const branchId  = user?.branch_id;
  const [data, setData]   = useState(null);
  const [txns, setTxns]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    Promise.allSettled([
      api.get(`/api/branches/${branchId}`),
      api.get(`/api/branches/${branchId}/wallet-history`),
    ]).then(([b, h]) => {
      if (b.status === 'fulfilled') setData(b.value.data.data?.wallet);
      if (h.status === 'fulfilled') setTxns(h.value.data.data?.items || []);
    }).finally(() => setLoading(false));
  }, [branchId]);

  if (loading) return <Loading />;

  return (
    <div className="page-enter">
      <div className="page-header"><h1>Branch Wallet</h1></div>
      {data && (
        <div className="bm-wallet-cards">
          <div className={`bm-wallet-card dark ${data.is_low_balance ? 'low' : ''}`}>
            <div className="bwc-label">CURRENT BALANCE</div>
            <div className="bwc-amount">{fmt(data.current_balance)}</div>
            <div className="bwc-sub">Admin-assigned spending limit</div>
            {data.is_low_balance && <div className="bwc-alert">⚠️ Low Balance — Contact Admin</div>}
          </div>
          <div className="bm-wallet-card blue">
            <div className="bwc-label">CASH WALLET</div>
            <div className="bwc-amount">{fmt(data.cash_wallet)}</div>
            <div className="bwc-sub">Accumulated from approved plans</div>
          </div>

        </div>
      )}
      <Panel title="Transaction History" className="mt-3">
        {txns.length === 0 ? <div className="empty-state">No transactions yet</div> : (
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th><th>Balance After</th><th>Cash Wallet</th></tr>
            </thead>
            <tbody>
              {txns.map(t => (
                <tr key={t.id}>
                  <td style={{fontSize:'0.78rem'}}>{t.created_at?.replace('T',' ').slice(0,16)}</td>
                  <td><span className={`txn-badge ${t.transaction_type?.toLowerCase()}`}>{t.transaction_type}</span></td>
                  <td><strong className={t.transaction_type==='TopUp'?'text-success':'text-danger'}>
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