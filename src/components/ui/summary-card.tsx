"use client";

import React from "react";

interface SummaryCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
}

export function SummaryCard({ label, value, description, icon }: SummaryCardProps) {
  return (
    <article className="summary-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span>{label}</span>
        {icon && <span style={{ opacity: 0.6 }}>{icon}</span>}
      </div>
      <strong>{value}</strong>
      {description && <small>{description}</small>}
    </article>
  );
}
