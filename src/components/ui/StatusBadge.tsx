import React from 'react';

export type StatusBadgeVariant = 
  | 'new' | 'approved' | 'monitoring' | 'overdue' | 'locked' | 'negotiation' | 'pitching' | 'submitted' | 'done'
  | 'lead' | 'execution' | 'reporting' | 'finance' | 'completed' | 'lost' | 'cancelled'
  | 'active' | 'inactive';

const STATUS_CONFIG: Record<StatusBadgeVariant, { label: string; color: string }> = {
  new:         { label: 'Baru',             color: '#58A6FF' },
  approved:    { label: 'Disetujui',        color: '#3FB950' },
  monitoring:  { label: 'Perlu Monitoring', color: '#D29922' },
  overdue:     { label: 'Overdue',          color: '#F85149' },
  locked:      { label: 'Terkunci',         color: '#8B949E' },
  negotiation: { label: 'Negotiation',      color: '#378ADD' },
  pitching:    { label: 'Pitching',         color: '#a78bfa' },
  submitted:   { label: 'Submitted',        color: '#7F77DD' },
  done:        { label: 'Done',             color: '#3FB950' },
  
  // Project workflow stages
  lead:        { label: 'Lead / Prospect',  color: '#a78bfa' },
  execution:   { label: 'Execution',        color: '#97C459' },
  reporting:   { label: 'Reporting',        color: '#EF9F27' },
  finance:     { label: 'Finance / Billing',color: '#EF9F27' },
  completed:   { label: 'Completed',        color: '#5DCAA5' },
  lost:        { label: 'Lost',             color: '#F85149' },
  cancelled:   { label: 'Cancelled',        color: '#8B949E' },

  // CRM client statuses
  active:      { label: 'Active',           color: '#3FB950' },
  inactive:    { label: 'Inactive',         color: '#8B949E' },
};

export function StatusBadge({ variant }: { variant: StatusBadgeVariant | string }) {
  const norm = (variant || '').toLowerCase().trim();
  let key: StatusBadgeVariant = 'new';
  
  if (norm === 'baru' || norm === 'new') key = 'new';
  else if (norm === 'disetujui' || norm === 'approved') key = 'approved';
  else if (norm === 'perlu monitoring' || norm === 'monitoring') key = 'monitoring';
  else if (norm === 'overdue') key = 'overdue';
  else if (norm === 'terkunci' || norm === 'locked') key = 'locked';
  else if (norm === 'negotiation' || norm === 'negotiating') key = 'negotiation';
  else if (norm === 'pitching') key = 'pitching';
  else if (norm === 'submitted' || norm === 'submit') key = 'submitted';
  else if (norm === 'done' || norm === 'selesai') key = 'done';
  else if (norm === 'lead' || norm === 'prospect') key = 'lead';
  else if (norm === 'execution') key = 'execution';
  else if (norm === 'reporting') key = 'reporting';
  else if (norm === 'finance') key = 'finance';
  else if (norm === 'completed') key = 'completed';
  else if (norm === 'lost') key = 'lost';
  else if (norm === 'cancelled') key = 'cancelled';
  else if (norm === 'active' || norm === 'active_client') key = 'active';
  else if (norm === 'inactive') key = 'inactive';
  else if (norm in STATUS_CONFIG) {
    key = norm as StatusBadgeVariant;
  }

  const config = STATUS_CONFIG[key] || STATUS_CONFIG.new;
  const label = config.label;
  const color = config.color;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 'var(--radius-sm)',
      fontSize: 11,
      fontWeight: 500,
      color,
      background: `${color}26`,       /* 15% opacity */
      border: `1px solid ${color}4D`, /* 30% opacity */
      whiteSpace: 'nowrap',
    }}>
      ● {label}
    </span>
  );
}
