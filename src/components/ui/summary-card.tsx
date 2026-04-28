"use client";

import React from "react";

interface SummaryCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
}

export function SummaryCard({ label, value, description, icon, trend, trendType = 'neutral' }: { label: string; value: string; description?: string; icon?: React.ReactNode; trend?: string; trendType?: 'up' | 'down' | 'neutral' }) {
  return (
    <article style={{ 
      background: '#1f1f23', 
      border: '0.5px solid rgba(255,255,255,0.08)', 
      borderRadius: '12px', 
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
        {icon && <span style={{ color: '#378ADD', opacity: 0.8 }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <strong style={{ fontSize: '20px', fontWeight: 600, color: '#f4f4f5' }}>{value}</strong>
        {trend && (
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 500,
            color: trendType === 'up' ? '#97C459' : trendType === 'down' ? '#F09595' : '#71717a',
            background: trendType === 'up' ? 'rgba(151,196,89,0.1)' : trendType === 'down' ? 'rgba(240,149,149,0.1)' : 'transparent',
            padding: trendType === 'neutral' ? '0' : '2px 6px',
            borderRadius: '4px'
          }}>
            {trend}
          </span>
        )}
      </div>
      {description && <small style={{ fontSize: '12px', color: '#52525b' }}>{description}</small>}
    </article>
  );
}
