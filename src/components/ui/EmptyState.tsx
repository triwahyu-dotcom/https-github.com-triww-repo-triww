import React from 'react';

interface EmptyStateProps {
  icon?: string;       /* Tabler icon name */
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', gap: 12,
      color: 'var(--text-muted)',
    }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 32, opacity: 0.4 }} />
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280 }}>{description}</div>}
      {action && (
        <button 
          onClick={action.onClick} 
          style={{ 
            marginTop: 8, 
            fontSize: 13, 
            padding: '6px 16px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
