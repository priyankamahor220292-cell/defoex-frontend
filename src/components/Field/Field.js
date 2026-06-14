import React from 'react';
import './Field.css';

export default function Field({ label, required, error, children, className = '' }) {
  return (
    <div className={`field ${className} ${error ? 'field--error' : ''}`}>
      {label && (
        <label className="field__label">
          {label}
          {required && <span className="field__req">*</span>}
        </label>
      )}
      {children}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`form-input ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`form-input ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`form-input form-textarea ${className}`} {...props} />;
}
