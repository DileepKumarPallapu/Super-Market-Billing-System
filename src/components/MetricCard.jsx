import React from 'react';

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'var(--brand-primary)',
  onClick,
  badge,
  badgeType = 'neutral'
}) {
  return (
    <div
      className={`metric-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      title={onClick ? `Open ${title}` : undefined}
      style={{ '--card-accent': color }}
    >
      <div className="metric-top">
        <span className="metric-title">{title}</span>
        <div className="metric-icon-wrap" style={{ color }}>
          {Icon && <Icon size={20} />}
        </div>
      </div>
      <div className="metric-val">{value}</div>
      <div className="metric-bottom-row">
        {subtitle && <span className="metric-sub">{subtitle}</span>}
        {badge && (
          <span className={`metric-badge badge-${badgeType}`}>{badge}</span>
        )}
      </div>
    </div>
  );
}
