"use client";

import { VendorIntakeV2Payload } from "@/lib/vendor/types";
import { FormField, CheckboxGrid } from "./CapabilityFields";
import styles from "../../styles.module.css";

interface Props {
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function CapTalentAgency({ formData, onChange, errors }: Props) {
  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 className={styles.stepTitle}>Talent Pool</h2>
      <p className={styles.stepDescription}>Detail cakupan talent dan pengalaman manajemen agensi Anda.</p>

      <FormField 
        label="Tipe Talent yang Dimanage" 
        required 
        error={errors.services}
      >
        <CheckboxGrid 
          options={["MC", "Singer / Vokalis", "Band", "DJ", "Dancer / Choreographer", "Magician", "Stand-up Comedian", "Public Figure", "Performer Tradisional", "Lainnya"]}
          selected={formData.services || []}
          onChange={(val) => onChange("services", val)}
        />
      </FormField>

      <FormField 
        label="Jumlah Talent Aktif" 
        required 
        error={errors.capacityNotes}
      >
        <input 
          className={styles.formInput}
          value={formData.capacityNotes || ""}
          onChange={(e) => onChange("capacityNotes", e.target.value)}
          placeholder="Misal: 25 talent under management"
        />
      </FormField>

      <FormField label="Tahun Berdiri / Pengalaman Manajemen">
        <input 
          className={styles.formInput}
          value={formData.experienceCount || ""}
          onChange={(e) => onChange("experienceCount", e.target.value)}
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
