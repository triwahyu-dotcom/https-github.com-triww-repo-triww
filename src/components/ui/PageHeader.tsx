import React from 'react';

interface PageHeaderProps {
  breadcrumb?: string[];        /* e.g. ['Finance & RFP', 'Monitoring'] */
  title: string;
  statusBadge?: string;         /* e.g. 'Database Ready' — shown next to title */
  actions?: React.ReactNode;    /* right side — CTA buttons */
}

export function PageHeader({ breadcrumb, title, statusBadge, actions }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 'var(--gap-section)' }}>
      {breadcrumb && breadcrumb.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {breadcrumb.join(' → ')}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>{title}</h1>
          {statusBadge && (
            <span style={{
              fontSize: 10, fontWeight: 500, padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(63,185,80,0.15)',
              color: '#3FB950',
              border: '1px solid rgba(63,185,80,0.3)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              {statusBadge}
            </span>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
      </div>
    </div>
  );
}
