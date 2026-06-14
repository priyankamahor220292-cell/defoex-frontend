import React from 'react';
import './Alert.css';

export default function Alert({ type = 'info', children, onClose }) {
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
  return (
    <div className={`alert alert--${type}`}>
      <span className="alert__icon">{icons[type]}</span>
      <span className="alert__msg">{children}</span>
      {onClose && <button className="alert__close" onClick={onClose}>✕</button>}
    </div>
  );
}
