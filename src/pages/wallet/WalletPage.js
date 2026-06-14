import React, { useState, useEffect } from 'react';
import Panel from '../../components/Panel/Panel';
import Field, { Input } from '../../components/Field/Field';
import Loading from '../../components/Loading/Loading';
import { walletService } from '../../services/walletService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './WalletPage.css';

export default function WalletPage() {
  const { user, wallet } = useAuth();
  const branchId = user?.branch_id;
  const [history, setHistory] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [topupAmt, setTopupAmt] = useState('');
  const [topupDesc, setTopupDesc] = useState('');
  const [topping, setTopping] = useState(false);

  const loadHistory = () => {
    if (!branchId) return;
    setLoading(true);
    walletService.history(branchId).then(r => setHistory(r.data.data || {})).finally(() => setLoading(false));
  };
  useEffect(() => { loadHistory(); }, [branchId]);

  const doTopup = async () => {
    if (!topupAmt || parseFloat(topupAmt) <= 0) return toast.error('Enter valid amount');
    setTopping(true);
    try {
      await walletService.topup(branchId, { amount: parseFloat(topupAmt), description: topupDesc });
      toast.success('Top-up successful!');
      setTopupAmt(''); setTopupDesc('');
      loadHistory();
    } catch (e) { toast.error(e.response?.data?.message || 'Top-up failed'); }
    finally { setTopping(false); }
  };

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;

  return (
    <div className="page-enter">
      <div className="page-header"><h1>Branch Wallet</h1></div>

      {wallet && (
        <div className="wallet-header-cards">
          <div className={`whc-card ${wallet.is_low_balance ? 'low' : ''}`}>
            <div className="whc-label">Current Balance</div>
            <div className="whc-amount">{fmt(wallet.current_balance)}</div>
            <div className="whc-sub">Admin-assigned investment limit</div>
            {wallet.is_low_balance && <div className="whc-alert">⚠️ LOW BALANCE — Request Top-Up</div>}
          </div>
          <div className="whc-card accent">
            <div className="whc-label">Cash Wallet</div>
            <div className="whc-amount">{fmt(wallet.cash_wallet)}</div>
            <div className="whc-sub">Accumulated from approved plans</div>
          </div>
        </div>
      )}

      {/* Top-up form — superadmin only */}
      {user?.role === 'superadmin' && (
        <Panel title="Top-Up Branch Wallet" className="mt-3">
          <div className="topup-form">
            <Field label="Top-Up Amount (₹)" required>
              <Input type="number" value={topupAmt} onChange={e => setTopupAmt(e.target.value)} placeholder="Enter amount" />
            </Field>
            <Field label="Description">
              <Input value={topupDesc} onChange={e => setTopupDesc(e.target.value)} placeholder="Optional note" />
            </Field>
            <button className="btn btn-primary" onClick={doTopup} disabled={topping}>
              {topping ? 'Processing...' : '+ Add Funds'}
            </button>
          </div>
        </Panel>
      )}

      <Panel title="Wallet Transaction History" className="mt-3">
        {loading ? <Loading /> : (
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th><th>Balance After</th><th>Cash Wallet</th></tr>
            </thead>
            <tbody>
              {history.items?.map(t => (
                <tr key={t.id}>
                  <td>{t.created_at?.split('T')[0]}</td>
                  <td><span className={`txn-type ${t.transaction_type.toLowerCase()}`}>{t.transaction_type}</span></td>
                  <td className={t.transaction_type === 'Deduction' ? 'text-danger' : 'text-success'}>
                    {t.transaction_type === 'Deduction' ? '-' : '+'}{fmt(t.amount)}
                  </td>
                  <td>{t.description}</td>
                  <td><strong>{fmt(t.balance_after)}</strong></td>
                  <td>{fmt(t.cash_wallet_after)}</td>
                </tr>
              ))}
              {!history.items?.length && (
                <tr><td colSpan={6} className="text-center text-muted" style={{padding:'32px'}}>No transactions</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
