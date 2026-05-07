"use client";

import { VendorIntakeV2Payload } from "@/lib/vendor/types";
import { FormField } from "./CapabilityFields";
import styles from "../../styles.module.css";

interface Props {
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function CapCrewIndividual({ formData, onChange, errors }: Props) {
  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 className={styles.stepTitle}>Profil Crew Individu</h2>
      <p className={styles.stepDescription}>Detail spesialisasi dan rate jasa personal Anda.</p>

      <FormField 
        label="Role / Spesialisasi" 
        required 
        error={errors.crewRole}
      >
        <select 
          className={styles.select}
          value={formData.crewRole || ""}
          onChange={(e) => onChange("crewRole", e.target.value)}
        >
          <option value="">-- Pilih --</option>
          {[
            "Floor Manager / Floor Director", "Stage Manager (asisten)", "Liaison Officer (LO) Talent",
            "Liaison Officer (LO) Klien / VIP", "Runner", "Usher / SPG", "Steward", "Translator / Interpreter",
            "Sound Operator / Sound Engineer", "Lighting Operator / Lighting Designer", "LED Programmer / LED Operator",
            "Camera Operator", "Switcher / Vision Mixer", "Live Streaming Operator", "Genset Operator",
            "Rigger", "Crew Bongkar / Load-out", "Lainnya"
          ].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </FormField>

      <FormField 
        label="Pengalaman (jumlah project)" 
        required 
        error={errors.experienceCount}
      >
        <input 
          className={styles.formInput}
          value={formData.experienceCount || ""}
          onChange={(e) => onChange("experienceCount", e.target.value)}
          placeholder="Misal: 50+ project"
        />
      </FormField>

      <FormField 
        label="Day Rate (Rp/hari)" 
        required 
        error={errors.dayRate}
      >
        <input 
          className={styles.formInput}
          value={formData.dayRate || ""}
          onChange={(e) => onChange("dayRate", e.target.value)}
          placeholder="Misal: 750000"
        />
      </FormField>

      <FormField 
        label="Sertifikasi Profesi" 
        helpText="K3, Sound Engineering, Rigging Cert, dll. Wajib untuk technical crew tertentu."
      >
        <input 
          className={styles.formInput}
          value={formData.certifications || ""}
          onChange={(e) => onChange("certifications", e.target.value)}
        />
      </FormField>

      <FormField 
        label="Kota Operasi" 
        required 
        error={errors.operatingCities}
      >
        <input 
          className={styles.formInput}
          value={formData.operatingCities || ""}
          onChange={(e) => onChange("operatingCities", e.target.value)}
        />
      </FormField>
    </div>
  );
}
