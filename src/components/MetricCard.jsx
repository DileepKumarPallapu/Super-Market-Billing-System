import React from 'react';

export default function MetricCard({ title, value, subtitle, icon: Icon, color = 'var(--primary)', onClick }) {
  return (
    <div
      className={`metric-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
      title={onClick ? `Open ${title}` : undefined}
    >
      <div className="metric-top">
        <span className="metric-title">{title}</span>
        <div className="metric-icon-wrap" style={{ color }}>
          {Icon && <Icon size={20} />}
        </div>
      </div>
      <div className="metric-val">{value}</div>
      {subtitle && <div className="metric-sub">{subtitle}</div>}
    </div>
  );
}
