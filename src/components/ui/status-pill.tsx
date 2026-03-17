"use client";

import React from "react";

export type StatusTone = "green" | "amber" | "red" | "blue" | "slate" | "purple";

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

export function StatusPill({ label, tone = "slate" }: StatusPillProps) {
  const toneClass = `tone-${tone}`;
  
  return (
    <span className={`status-pill ${toneClass}`}>
      {label}
    </span>
  );
}
