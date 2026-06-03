import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: string | React.ReactNode;          /* Tabler icon name or ReactNode icon */
  valueColor?: string;    /* override for accent color on value */
}

export function MetricCard({ label, value, subtitle, icon, valueColor }: MetricCardProps) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--padding-card)',
      position: 'relative',
      minWidth: 0,
    }}>
      {icon && (
        typeof icon === 'string' ? (
          <i className={`ti ti-${icon}`} style={{
            position: 'absolute', top: 14, right: 14,
            fontSize: 16, color: 'var(--text-hint)'
          }} />
        ) : (
          <div style={{
            position: 'absolute', top: 14, right: 14,
            color: 'var(--text-hint)'
          }}>
            {icon}
          </div>
        )
      )}
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, color: valueColor ?? 'var(--text-primary)', marginBottom: subtitle ? 4 : 0 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>
      )}
    </div>
  );
}
