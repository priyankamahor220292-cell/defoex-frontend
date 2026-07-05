import React from 'react';
import './StatCard.css';

export default function StatCard({ title, value, icon, color = 'primary', subtitle, trend, variant }) {
  const isFeatured = variant === 'featured';

  return (
    <div className={`stat-card stat-card--${color}${isFeatured ? ' stat-card--featured' : ''}`}>
      <div className={`stat-card__body${isFeatured ? ' stat-card__body--featured' : ''}`}>
        {isFeatured && icon && (
          <div className={`stat-card__icon-box stat-card__icon-box--${color}`}>{icon}</div>
        )}
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
        {!isFeatured && icon && <div className="stat-card__icon">{icon}</div>}
      </div>
    </div>
  );
}
