import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import Loading from '../../components/Loading/Loading';
import AppLogo from '../../components/AppLogo/AppLogo';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './PrintReceipt.css';

export default function PrintReceipt({ irn, onClose }) {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const printRef = useRef();

  // ONLY SUPERADMIN can print the bond
  const canPrint = user?.role === 'superadmin';

  useEffect(() => {
    if (!canPrint) {
      setError('ACCESS DENIED');
      setLoading(false);
      return;
    }
    api.get(`/api/investment-plans/receipt/${irn}`)
      .then(r => setData(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load bond'))
      .finally(() => setLoading(false));
  }, [irn, canPrint]);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=750');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Investment Bond — ${irn}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Times New Roman',serif;font-size:11px;color:#0d1b3e;background:#fff}
    .bond-page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm;position:relative}
    /* Outer border frame */
    .bond-frame{
      border:4px double #0d47a1;
      border-radius:4px;
      padding:10mm 12mm;
      min-height:270mm;
      position:relative;
    }
    .bond-frame::before{
      content:'';position:absolute;inset:5px;
      border:1px solid #0d47a1;
      border-radius:2px;pointer-events:none;
    }
    /* Header */
    .bond-header{text-align:center;border-bottom:2px solid #0d47a1;padding-bottom:8px;margin-bottom:10px}
    .bh-logo-row{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:6px}
    .bh-logo{width:44px;height:44px;object-fit:contain}
    .bh-company{font-size:17px;font-weight:900;color:#0d47a1;letter-spacing:1px;font-family:Arial,sans-serif}
    .bh-cin{font-size:8px;color:#546e7a;font-family:Arial,sans-serif}
    .bond-title{font-size:14px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#0d47a1;margin:6px 0 2px;font-family:Arial,sans-serif}
    .bond-subtitle{font-size:9px;color:#546e7a;letter-spacing:1px;font-family:Arial,sans-serif}
    /* Bond number row */
    .bond-num-row{display:flex;justify-content:space-between;font-size:9px;color:#546e7a;margin-bottom:10px;font-family:Arial,sans-serif}
    .bond-num-row b{color:#0d47a1}
    /* Sections */
    .section{margin-bottom:10px}
    .section-title{background:#0d47a1;color:#fff;font-size:8.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 8px;font-family:Arial,sans-serif;margin-bottom:0}
    .section-body{border:1px solid #0d47a1;border-top:none;padding:0}
    .row{display:flex;border-bottom:1px solid #e8f0fe}
    .row:last-child{border-bottom:none}
    .cell{padding:4px 8px;font-size:10px;flex:1;font-family:Arial,sans-serif}
    .cell-label{color:#546e7a;font-size:9px;border-right:1px solid #e8f0fe;width:120px;flex:none;background:#f8faff}
    .cell-val{font-weight:600;color:#0d1b3e}
    .cell-val.green{color:#00695c;font-size:12px;font-weight:900}
    .cell-val.blue{color:#0d47a1;font-weight:900}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
    /* Financial highlight */
    .fin-highlight{border:2px solid #0d47a1;border-radius:4px;padding:8px 12px;margin-bottom:10px;background:#f0f4ff}
    .fh-row{display:flex;justify-content:space-between;padding:3px 0;font-family:Arial,sans-serif;font-size:10px;border-bottom:1px dashed #c5cae9}
    .fh-row:last-child{border-bottom:none}
    .fh-label{color:#546e7a}
    .fh-val{font-weight:700;color:#0d1b3e}
    .fh-val.big{font-size:14px;color:#00695c}
    .fh-val.monthly{font-size:12px;color:#0d47a1}
    /* Progress */
    .progress-wrap{margin-bottom:10px;border:1px solid #0d47a1}
    .progress-title{background:#0d47a1;color:#fff;font-size:8.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 8px;font-family:Arial,sans-serif}
    .progress-bar-bg{height:10px;background:#e8f0fe}
    .progress-bar-fill{height:10px;background:linear-gradient(90deg,#0d47a1,#1976d2)}
    .progress-info{display:flex;justify-content:space-between;padding:5px 8px;font-size:9px;color:#546e7a;font-family:Arial,sans-serif}
    /* Declaration */
    .declaration{border:1px solid #0d47a1;padding:8px 10px;margin-bottom:10px;font-size:9px;line-height:1.6;color:#37474f;font-family:Arial,sans-serif}
    .declaration b{color:#0d1b3e}
    /* Signature row */
    .sig-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;padding-top:8px;border-top:2px solid #0d47a1}
    .sig-box{text-align:center;font-size:9px;color:#546e7a;font-family:Arial,sans-serif}
    .sig-line{width:120px;border-bottom:1px solid #546e7a;height:28px;margin:0 auto 4px}
    /* Watermark */
    .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(13,71,161,0.04);white-space:nowrap;pointer-events:none;z-index:0;font-family:Arial,sans-serif}
    /* Footer */
    .bond-footer{text-align:center;margin-top:8px;padding-top:6px;border-top:1px solid #0d47a1;font-size:8px;color:#546e7a;font-family:Arial,sans-serif}
    @media print{
      @page{size:A4 portrait;margin:8mm}
      body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .bond-page{padding:0}
    }
  </style>
</head>
<body>${content}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
    toast.success('Investment Bond sent to printer');
  };

  // ── ACCESS DENIED ──────────────────────────────────────────────
  if (!canPrint) return (
    <div className="receipt-modal-wrap" onClick={onClose}>
      <div className="receipt-modal small" onClick={e => e.stopPropagation()}>
        <div className="access-denied">
          <div className="ad-icon">🔒</div>
          <h3>Admin Only</h3>
          <p>Investment Bond can only be printed by <strong>Super Admin</strong>.</p>
          <p className="ad-role">Your role: <strong>{user?.role}</strong></p>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="receipt-modal-wrap">
      <div className="receipt-modal"><Loading text="Loading Investment Bond..." /></div>
    </div>
  );

  if (error) return (
    <div className="receipt-modal-wrap" onClick={onClose}>
      <div className="receipt-modal small" onClick={e => e.stopPropagation()}>
        <div className="access-denied">
          <div className="ad-icon">⚠️</div>
          <p style={{color:'var(--danger)',marginBottom:16}}>{error}</p>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );

  // ── DATA ────────────────────────────────────────────────────────
  const inv  = data?.investor   || {};
  const plan = data?.investment || {};
  const adv  = data?.adviser    || {};
  const paid = data?.installments_paid      || 0;
  const total= data?.total_installments     || 0;
  const rem  = data?.remaining_installments || 0;
  const pct  = data?.completion_pct         || 0;
  const fmt  = n => `₹${(n || 0).toLocaleString('en-IN')}`;
  const today = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'long', year: 'numeric',
  });
  const tenureLabel = plan.plan_type === 'SIS'
    ? '7.5 Years (90 Months)'
    : plan.plan_tenure === '3Y' ? '3 Years (36 Months)'
    : plan.plan_tenure === '5Y' ? '5 Years (60 Months)'
    : '7 Years (84 Months)';

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="receipt-modal-wrap" onClick={onClose}>
      <div className="receipt-modal bond" onClick={e => e.stopPropagation()}>

        {/* Toolbar */}
        <div className="receipt-toolbar no-print">
          <div className="rt-left">
            <div className="rt-title">📜 Investment Bond</div>
            <div className="rt-irn">{irn}</div>
          </div>
          <div className="rt-actions">
            <span className="admin-badge">👑 Admin Only</span>
            <button className="btn btn-outline btn-sm" onClick={onClose}>✕ Close</button>
            <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print Bond</button>
          </div>
        </div>

        {/* Scrollable bond preview */}
        <div className="receipt-scroll">
          <div ref={printRef}>
            <div className="bond-page">
              <div className="bond-frame">
                <div className="watermark">DEFOEX</div>

                {/* ── HEADER ── */}
                <div className="bond-header">
                  <div className="bh-logo-row">
                    <AppLogo size={44} className="bh-logo" />
                    <div>
                      <div className="bh-company">DEFOEX INFRATECH PVT. LTD.</div>
                      <div className="bh-cin">CIN – U68100MP2026PTC083560</div>
                    </div>
                  </div>
                  <div className="bond-title">Investment Bond</div>
                  <div className="bond-subtitle">Monthly Investment Scheme (MIS) — Certificate of Investment</div>
                </div>

                {/* Bond number + date */}
                <div className="bond-num-row">
                  <span>Bond No: <b>{data?.irn}</b></span>
                  <span>Issue Date: <b>{today}</b></span>
                  <span>Plan: <b>{plan.plan_name}</b></span>
                </div>

                {/* ── TWO COLUMN ── */}
                <div className="two-col">
                  {/* Investor */}
                  <div className="section">
                    <div className="section-title">Investor Details</div>
                    <div className="section-body">
                      {[
                        ['Investor ID',   inv.investor_id],
                        ['Full Name',     inv.full_name],
                        ["Father's Name", inv.father_spouse_name],
                        ['Mobile No.',    inv.mobile],
                        ['Date of Birth', inv.date_of_birth],
                        ['Gender',        inv.gender],
                        ['City',          inv.corr_city],
                        ['State',         inv.corr_state],
                        ['Aadhar No.',    inv.aadhar_number
                          ? `XXXX-XXXX-${inv.aadhar_number.slice(-4)}`
                          : '—'],
                        ['PAN No.',       inv.pan_number || '—'],
                      ].map(([k,v]) => (
                        <div key={k} className="row">
                          <div className="cell cell-label">{k}</div>
                          <div className="cell cell-val">{v || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nominee + Adviser */}
                  <div>
                    <div className="section" style={{marginBottom:8}}>
                      <div className="section-title">Nominee Details</div>
                      <div className="section-body">
                        {[
                          ['Nominee Name',  inv.nominee_name],
                          ['Relationship',  inv.nominee_relationship],
                          ['Nominee Age',   inv.nominee_age],
                        ].map(([k,v]) => (
                          <div key={k} className="row">
                            <div className="cell cell-label">{k}</div>
                            <div className="cell cell-val">{v || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="section">
                      <div className="section-title">Adviser Details</div>
                      <div className="section-body">
                        {[
                          ['Adviser ID',   adv.adviser_code || inv.adviser_code],
                          ['Adviser Name', adv.full_name],
                          ['Rank',         adv.rank_name],
                          ['Mobile',       adv.mobile],
                        ].map(([k,v]) => (
                          <div key={k} className="row">
                            <div className="cell cell-label">{k}</div>
                            <div className="cell cell-val">{v || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── FINANCIAL HIGHLIGHT ── */}
                <div className="fin-highlight">
                  <div className="fh-row">
                    <span className="fh-label">Plan Tenure</span>
                    <span className="fh-val">{tenureLabel}</span>
                  </div>
                  <div className="fh-row">
                    <span className="fh-label">Investment Date</span>
                    <span className="fh-val">{plan.investment_date}</span>
                  </div>
                  <div className="fh-row">
                    <span className="fh-label">Return of Investment Date</span>
                    <span className="fh-val">{plan.maturity_date}</span>
                  </div>
                  <div className="fh-row">
                    <span className="fh-label">Monthly Installment</span>
                    <span className="fh-val monthly">{fmt(plan.monthly_amount)}</span>
                  </div>
                  <div className="fh-row">
                    <span className="fh-label">Total Investment Amount</span>
                    <span className="fh-val">{fmt(plan.total_investment_amount)}</span>
                  </div>
                  <div className="fh-row">
                    <span className="fh-label">ROI ({plan.roi_display || `${plan.roi_percentage}%`})</span>
                    <span className="fh-val">{fmt((plan.total_maturity_amount || 0) - (plan.total_investment_amount || 0))} profit</span>
                  </div>
                  <div className="fh-row">
                    <span className="fh-label">🏆 Total Return of Investment</span>
                    <span className="fh-val big">{fmt(plan.total_maturity_amount)}</span>
                  </div>
                </div>

                {/* ── PROGRESS ── */}
                <div className="progress-wrap">
                  <div className="progress-title">Payment Progress</div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{width:`${Math.max(pct,2)}%`}} />
                  </div>
                  <div className="progress-info">
                    <span><b>{paid}</b> installments paid</span>
                    <span style={{color:'#0d47a1',fontWeight:700}}>{pct}% Complete</span>
                    <span><b>{rem}</b> remaining</span>
                    <span>Next due: <b>{plan.due_date}</b></span>
                  </div>
                </div>

                {/* ── DECLARATION ── */}
                <div className="declaration">
                  <b>Declaration:</b> This Investment Bond certifies that <b>{inv.full_name}</b> (Investor ID: <b>{inv.investor_id}</b>) has enrolled
                  in the Monthly Investment Scheme (MIS) of DefOex Infratech Pvt. Ltd. under Plan <b>{plan.plan_name}</b> for a tenure of <b>{tenureLabel}</b>.
                  The investor agrees to pay <b>{fmt(plan.monthly_amount)}</b> per month for the entire plan duration.
                  Upon completion of all <b>{total}</b> installments, the return of investment of <b>{fmt(plan.total_maturity_amount)}</b> shall be
                  payable to the investor or nominee as per company terms and conditions.
                  This bond is issued under the authority of DefOex Infratech Pvt. Ltd. and is valid only with the authorised signature.
                </div>

                {/* ── SIGNATURES ── */}
                <div className="sig-row">
                  <div className="sig-box">
                    <div className="sig-line"></div>
                    <div><b>Investor Signature</b></div>
                    <div>{inv.full_name}</div>
                  </div>
                  <div className="sig-box">
                    <div className="sig-line"></div>
                    <div><b>Adviser Signature</b></div>
                    <div>{adv.full_name || '—'}</div>
                  </div>
                  <div className="sig-box">
                    <div className="sig-line"></div>
                    <div><b>Sign. Authority</b></div>
                    <div>DefOex Infratech Pvt. Ltd.</div>
                  </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="bond-footer">
                  "Defoex : Together We Build, Together We Grow..."&nbsp;&nbsp;|&nbsp;&nbsp;
                  CIN – U68100MP2026PTC083560&nbsp;&nbsp;|&nbsp;&nbsp;
                  This bond is computer generated and valid without physical stamp.
                </div>

              </div>{/* bond-frame */}
            </div>{/* bond-page */}
          </div>
        </div>{/* receipt-scroll */}
      </div>{/* receipt-modal */}
    </div>
  );
}