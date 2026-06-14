import React from 'react';
import './StatCard.css';

export default function StatCard({ title, value, icon, color = 'primary', subtitle, trend }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card__body">
        <div className="stat-card__info">
          <div className="stat-card__title">{title}</div>
          <div className="stat-card__value">{value}</div>
          {subtitle && <div className="stat-card__subtitle">{subtitle}</div>}
          {trend !== undefined && (
            <div className={`stat-card__trend ${trend >= 0 ? 'up' : 'down'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
            </div>
          )}
        </div>
        <div className="stat-card__icon">{icon}</div>
      </div>
    </div>
  );
}
