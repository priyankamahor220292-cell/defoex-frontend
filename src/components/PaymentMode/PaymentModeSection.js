import React from 'react';
import Field, { Input } from '../Field/Field';
import './PaymentModeSection.css';

export const UPI_APPS = [
  { id: 'phonepe', label: 'PhonePe', color: '#5f259f' },
  { id: 'paytm',   label: 'Paytm',   color: '#00b9f1' },
  { id: 'gpay',    label: 'GPay',    color: '#34a853' },
  { id: 'bhim',    label: 'BHIM',    color: '#f57c00' },
  { id: 'other',   label: 'Other',   color: '#607d8b' },
];

const TXN_ID_RE = /^[A-Za-z0-9]{1,35}$/;

export function validateUpiPayment(payMode, transactionId, upiApp) {
  if (payMode !== 'UPI') return null;
  const txn = (transactionId || '').trim();
  if (!txn) return 'Transaction ID is required for UPI payment';
  if (!TXN_ID_RE.test(txn)) return 'Transaction ID must be alphanumeric only (max 35 characters)';
  if (!upiApp) return 'Please select a UPI App';
  return null;
}

export default function PaymentModeSection({
  payMode,
  onPayModeChange,
  transactionId = '',
  onTransactionIdChange,
  upiApp = '',
  onUpiAppChange,
}) {
  const txnLen = transactionId.length;

  return (
    <div className="payment-mode-section">
      <Field label="Payment Mode">
        <div className="payment-mode-toggle">
          <button
            type="button"
            className={`payment-mode-btn ${payMode === 'Cash' ? 'active' : ''}`}
            onClick={() => onPayModeChange('Cash')}
          >
            <span className="payment-mode-icon">💵</span>
            Cash
          </button>
          <button
            type="button"
            className={`payment-mode-btn ${payMode === 'UPI' ? 'active' : ''}`}
            onClick={() => onPayModeChange('UPI')}
          >
            <span className="payment-mode-icon">📱</span>
            UPI
          </button>
        </div>
      </Field>

      {payMode === 'UPI' && (
        <div className="upi-details-box">
          <Field label="Transaction ID" required>
            <Input
              value={transactionId}
              onChange={e => onTransactionIdChange(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 35))}
              placeholder="Enter UPI Transaction ID"
              maxLength={35}
              style={{ fontFamily: 'monospace' }}
            />
            <div className="upi-field-hint">
              <span>Alphanumeric only, max 35 characters</span>
              <span className={txnLen >= 35 ? 'upi-char-count warn' : 'upi-char-count'}>{txnLen}/35</span>
            </div>
          </Field>

          <Field label="UPI App" required>
            <div className="upi-app-chips">
              {UPI_APPS.map(app => (
                <button
                  key={app.id}
                  type="button"
                  className={`upi-app-chip ${upiApp === app.id ? 'active' : ''}`}
                  onClick={() => onUpiAppChange(app.id)}
                  style={{ '--chip-color': app.color }}
                >
                  <span className="upi-app-dot" />
                  {app.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}
