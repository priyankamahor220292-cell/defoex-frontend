// InvestmentPlans.jsx — DefOex IntraTech
// Payment: Cash & UPI fields always shown inline — no popup/dialog
// Amount must be multiple of ₹1,000 (min ₹1,000)
// Works for: New MIS Plan | New SIS Plan | MIS Contribution

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BranchReceipt from './BranchReceipt';
import './InvestmentsPage.css';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const validateAmount = (val) => {
  const n = Number(val);
  if (!val || isNaN(n) || n <= 0) return 'Enter a valid amount';
  if (n < 1000)    return 'Minimum amount is ₹1,000';
  if (n % 1000 !== 0) return 'Amount must be a multiple of ₹1,000';
  return null;
};

const validateTxnId = (val) => {
  if (!val || !val.trim()) return 'Transaction ID is required for UPI';
  if (!/^[A-Za-z0-9]{1,35}$/.test(val.trim())) return 'Alphanumeric only, max 35 characters';
  return null;
};

const installmentStatus = (inv) =>
  inv.installment_status ||
  `${inv.installments_paid || 0} of ${inv.total_installments || 0}`;

const triAmount = (inv) =>
  inv.total_received_investment ??
  inv.tri ??
  (inv.installments_paid || 0) * (inv.monthly_amount || 0);

// MIS plan configs
const MIS_PLANS = {
  '3Y': { label: 'MIS 3 Year Plan',  months: 36, roiNum: 7,  roiDen: 6  },
  '5Y': { label: 'MIS 5 Year Plan',  months: 60, roiNum: 4,  roiDen: 3  },
  '7Y': { label: 'MIS 7 Year Plan',  months: 84, roiNum: 19, roiDen: 14 },
};

const UPI_APPS = ['PhonePe', 'Paytm', 'GPay', 'BHIM', 'Other'];

async function fetchMemberDetails(memberId, { setMemberInfo, setFetching }) {
  if (!memberId.trim()) {
    toast.error('Enter Investor ID, Adviser ID, or Login ID');
    return;
  }
  setFetching(true);
  setMemberInfo(null);
  try {
    const r = await api.get('/api/investment-plans/get-investor-details', {
      params: { member_id: memberId.trim().toUpperCase() },
    });
    if (r.data.success) {
      setMemberInfo(r.data.data);
      if (r.data.data.can_create_plan === false) {
        toast.error(r.data.message || 'Cannot create plan for this ID yet', { duration: 6000 });
      } else {
        toast.success(`Found: ${r.data.data.full_name}`);
      }
    }
  } catch (e) {
    const status = e.response?.status;
    const msg = e.response?.data?.message;
    if (status === 401) {
      toast.error(msg || 'Session expired — please sign in again', { duration: 6000 });
    } else {
      toast.error(msg || 'Member not found or not approved', { duration: 6000 });
    }
  } finally {
    setFetching(false);
  }
}

function guardPlanCreation(memberInfo) {
  if (!memberInfo) {
    toast.error('Fetch member details first');
    return false;
  }
  if (memberInfo.can_create_plan === false) {
    toast.error('Register and approve this person as an investor before creating a plan');
    return false;
  }
  return true;
}

// ── Shared: Payment Fields (inline, always visible) ─────────────────────────
// When Cash is selected  → only Cash row is visible
// When UPI is selected   → Transaction ID + UPI App appear below
function PaymentFields({ paymentMode, setPaymentMode, txnId, setTxnId, upiApp, setUpiApp, errors }) {
  return (
    <div className="payment-section">
      <label className="field-label">Payment Mode</label>

      {/* Radio row */}
      <div className="payment-toggle">
        <label className={`toggle-option ${paymentMode === 'Cash' ? 'active' : ''}`}>
          <input
            type="radio"
            name="payment_mode"
            value="Cash"
            checked={paymentMode === 'Cash'}
            onChange={() => setPaymentMode('Cash')}
          />
          <span className="toggle-icon">💵</span>
          <span>Cash</span>
        </label>
        <label className={`toggle-option ${paymentMode === 'UPI' ? 'active' : ''}`}>
          <input
            type="radio"
            name="payment_mode"
            value="UPI"
            checked={paymentMode === 'UPI'}
            onChange={() => setPaymentMode('UPI')}
          />
          <span className="toggle-icon">📱</span>
          <span>UPI</span>
        </label>
      </div>

      {/* UPI extra fields — only shown when UPI selected */}
      {paymentMode === 'UPI' && (
        <div className="upi-fields">
          {/* Transaction ID */}
          <div className="field-group">
            <label className="field-label">
              Transaction ID <span className="required">*</span>
            </label>
            <input
              className={`field-input ${errors?.txnId ? 'field-error' : ''}`}
              type="text"
              placeholder="Enter UPI Transaction ID"
              maxLength={35}
              value={txnId}
              onChange={(e) => setTxnId(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
            />
            <div className="field-hint-row">
              {errors?.txnId
                ? <span className="error-msg">{errors.txnId}</span>
                : <span className="hint-msg">Alphanumeric only, max 35 characters</span>
              }
              <span className="char-count">{txnId.length}/35</span>
            </div>
          </div>

          {/* UPI App selector */}
          <div className="field-group">
            <label className="field-label">
              UPI App <span className="required">*</span>
            </label>
            <div className="upi-app-row">
              {UPI_APPS.map((app) => (
                <button
                  key={app}
                  type="button"
                  className={`upi-chip ${upiApp === app ? 'selected' : ''}`}
                  onClick={() => setUpiApp(app)}
                >
                  {app === 'PhonePe' && '💜 '}
                  {app === 'Paytm'   && '💙 '}
                  {app === 'GPay'    && '💚 '}
                  {app === 'BHIM'    && '🇮🇳 '}
                  {app === 'Other'   && '📱 '}
                  {app}
                </button>
              ))}
            </div>
            {errors?.upiApp && <span className="error-msg">{errors.upiApp}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared: Member Info Card ────────────────────────────────────────────────
function MemberCard({ info }) {
  if (!info) return null;
  const blocked = info.can_create_plan === false;
  return (
    <div className={`member-card ${blocked ? 'member-card-blocked' : ''}`}>
      {blocked && (
        <div className="member-card-warning">
          {info.status === 'pending'
            ? `Investor registration (${info.pending_investor_id || 'pending'}) must be approved before creating a plan.`
            : 'This person is an adviser only — register and approve them as an investor first.'}
        </div>
      )}
      <div className="member-card-row">
        <span>Investor Name</span><strong>{info.full_name}</strong>
      </div>
      {info.father_name && (
        <div className="member-card-row">
          <span>Father's Name</span><strong>{info.father_name}</strong>
        </div>
      )}
      <div className="member-card-row">
        <span>Mobile</span><strong>{info.mobile}</strong>
      </div>
      {info.adviser_name && (
        <div className="member-card-row">
          <span>Adviser</span>
          <strong>{info.adviser_name} <em>({info.adviser_id})</em></strong>
        </div>
      )}
      <div className="member-card-row">
        <span>Status</span>
        <span className={`status-pill status-${info.status}`}>{info.status}</span>
      </div>
    </div>
  );
}

// ── New MIS Plan ────────────────────────────────────────────────────────────
function NewMISPlan() {
  const [memberId,    setMemberId]    = useState('');
  const [memberInfo,  setMemberInfo]  = useState(null);
  const [tenure,      setTenure]      = useState('3Y');
  const [amount,      setAmount]      = useState('');
  const [amtErr,      setAmtErr]      = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [txnId,       setTxnId]       = useState('');
  const [upiApp,      setUpiApp]      = useState('');
  const [upiErrors,   setUpiErrors]   = useState({});
  const [fetching,    setFetching]    = useState(false);
  const [loading,     setLoading]     = useState(false);

  // Plan preview
  const preview = useCallback(() => {
    const n = Number(amount);
    if (!n || n % 1000 !== 0) return null;
    const p = MIS_PLANS[tenure];
    return {
      label:     p.label,
      months:    p.months,
      monthly:   n,
      totalInv:  n * p.months,
      maturity:  Math.round((n * p.months * p.roiNum) / p.roiDen),
    };
  }, [amount, tenure]);

  const getDetails = () =>
    fetchMemberDetails(memberId, { setMemberInfo, setFetching });

  const validateUpi = () => {
    if (paymentMode !== 'UPI') return true;
    const e = {};
    const te = validateTxnId(txnId);
    if (te) e.txnId = te;
    if (!upiApp) e.upiApp = 'Select a UPI App';
    setUpiErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!guardPlanCreation(memberInfo)) return;
    const ae = validateAmount(amount);
    if (ae) { setAmtErr(ae); return; }
    if (!validateUpi()) return;

    setLoading(true);
    try {
      const payload = {
        investor_id:    memberInfo.investor_id,
        plan_tenure:    tenure,
        monthly_amount: Number(amount),
        payment_mode:   paymentMode,
        ...(paymentMode === 'UPI' ? { transaction_id: txnId.trim(), upi_app: upiApp.toLowerCase() } : {}),
      };
      const r = await api.post('/api/investment-plans/create-mis', payload);
      if (r.data.success) {
        const planId = r.data.data?.irn || r.data.data?.plan_id;
        toast.success(planId ? `${r.data.message} Plan ID: ${planId}` : r.data.message);
        setMemberId(''); setMemberInfo(null); setAmount(''); setTenure('3Y');
        setPaymentMode('Cash'); setTxnId(''); setUpiApp(''); setUpiErrors({});
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to create MIS Plan'); }
    finally { setLoading(false); }
  };

  const p = preview();

  return (
    <div className="plan-layout">
      <div className="plan-card">
        <h2 className="card-title">New MIS Plan</h2>

        {/* Member lookup */}
        <div className="field-group">
          <label className="field-label">Investor ID / Adviser ID / Login ID</label>
          <div className="input-btn-row">
            <input
              className="field-input"
              placeholder="e.g. DFX-2026-000002 or DEFAD202605"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && getDetails()}
            />
            <button className="btn-get" onClick={getDetails} disabled={fetching}>
              {fetching ? '...' : 'Get Details'}
            </button>
          </div>
        </div>

        <MemberCard info={memberInfo} />

        {/* Tenure */}
        <div className="field-group">
          <label className="field-label">Plan Tenure</label>
          <div className="tenure-row">
            {Object.entries(MIS_PLANS).map(([key, pl]) => (
              <button
                key={key}
                className={`tenure-btn ${tenure === key ? 'selected' : ''}`}
                onClick={() => setTenure(key)}
              >
                <span className="tenure-key">{key}</span>
                <span className="tenure-sub">{pl.months} months</span>
              </button>
            ))}
          </div>
        </div>

        {/* Monthly amount */}
        <div className="field-group">
          <label className="field-label">Monthly Amount (₹)</label>
          <input
            className={`field-input ${amtErr ? 'field-error' : ''}`}
            type="number"
            placeholder="Enter amount — multiples of ₹1,000"
            step={1000} min={1000}
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setAmtErr(validateAmount(e.target.value) || ''); }}
          />
          {amtErr
            ? <span className="error-msg">{amtErr}</span>
            : amount && !validateAmount(amount) && <span className="ok-msg">✓ {fmtINR(Number(amount))}</span>
          }
        </div>

        {/* Payment — inline, no popup */}
        <PaymentFields
          paymentMode={paymentMode} setPaymentMode={setPaymentMode}
          txnId={txnId}       setTxnId={setTxnId}
          upiApp={upiApp}     setUpiApp={setUpiApp}
          errors={upiErrors}
        />

        <button className="btn-submit" onClick={handleSubmit} disabled={loading || !memberInfo}>
          {loading ? 'Creating Plan...' : 'Create MIS Plan'}
        </button>
      </div>

      {/* Live preview panel */}
      {p && (
        <div className="preview-panel">
          <h3 className="preview-title">Plan Preview</h3>
          <div className="preview-row"><span>Plan</span><strong>{p.label}</strong></div>
          <div className="preview-row"><span>Tenure</span><strong>{tenure} · {p.months} months</strong></div>
          <div className="preview-row"><span>Monthly</span><strong>{fmtINR(p.monthly)}</strong></div>
          <div className="preview-row"><span>Installments</span><strong>{p.months}</strong></div>
          <div className="preview-row"><span>Total Investment</span><strong>{fmtINR(p.totalInv)}</strong></div>
          <div className="preview-row maturity"><span>Return of Investment</span><strong>{fmtINR(p.maturity)}</strong></div>
          {paymentMode === 'UPI' && txnId && (
            <div className="preview-row"><span>Txn ID</span><strong className="mono">{txnId}</strong></div>
          )}
          {paymentMode === 'UPI' && upiApp && (
            <div className="preview-row"><span>UPI App</span><strong>{upiApp}</strong></div>
          )}
        </div>
      )}
    </div>
  );
}

// ── New SIS Plan ────────────────────────────────────────────────────────────
function NewSISPlan() {
  const [memberId,    setMemberId]    = useState('');
  const [memberInfo,  setMemberInfo]  = useState(null);
  const [amount,      setAmount]      = useState('');
  const [amtErr,      setAmtErr]      = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [txnId,       setTxnId]       = useState('');
  const [upiApp,      setUpiApp]      = useState('');
  const [upiErrors,   setUpiErrors]   = useState({});
  const [fetching,    setFetching]    = useState(false);
  const [loading,     setLoading]     = useState(false);

  const getDetails = () =>
    fetchMemberDetails(memberId, { setMemberInfo, setFetching });

  const validateUpi = () => {
    if (paymentMode !== 'UPI') return true;
    const e = {};
    const te = validateTxnId(txnId);
    if (te) e.txnId = te;
    if (!upiApp) e.upiApp = 'Select a UPI App';
    setUpiErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!guardPlanCreation(memberInfo)) return;
    const ae = validateAmount(amount);
    if (ae) { setAmtErr(ae); return; }
    if (!validateUpi()) return;

    setLoading(true);
    try {
      const payload = {
        investor_id:  memberInfo.investor_id,
        lump_amount:  Number(amount),
        payment_mode: paymentMode,
        ...(paymentMode === 'UPI' ? { transaction_id: txnId.trim(), upi_app: upiApp.toLowerCase() } : {}),
      };
      const r = await api.post('/api/investment-plans/create-sis', payload);
      if (r.data.success) {
        const planId = r.data.data?.irn || r.data.data?.plan_id;
        toast.success(planId ? `${r.data.message} Plan ID: ${planId}` : r.data.message);
        setMemberId(''); setMemberInfo(null); setAmount('');
        setPaymentMode('Cash'); setTxnId(''); setUpiApp(''); setUpiErrors({});
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to create SIS Plan'); }
    finally { setLoading(false); }
  };

  const sisMaturity = amount && !validateAmount(amount) ? Number(amount) * 2 : null;

  return (
    <div className="plan-layout">
      <div className="plan-card">
        <h2 className="card-title">New SIS Plan</h2>
        <div className="plan-badge">7.5 Years · Lump Sum · Amount Doubles</div>

        <div className="field-group">
          <label className="field-label">Investor ID / Adviser ID / Login ID</label>
          <div className="input-btn-row">
            <input
              className="field-input"
              placeholder="e.g. DFX-2026-000002 or DEFAD202605"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && getDetails()}
            />
            <button className="btn-get" onClick={getDetails} disabled={fetching}>
              {fetching ? '...' : 'Get Details'}
            </button>
          </div>
        </div>

        <MemberCard info={memberInfo} />

        <div className="field-group">
          <label className="field-label">Lump Sum Amount (₹)</label>
          <input
            className={`field-input ${amtErr ? 'field-error' : ''}`}
            type="number"
            placeholder="Enter amount — multiples of ₹1,000"
            step={1000} min={1000}
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setAmtErr(validateAmount(e.target.value) || ''); }}
          />
          {amtErr
            ? <span className="error-msg">{amtErr}</span>
            : amount && !validateAmount(amount) && <span className="ok-msg">✓ {fmtINR(Number(amount))}</span>
          }
        </div>

        <PaymentFields
          paymentMode={paymentMode} setPaymentMode={setPaymentMode}
          txnId={txnId}       setTxnId={setTxnId}
          upiApp={upiApp}     setUpiApp={setUpiApp}
          errors={upiErrors}
        />

        <button className="btn-submit" onClick={handleSubmit} disabled={loading || !memberInfo}>
          {loading ? 'Creating Plan...' : 'Create SIS Plan'}
        </button>
      </div>

      {sisMaturity && (
        <div className="preview-panel">
          <h3 className="preview-title">Plan Preview</h3>
          <div className="preview-row"><span>Plan</span><strong>SIS 7.5 Year</strong></div>
          <div className="preview-row"><span>Tenure</span><strong>7.5 Years · 90 months</strong></div>
          <div className="preview-row"><span>Investment</span><strong>{fmtINR(Number(amount))}</strong></div>
          <div className="preview-row maturity"><span>Return of Investment</span><strong>{fmtINR(sisMaturity)}</strong></div>
          <div className="preview-row"><span>Return</span><strong>100% (Doubles)</strong></div>
          {paymentMode === 'UPI' && txnId && (
            <div className="preview-row"><span>Txn ID</span><strong className="mono">{txnId}</strong></div>
          )}
          {paymentMode === 'UPI' && upiApp && (
            <div className="preview-row"><span>UPI App</span><strong>{upiApp}</strong></div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MIS Contribution ────────────────────────────────────────────────────────
function MISContribution() {
  const [investmentId, setInvestmentId] = useState('');
  const [planInfo,     setPlanInfo]     = useState(null);
  const [paymentMode,  setPaymentMode]  = useState('Cash');
  const [txnId,        setTxnId]        = useState('');
  const [upiApp,       setUpiApp]       = useState('');
  const [upiErrors,    setUpiErrors]    = useState({});
  const [fetching,     setFetching]     = useState(false);
  const [loading,      setLoading]      = useState(false);

  const loadPlan = async () => {
    if (!investmentId.trim()) { toast.error('Enter Investment ID or Investor ID'); return; }
    setFetching(true); setPlanInfo(null);
    try {
      const r = await api.get('/api/investment-plans/list', { params: { per_page: 200 } });
      const search = investmentId.trim().toUpperCase();
      const found = (r.data.data || []).find(
        (inv) =>
          String(inv.id) === search ||
          (inv.irn || inv.plan_id || '').toUpperCase() === search ||
          (inv.investor_id || '').toUpperCase() === search
      );
      if (found) { setPlanInfo(found); toast.success('Plan loaded'); }
      else toast.error('Investment plan not found');
    } catch (e) { toast.error('Failed to load investment'); }
    finally { setFetching(false); }
  };

  const validateUpi = () => {
    if (paymentMode !== 'UPI') return true;
    const e = {};
    const te = validateTxnId(txnId);
    if (te) e.txnId = te;
    if (!upiApp) e.upiApp = 'Select a UPI App';
    setUpiErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!planInfo) { toast.error('Load a plan first'); return; }
    if (!validateUpi()) return;

    setLoading(true);
    try {
      const payload = {
        investment_id: planInfo.id,
        amount:        planInfo.monthly_amount,
        payment_mode:  paymentMode,
        ...(paymentMode === 'UPI' ? { transaction_id: txnId.trim(), upi_app: upiApp.toLowerCase() } : {}),
      };
      const r = await api.post('/api/investment-plans/mis-contribution', payload);
      if (r.data.success) {
        const planId = r.data.data?.irn || r.data.data?.plan_id;
        toast.success(planId ? `${r.data.message} Plan ID: ${planId}` : r.data.message);
        setPaymentMode('Cash'); setTxnId(''); setUpiApp(''); setUpiErrors({});
        loadPlan();
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to record contribution'); }
    finally { setLoading(false); }
  };

  return (
    <div className="plan-layout single">
      <div className="plan-card">
        <h2 className="card-title">MIS Contribution</h2>

        <div className="field-group">
          <label className="field-label">Plan ID (INV…) / Investor ID</label>
          <div className="input-btn-row">
            <input
              className="field-input"
              placeholder="e.g. INV20260001"
              value={investmentId}
              onChange={(e) => setInvestmentId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPlan()}
            />
            <button className="btn-get" onClick={loadPlan} disabled={fetching}>
              {fetching ? '...' : 'Load Plan'}
            </button>
          </div>
        </div>

        {planInfo && (
          <div className="contrib-info">
            <div className="contrib-row"><span>Plan ID</span><strong className="mono">{planInfo.irn || planInfo.plan_id}</strong></div>
            <div className="contrib-row"><span>Plan</span><strong>{planInfo.plan_name}</strong></div>
            <div className="contrib-row"><span>Investor ID</span><strong className="mono">{planInfo.investor_id}</strong></div>
            <div className="contrib-row"><span>Status</span><span className={`status-pill status-${planInfo.status}`}>{planInfo.status}</span></div>
            <div className="contrib-amount-box">
              <span>Installment Amount</span>
              <strong>{fmtINR(planInfo.monthly_amount)}</strong>
            </div>
          </div>
        )}

        {planInfo && (
          <>
            <PaymentFields
              paymentMode={paymentMode} setPaymentMode={setPaymentMode}
              txnId={txnId}       setTxnId={setTxnId}
              upiApp={upiApp}     setUpiApp={setUpiApp}
              errors={upiErrors}
            />

            <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Recording...' : `Pay ${fmtINR(planInfo.monthly_amount)} Installment`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Approve Investment ──────────────────────────────────────────────────────
function ApproveInvestment() {
  const [investments, setInvestments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/investment-plans/list', { params: { status: 'pending', per_page: 100 } });
      setInvestments(r.data.data || []);
    } catch { toast.error('Failed to load pending investments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (id, action) => {
    try {
      const r = await api.post(`/api/investment-plans/approve-investment/${id}`, { action });
      if (r.data.success) { toast.success(r.data.message); fetchPending(); }
    } catch (e) { toast.error(e.response?.data?.message || `Failed to ${action}`); }
  };

  const filtered = investments.filter((inv) =>
    !search ||
    (inv.irn || inv.plan_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (inv.investor_id || '').toLowerCase().includes(search.toLowerCase()) ||
    String(inv.id).includes(search)
  );

  return (
    <div className="approve-tab">
      <div className="tab-top-row">
        <h2 className="card-title">Approve Investment</h2>
        <input
          className="search-input"
          placeholder="Search by Plan ID (INV…) or Investor ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="state-msg">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="state-msg">No pending investments</div>
      ) : (
        <div className="table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>#</th><th>Plan ID</th><th>Investor ID</th><th>Plan</th>
                <th>Monthly</th><th>Total Inv.</th><th title="Total Received Investment">TRI</th><th>Return of Investment</th>
                <th>Status</th><th>Payment</th><th>Txn ID</th><th>UPI App</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={inv.id}>
                  <td>{i + 1}</td>
                  <td className="mono-cell">{inv.irn || inv.plan_id}</td>
                  <td className="mono-cell muted">{inv.investor_id}</td>
                  <td>{inv.plan_name}</td>
                  <td>{fmtINR(inv.monthly_amount)}</td>
                  <td>{fmtINR(inv.total_investment_amount)}</td>
                  <td className="tri-cell">{inv.plan_type === 'MIS' ? fmtINR(triAmount(inv)) : '—'}</td>
                  <td className="maturity-cell">{fmtINR(inv.total_maturity_amount)}</td>
                  <td>
                    {inv.plan_type === 'MIS' ? (
                      <span className="inst-status-pill">{installmentStatus(inv)}</span>
                    ) : (
                      <span className="inst-status-pill muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`pay-badge ${(inv.payment_mode || 'Cash').toLowerCase()}`}>
                      {inv.payment_mode || 'Cash'}
                    </span>
                  </td>
                  <td className="mono-cell small">{inv.transaction_id || '—'}</td>
                  <td>{inv.upi_app || '—'}</td>
                  <td>{inv.investment_date}</td>
                  <td>
                    <div className="action-pair">
                      <button className="btn-approve" onClick={() => handleAction(inv.id, 'approve')}>✓ Approve</button>
                      <button className="btn-reject"  onClick={() => handleAction(inv.id, 'reject')}>✗ Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── All Plans ───────────────────────────────────────────────────────────────
function AllPlans() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [planType,    setPlanType]    = useState('');
  const [status,      setStatus]      = useState('');
  const [receiptIrn,  setReceiptIrn]  = useState(null);
  const canReceipt = ['branchmanager', 'superadmin'].includes(user?.role);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = { per_page: 100 };
      if (planType) params.plan_type = planType;
      if (status)   params.status = status;
      const r = await api.get('/api/investment-plans/list', { params });
      setInvestments(r.data.data || []);
    } catch { toast.error('Failed to load investments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [planType, status]);

  return (
    <div className="approve-tab">
      {receiptIrn && <BranchReceipt irn={receiptIrn} onClose={() => setReceiptIrn(null)} />}
      <div className="tab-top-row">
        <h2 className="card-title">All Plans</h2>
        <div className="filter-row">
          <select className="filter-sel" value={planType} onChange={(e) => setPlanType(e.target.value)}>
            <option value="">All Types</option>
            <option value="MIS">MIS</option>
            <option value="SIS">SIS</option>
          </select>
          <select className="filter-sel" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? <div className="state-msg">Loading…</div> : investments.length === 0 ? (
        <div className="state-msg">No plans found</div>
      ) : (
        <div className="table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>#</th><th>Plan ID</th><th>Investor ID</th><th>Plan</th>
                <th>Monthly</th><th>Total Inv.</th><th title="Total Received Investment">TRI</th><th>Return of Investment</th>
                <th>Payment</th><th>Status</th><th>Approval</th><th>Date</th>
                {canReceipt && <th>Receipt</th>}
              </tr>
            </thead>
            <tbody>
              {investments.map((inv, i) => (
                <tr key={inv.id}>
                  <td>{i + 1}</td>
                  <td className="mono-cell">{inv.irn || inv.plan_id}</td>
                  <td className="mono-cell muted">{inv.investor_id}</td>
                  <td>{inv.plan_name}</td>
                  <td>{fmtINR(inv.monthly_amount)}</td>
                  <td>{fmtINR(inv.total_investment_amount)}</td>
                  <td className="tri-cell">{inv.plan_type === 'MIS' ? fmtINR(triAmount(inv)) : '—'}</td>
                  <td className="maturity-cell">{fmtINR(inv.total_maturity_amount)}</td>
                  <td>
                    <span className={`pay-badge ${(inv.payment_mode || 'Cash').toLowerCase()}`}>
                      {inv.payment_mode || 'Cash'}
                    </span>
                  </td>
                  <td>
                    {inv.plan_type === 'MIS' ? (
                      <span className="inst-status-pill">{installmentStatus(inv)}</span>
                    ) : (
                      <span className="inst-status-pill muted">—</span>
                    )}
                  </td>
                  <td><span className={`status-pill status-${(inv.approval_status || inv.status || '').toLowerCase()}`}>{inv.approval_status || inv.status}</span></td>
                  <td>{inv.investment_date}</td>
                  {canReceipt && (
                    <td>
                      {inv.approval_status === 'Approved' ? (
                        <button type="button" className="btn-receipt" onClick={() => setReceiptIrn(inv.irn || inv.plan_id)}>
                          🧾 Receipt
                        </button>
                      ) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',     label: 'All Plans' },
  { key: 'mis',     label: 'New MIS Plan' },
  { key: 'sis',     label: 'New SIS Plan' },
  { key: 'contrib', label: 'MIS Contribution' },
  { key: 'approve', label: 'Approve Investment' },
];

export default function InvestmentPlans() {
  const [tab, setTab] = useState('mis');

  return (
    <div className="inv-page">
      <div className="page-head">
        <h1 className="page-title">Investment Plans</h1>
        <p className="page-sub">MIS / SIS plan management</p>
      </div>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {tab === 'all'     && <AllPlans />}
        {tab === 'mis'     && <NewMISPlan />}
        {tab === 'sis'     && <NewSISPlan />}
        {tab === 'contrib' && <MISContribution />}
        {tab === 'approve' && <ApproveInvestment />}
      </div>
    </div>
  );
}