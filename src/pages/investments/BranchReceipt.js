import React, { useState, useEffect, useRef } from 'react';
import Loading from '../../components/Loading/Loading';
import { investmentService } from '../../services/investmentService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './BranchReceipt.css';

const PRINT_STYLES = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Times New Roman',Times,serif;font-size:12px;color:#111;background:#fff}
  .ir-page{width:190mm;margin:0 auto;padding:12mm 14mm}
  .ir-header{text-align:center;margin-bottom:18px}
  .ir-company{font-size:15px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase}
  .ir-title{font-size:14px;font-weight:700;letter-spacing:1px;margin-top:6px;text-transform:uppercase}
  .ir-top-row{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;font-size:12px}
  .ir-top-row .ir-receipt-no{display:flex;gap:24px;align-items:baseline}
  .ir-grid{width:100%;border-collapse:collapse;margin-bottom:14px}
  .ir-grid td{padding:7px 4px;vertical-align:top;font-size:12px}
  .ir-grid .ir-label{font-weight:400;white-space:nowrap;width:22%}
  .ir-grid .ir-val{font-weight:700;text-transform:uppercase}
  .ir-grid .ir-spacer{width:8%}
  .ir-roi-line{display:flex;align-items:baseline;gap:8px;margin:4px 0 14px;font-size:12px;padding:7px 4px}
  .ir-roi-label{font-weight:400}
  .ir-roi-val{font-weight:700;text-transform:uppercase}
  .ir-remarks{margin:18px 0 28px;font-size:12px;line-height:1.5}
  .ir-remarks-title{font-weight:700;margin-bottom:4px}
  .ir-sigs{display:flex;justify-content:space-between;margin-top:36px;padding-top:8px;font-size:12px;font-weight:700}
  .ir-sig{flex:1;text-align:center;padding-top:48px;border-top:1px solid #111}
  .ir-sig:first-child{margin-right:40px}
  @media print{@page{size:A4 portrait;margin:10mm}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`;

function ReceiptBody({ data }) {
  const isSis = data.plan_type === 'SIS';

  const misRows = [
    ['Investment ID:', data.investment_id, 'Investor ID:', data.investor_id],
    ['Investor Name:', data.investor_name, 'Mobile:', data.mobile],
    ['Plan Name:', data.plan_name, 'Investment Term', data.investment_term],
    ['Status:', data.status_label, 'Final Investment', String(data.final_investment ?? '—')],
    ['Late Fee', String(data.late_fee ?? 0), 'Next due date', data.next_due_date],
    ['Total received', String(data.total_received ?? 0), 'Payment Mode', data.payment_mode],
  ];

  const sisRows = [
    ['Investment ID:', data.investment_id, 'Investor ID:', data.investor_id],
    ['Investor Name:', data.investor_name, 'Mobile:', data.mobile],
    ['Plan Name:', data.plan_name, 'Investment Term', data.investment_term],
    ['Total received', String(data.total_received ?? 0), 'Payment Mode', data.payment_mode],
  ];

  const rows = isSis ? sisRows : misRows;

  return (
    <div className="ir-page">
      <div className="ir-header">
        <div className="ir-company">{data.company_name || 'DEFOEX INTRATECH PRIVATE LIMITED'}</div>
        <div className="ir-title">{data.document_title || 'INVESTMENT RECEIPT'}</div>
      </div>

      <div className="ir-top-row">
        <div>Date: <strong>{data.receipt_date}</strong></div>
        <div className="ir-receipt-no">
          <span>receipt no:</span>
          <strong>{data.receipt_no}</strong>
        </div>
      </div>

      <table className="ir-grid">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="ir-label">{row[0]}</td>
              <td className="ir-val">{row[1] || '—'}</td>
              <td className="ir-spacer" />
              <td className="ir-label">{row[2]}</td>
              <td className="ir-val">{row[3] || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {isSis && (
        <div className="ir-roi-line">
          <span className="ir-roi-label">Return of Investment</span>
          <span className="ir-roi-val">{data.return_of_investment ?? '—'}</span>
        </div>
      )}

      <div className="ir-remarks">
        <div className="ir-remarks-title">Remarks</div>
        <div>{data.remarks}</div>
      </div>

      <div className="ir-sigs">
        <div className="ir-sig">Authorized Signatory</div>
        <div className="ir-sig">Investor Signature</div>
      </div>
    </div>
  );
}

export default function BranchReceipt({ irn, onClose }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef();

  const canPrint = ['branchmanager', 'superadmin'].includes(user?.role);

  useEffect(() => {
    if (!canPrint) {
      setError('Only Branch Manager can print receipts');
      setLoading(false);
      return;
    }
    investmentService.receipt(irn)
      .then(r => setData(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load receipt'))
      .finally(() => setLoading(false));
  }, [irn, canPrint]);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt — ${irn}</title><style>${PRINT_STYLES}</style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
    toast.success('Receipt sent to printer');
  };

  if (!canPrint) {
    return (
      <div className="br-modal-wrap" onClick={onClose}>
        <div className="br-modal br-modal--sm" onClick={e => e.stopPropagation()}>
          <div className="br-denied">
            <div className="br-denied-icon">🔒</div>
            <h3>Access Denied</h3>
            <p>Receipt printing is available for <strong>Branch Manager</strong> only.</p>
            <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="br-modal-wrap">
        <div className="br-modal"><Loading text="Loading receipt..." /></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="br-modal-wrap" onClick={onClose}>
        <div className="br-modal br-modal--sm" onClick={e => e.stopPropagation()}>
          <div className="br-denied">
            <div className="br-denied-icon">⚠️</div>
            <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error || 'Receipt not found'}</p>
            <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="br-modal-wrap" onClick={onClose}>
      <div className="br-modal" onClick={e => e.stopPropagation()}>
        <div className="br-toolbar no-print">
          <div>
            <div className="br-toolbar-title">🧾 Investment Receipt</div>
            <div className="br-toolbar-irn">{irn}</div>
          </div>
          <div className="br-toolbar-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>✕ Close</button>
            <button type="button" className="btn btn-primary" onClick={handlePrint}>🖨️ Print Receipt</button>
          </div>
        </div>

        <div className="br-scroll">
          <div ref={printRef}>
            <ReceiptBody data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
