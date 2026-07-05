import React, { useState, useEffect, useRef } from 'react';
import Loading from '../../components/Loading/Loading';
import { investmentService } from '../../services/investmentService';
import toast from 'react-hot-toast';
import './BranchReceipt.css';

const fmtNum = (n) => (n || 0).toLocaleString('en-IN');

function ReceiptField({ label, value, italicVal }) {
  return (
    <div className="inv-receipt-field">
      <span className="lbl">{label}:</span>
      <span className={`val${italicVal ? ' roi' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}

function ReceiptBody({ data }) {
  const isSIS = data.plan_type === 'SIS';

  return (
    <div className="inv-receipt-page">
      <div className="inv-receipt-company">{data.company_name || 'DEFOEX INTRATECH PRIVATE LIMITED'}</div>
      <div className="inv-receipt-title">{data.document_title || 'INVESTMENT RECEIPT'}</div>

      <div className="inv-receipt-meta">
        <div><span className="lbl">Date</span>: {data.receipt_date}</div>
        <div><span className="lbl">receipt no</span>: {data.receipt_no}</div>
      </div>

      <div className="inv-receipt-columns">
        {isSIS ? (
          <>
            <div className="inv-receipt-col">
              <ReceiptField label="Investment ID" value={data.investment_id} />
              <ReceiptField label="Investor Name" value={data.investor_name} />
              <ReceiptField label="Plan Name" value={data.plan_name} />
              <ReceiptField label="Total received" value={fmtNum(data.total_received)} />
              <ReceiptField label="Payment Mode" value={data.payment_mode} />
            </div>
            <div className="inv-receipt-col">
              <ReceiptField label="Investor ID" value={data.investor_id} />
              <ReceiptField label="Mobile" value={data.mobile} />
              <div className="inv-receipt-field" style={{ minHeight: '1.6em' }} />
              <ReceiptField label="Return of Investment" value={fmtNum(data.return_of_investment)} italicVal />
              <ReceiptField label="Branch Name" value={data.branch_name} />
            </div>
          </>
        ) : (
          <>
            <div className="inv-receipt-col">
              <ReceiptField label="Investment ID" value={data.investment_id} />
              <ReceiptField label="Investor Name" value={data.investor_name} />
              <ReceiptField label="Plan Name" value={data.plan_name} />
              <ReceiptField label="Status" value={data.status_label} />
              <ReceiptField label="Late Fee" value={fmtNum(data.late_fee ?? 0)} />
              <ReceiptField label="Total received" value={fmtNum(data.total_received)} />
            </div>
            <div className="inv-receipt-col">
              <ReceiptField label="Investor ID" value={data.investor_id} />
              <ReceiptField label="Mobile" value={data.mobile} />
              <ReceiptField label="Investment Term" value={data.investment_term || 'Monthly'} />
              <ReceiptField label="Final Investment" value={fmtNum(data.final_investment)} />
              <ReceiptField label="Next due date" value={data.next_due_date} />
              <ReceiptField label="Payment Mode" value={data.payment_mode} />
            </div>
          </>
        )}
      </div>

      <div className="inv-receipt-remarks">
        <span className="lbl">Remarks</span>
        <p>{data.remarks}</p>
      </div>

      <div className="inv-receipt-sigs">
        <span>Authorized Signatory</span>
        <span>Investor Signature</span>
      </div>
    </div>
  );
}

export default function BranchReceipt({ irn, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef();

  useEffect(() => {
    investmentService.receipt(irn)
      .then(r => setData(r.data.data))
      .catch(e => {
        setError(e.response?.data?.message || 'Failed to load receipt');
        toast.error(e.response?.data?.message || 'Failed to load receipt');
      })
      .finally(() => setLoading(false));
  }, [irn]);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=720,height=900');
    win.document.write(`<!DOCTYPE html>
<html><head>
  <title>Investment Receipt — ${irn}</title>
  <style>
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #fff; }
    .inv-receipt-company { text-align:center; font-size:14px; font-weight:700; color:#2c2c2c; margin-bottom:6px; }
    .inv-receipt-title { text-align:center; font-size:13px; font-weight:600; text-decoration:underline; margin-bottom:24px; }
    .inv-receipt-page { padding: 36px 44px; max-width:640px; margin:0 auto; }
    .inv-receipt-meta { display:flex; justify-content:space-between; margin-bottom:20px; font-size:12px; }
    .lbl { color:#9b2d5c; font-weight:700; font-style:italic; }
    .inv-receipt-columns { display:grid; grid-template-columns:1fr 1fr; gap:0 28px; margin-bottom:24px; }
    .inv-receipt-col { display:flex; flex-direction:column; gap:4px; }
    .inv-receipt-field { font-size:12px; line-height:1.6; }
    .val { color:#333; }
    .val.roi { font-style:italic; }
    .inv-receipt-remarks { margin-bottom:40px; font-size:12px; }
    .inv-receipt-remarks p { margin:4px 0 0; }
    .inv-receipt-sigs { display:flex; justify-content:space-between; margin-top:56px; font-size:12px; }
  </style>
</head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <div className="inv-receipt-wrap" onClick={onClose}>
      <div className="inv-receipt-modal" onClick={e => e.stopPropagation()}>
        <div className="inv-receipt-toolbar no-print">
          <div>
            <strong style={{ color: '#fff' }}>Investment Receipt</strong>
            <code style={{ marginLeft: 10, fontSize: '0.78rem', color: 'var(--accent-light)' }}>{irn}</code>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
            {data && (
              <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>Print Receipt</button>
            )}
          </div>
        </div>

        <div className="inv-receipt-scroll">
          {loading && <Loading />}
          {error && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--danger)' }}>{error}</div>
          )}
          {data && (
            <div ref={printRef}>
              <ReceiptBody data={data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
