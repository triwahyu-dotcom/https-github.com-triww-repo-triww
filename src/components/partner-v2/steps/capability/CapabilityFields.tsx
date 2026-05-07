"use client";

import React from "react";
import styles from "../../styles.module.css";

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const FormField = ({ label, required, error, helpText, style, children }: FieldProps) => (
  <div className={styles.field} style={style}>
    <label className={styles.label}>
      {label} {required && <span className={styles.requiredStar}>*</span>}
    </label>
    {children}
    {error ? <span className={styles.errorText}>{error}</span> : helpText ? <span className={styles.helperText}>{helpText}</span> : null}
  </div>
);

interface CheckboxGridProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const CheckboxGrid = ({ options, selected, onChange }: CheckboxGridProps) => {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className={styles.checkboxGrid}>
      {options.map(opt => (
        <label key={opt} className={styles.checkItem}>
          <input 
            type="checkbox" 
            checked={selected.includes(opt)} 
            onChange={() => toggle(opt)} 
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
};
