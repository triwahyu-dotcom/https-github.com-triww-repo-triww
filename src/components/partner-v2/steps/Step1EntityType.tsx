"use client";

import { Building2, User, Users } from "lucide-react";
import { EntityType } from "@/lib/vendor/types";
import styles from "../styles.module.css";

interface Step1Props {
  value: EntityType | null;
  onChange: (v: EntityType) => void;
}

export function Step1EntityType({ value, onChange }: Step1Props) {
  return (
    <div>
      <h2 className={styles.stepTitle}>Pilih Tipe Entitas</h2>
      <p className={styles.stepDescription}>
        Tentukan apakah Anda mendaftar sebagai perusahaan resmi atau tenaga ahli individu untuk penyesuaian dokumen legalitas.
      </p>

      <div className={styles.grid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <button 
          className={`${styles.card} ${value === "business" ? styles.cardSelected : ""}`}
          onClick={() => onChange("business")}
        >
          <div className={styles.cardIcon}>
            <Building2 size={24} />
          </div>
          <div>
            <span className={styles.cardTitle}>Badan Usaha</span>
            <span className={styles.cardDescription}>Berbentuk badan hukum resmi (PT, CV, UD, dll) dengan dokumen legalitas perusahaan.</span>
          </div>
          <span className={styles.cardBadge}>Business</span>
        </button>

        <button 
          className={`${styles.card} ${value === "eo" ? styles.cardSelected : ""}`}
          onClick={() => onChange("eo")}
        >
          <div className={styles.cardIcon}>
            <Users size={24} />
          </div>
          <div>
            <span className={styles.cardTitle}>EO Partner / Agency</span>
            <span className={styles.cardDescription}>Event organizer partner yang punya tim sendiri untuk kerjasama subkontraktor atau co-production.</span>
          </div>
          <span className={styles.cardBadge}>EO Partner</span>
        </button>

        <button 
          className={`${styles.card} ${value === "individual" ? styles.cardSelected : ""}`}
          onClick={() => onChange("individual")}
        >
          <div className={styles.cardIcon}>
            <User size={24} />
          </div>
          <div>
            <span className={styles.cardTitle}>Perorangan</span>
            <span className={styles.cardDescription}>Profesional independen, tenaga ahli, atau freelancer tanpa badan hukum resmi.</span>
          </div>
          <span className={styles.cardBadge}>Individual</span>
        </button>
      </div>
    </div>
  );
}
