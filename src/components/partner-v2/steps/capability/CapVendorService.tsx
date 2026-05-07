"use client";

import { VendorIntakeV2Payload } from "@/lib/vendor/types";
import { FormField, CheckboxGrid } from "./CapabilityFields";
import styles from "../../styles.module.css";

interface Props {
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function CapVendorService({ formData, onChange, errors }: Props) {
  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 className={styles.stepTitle}>Layanan Jasa</h2>
      <p className={styles.stepDescription}>Detail cakupan jasa profesional yang Anda tawarkan.</p>

      <FormField 
        label="Kategori Utama Jasa" 
        required 
        error={errors.services}
      >
        <CheckboxGrid 
          options={["Show Management", "Security & Crowd Control", "Catering", "Cleaning & Waste Management", "Logistic & Transport", "Photo/Video Production", "Creative & Design", "Legal & Permit", "Talent Coordination", "Lainnya"]}
          selected={formData.services || []}
          onChange={(val) => onChange("services", val)}
        />
      </FormField>

      <FormField label="Sub-kategori (pilih semua yang relevan)">
        <CheckboxGrid 
          options={["Show Director", "Show Manager", "Stage Manager", "Floor Director", "Floor Manager", "Floor Team", "PM Lapangan", "Korlap Lapangan", "Logistic Lead", "Logistic Team", "Security Guard", "Crowd Control", "Steward", "Usher / SPG", "Liaison Officer (LO)", "Runner", "Catering Box", "Catering Buffet", "Cleaning Crew", "Waste Management", "Photographer", "Videographer", "Designer 2D", "Designer 3D Motion", "Legal Service"]}
          selected={formData.subServices || []}
          onChange={(val) => onChange("subServices", val)}
        />
      </FormField>

      <FormField 
        label="Kapasitas Operasi" 
        required 
        error={errors.capacityNotes}
      >
        <textarea 
          className={styles.textarea}
          value={formData.capacityNotes || ""}
          onChange={(e) => onChange("capacityNotes", e.target.value)}
          placeholder="Misal: jumlah crew, skala project yang biasa di-handle"
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
