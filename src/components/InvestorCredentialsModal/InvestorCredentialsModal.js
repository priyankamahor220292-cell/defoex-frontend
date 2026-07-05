import React from 'react';
import Modal from '../Modal/Modal';
import toast from 'react-hot-toast';
import './InvestorCredentialsModal.css';

function initials(name) {
  if (!name) return 'IN';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** Centered dialog — username & password after investor approval. */
export default function InvestorCredentialsModal({ creds, onClose }) {
  if (!creds) return null;

  const copy = () => {
    const text = creds.password
      ? `Username: ${creds.username}\nPassword: ${creds.password}`
      : `Username: ${creds.username}`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied!');
  };

  return (
    <Modal
      open={!!creds}
      onClose={onClose}
      title="Investor Account Created!"
      size="sm"
    >
      <div className="investor-cred-modal">
        <div className="investor-cred-celebrate">🎊</div>
        <div className="investor-cred-success">Congratulations Investor Created!</div>

        <div className="investor-cred-header">
          <div className="investor-cred-avatar">{initials(creds.full_name)}</div>
          <div className="investor-cred-info">
            <div className="investor-cred-name">
              {creds.full_name || 'Investor Account'}
            </div>
            {creds.investor_id && (
              <div className="investor-cred-id">{creds.investor_id}</div>
            )}
          </div>
        </div>

        <div className="investor-cred-box">
          <div className="investor-cred-row">
            <span>Username</span>
            <strong>{creds.username}</strong>
          </div>
          <div className="investor-cred-row investor-cred-row--password">
            <span>Password</span>
            <strong>{creds.password || '—'}</strong>
          </div>
        </div>

        {creds.password && (
          <div className="investor-cred-notice">
            10-digit hexadecimal password — share with investor for login. Save now; it cannot be viewed again.
          </div>
        )}

        <div className="investor-cred-actions">
          {creds.password && (
            <button type="button" className="btn btn-outline" onClick={copy}>
              Copy Credentials
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
