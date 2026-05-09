"use client";

import { VendorIntakeV2Payload } from "@/lib/vendor/types";
import { FormField } from "./CapabilityFields";
import styles from "../../styles.module.css";

interface Props {
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function CapFreelance({ formData, onChange, errors }: Props) {
  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 className={styles.stepTitle}>Profil Creative Freelance</h2>
      <p className={styles.stepDescription}>Detail keahlian kreatif dan skema kerja Anda.</p>

      <FormField 
        label="Spesialisasi Utama" 
        required 
        error={errors.creativeSpecialty}
      >
        <select 
          className={styles.select}
          value={formData.creativeSpecialty || ""}
          onChange={(e) => onChange("creativeSpecialty", e.target.value)}
        >
          <option value="">-- Pilih --</option>
          {["Event Planner", "Designer 2D / Grafis", "Designer 3D / Motion", "Videographer / Editor", "Photographer", "Content Creator", "Copywriter", "Music Producer", "Web/UI Designer", "Lainnya"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </FormField>

      <FormField 
        label="Software Keahlian" 
        required 
        error={errors.softwareSkills}
        helpText="Misal: Adobe Suite, After Effects, DaVinci Resolve, Figma, Cinema 4D"
      >
        <input 
          className={styles.formInput}
          value={formData.softwareSkills || ""}
          onChange={(e) => onChange("softwareSkills", e.target.value)}
        />
      </FormField>

      <FormField 
        label="Rate Per Project / Output" 
        required 
        error={errors.ratePerProject}
      >
        <input 
          className={styles.formInput}
          value={formData.ratePerProject || ""}
          onChange={(e) => onChange("ratePerProject", e.target.value)}
          placeholder="Misal: Rp 500.000 per design"
        />
      </FormField>

      <FormField 
        label="Turn-around Time" 
        helpText="Rata-rata waktu pengerjaan. Misal: 3-5 hari kerja per design."
      >
        <input 
          className={styles.formInput}
          value={formData.turnaroundTime || ""}
          onChange={(e) => onChange("turnaroundTime", e.target.value)}
        />
      </FormField>

      <FormField label="Working Style">
        <select 
          className={styles.select}
          value={formData.workingStyle || ""}
          onChange={(e) => onChange("workingStyle", e.target.value)}
        >
          <option value="">-- Pilih --</option>
          <option value="remote">Remote-only</option>
          <option value="on_site">On-site only</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </FormField>

      <FormField 
        label="Kota Operasi (jika ada batasan)" 
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
