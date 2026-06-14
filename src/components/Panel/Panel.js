import React from 'react';
import './Panel.css';

export default function Panel({ title, subtitle, children, actions, className = '' }) {
  return (
    <div className={`panel ${className}`}>
      {(title || actions) && (
        <div className="panel__header">
          <div>
            {title && <h3 className="panel__title">{title}</h3>}
            {subtitle && <p className="panel__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="panel__actions">{actions}</div>}
        </div>
      )}
      <div className="panel__body">{children}</div>
    </div>
  );
}
