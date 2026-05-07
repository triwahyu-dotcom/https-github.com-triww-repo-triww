"use client";

import { VendorIntakeV2Payload } from "@/lib/vendor/types";
import { FormField } from "./CapabilityFields";
import styles from "../../styles.module.css";

interface Props {
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function CapCrewLead({ formData, onChange, errors }: Props) {
  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 className={styles.stepTitle}>Profil Crew Lead</h2>
      <p className={styles.stepDescription}>Detail kepemimpinan tim dan skema pembayaran kelompok Anda.</p>

      <FormField 
        label="Role Utama" 
        required 
        error={errors.crewLeadRole}
      >
        <select 
          className={styles.select}
          value={formData.crewLeadRole || ""}
          onChange={(e) => onChange("crewLeadRole", e.target.value)}
        >
          <option value="">-- Pilih --</option>
          {[
            "Show Director / Show Caller", "Show Manager", "Stage Manager", "Floor Director / Floor Manager",
            "PM Lapangan", "Korlap (Koordinator Lapangan)", "Site Coordinator", "Logistic Lead / Korlap Logistik",
            "Production Manager", "Talent Coordinator Lead", "Wedding Organizer Lead", "Crew Lead Teknis (Sound/Lighting)", "Lainnya"
          ].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </FormField>

      <FormField 
        label="Komposisi Tim Biasa" 
        required 
        error={errors.teamComposition}
      >
        <textarea 
          className={styles.textarea}
          value={formData.teamComposition || ""}
          onChange={(e) => onChange("teamComposition", e.target.value)}
          placeholder="Misal: 1 AD + 4 Runner + 1 Logistik"
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <FormField 
          label="Total Tim (perkiraan)" 
          required 
          error={errors.teamSize}
        >
          <input 
            className={styles.formInput}
            value={formData.teamSize || ""}
            onChange={(e) => onChange("teamSize", e.target.value)}
            placeholder="Misal: 6 orang"
          />
        </FormField>

        <FormField 
          label="Pengalaman Bersama Tim" 
          required 
          error={errors.teamExperience}
        >
          <input 
            className={styles.formInput}
            value={formData.teamExperience || ""}
            onChange={(e) => onChange("teamExperience", e.target.value)}
            placeholder="Misal: 3 tahun"
          />
        </FormField>
      </div>

      <FormField 
        label="Day Rate Tim (Rp/hari)" 
        required 
        error={errors.teamDayRate}
        helpText="Nilai SPK akan mencakup seluruh tim. Anda yang membayar tim Anda sendiri."
      >
        <input 
          className={styles.formInput}
          value={formData.teamDayRate || ""}
          onChange={(e) => onChange("teamDayRate", e.target.value)}
          placeholder="Total untuk seluruh tim per hari"
        />
      </FormField>

      <div className={styles.checkboxAcceptance}>
        <input 
          type="checkbox" 
          id="teamResponsibility"
          checked={formData.teamResponsibilityAccepted || false}
          onChange={(e) => onChange("teamResponsibilityAccepted", e.target.checked)}
        />
        <label htmlFor="teamResponsibility">
          Saya bertanggung jawab penuh atas pembayaran tim saya. JUARA tidak akan menanggung pembayaran ke anggota tim secara terpisah.
        </label>
      </div>
      {errors.teamResponsibilityAccepted && (
        <span className={styles.errorText} style={{ marginTop: '8px', display: 'block' }}>
          {errors.teamResponsibilityAccepted}
        </span>
      )}

      <FormField 
        label="Kota Operasi" 
        required 
        error={errors.operatingCities}
        style={{ marginTop: '24px' }}
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
