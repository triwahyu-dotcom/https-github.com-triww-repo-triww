"use client";

import { EntityType, VendorIntakeV2Payload } from "@/lib/vendor/types";
import { FormField, CheckboxGrid } from "./CapabilityFields";
import styles from "../../styles.module.css";

interface Props {
  entityType: EntityType;
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function CapEoPartner({ entityType, formData, onChange, errors }: Props) {
  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 className={styles.stepTitle}>Profil EO Partner</h2>
      <p className={styles.stepDescription}>Detail spesialisasi dan skala operasional Event Organizer Anda.</p>

      <FormField 
        label="Spesialisasi Project" 
        required 
        error={errors.services}
      >
        <CheckboxGrid 
          options={["Corporate Event", "Wedding & Personal", "Concert / Festival", "Exhibition / Trade Show", "Government Event", "Brand Activation", "Sport Event", "Conference / Seminar", "Lainnya"]}
          selected={formData.services || []}
          onChange={(val) => onChange("services", val)}
        />
      </FormField>

      <FormField 
        label="Skala Project yang Biasa Di-handle" 
        required 
        error={errors.capacityNotes}
      >
        <textarea 
          className={styles.textarea}
          value={formData.capacityNotes || ""}
          onChange={(e) => onChange("capacityNotes", e.target.value)}
          placeholder="Misal: corporate gathering 200-500 pax, wedding 1000+ pax, festival 5000+ pax"
        />
      </FormField>

      <FormField 
        label="Jumlah Project (perkiraan)" 
        required 
        error={errors.experienceCount}
      >
        <input 
          className={styles.formInput}
          value={formData.experienceCount || ""}
          onChange={(e) => onChange("experienceCount", e.target.value)}
          placeholder="Misal: 50+ project per tahun"
        />
      </FormField>

      {entityType === "individual" && (
        <>
          <FormField 
            label="Tim Inti yang Biasa Anda Bawa" 
            required 
            error={errors.teamComposition}
          >
            <textarea 
              className={styles.textarea}
              value={formData.teamComposition || ""}
              onChange={(e) => onChange("teamComposition", e.target.value)}
              placeholder="Misal: 1 PM + 1 Production Director + 3 koordinator + crew operasional"
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
              Saya bertanggung jawab penuh atas pembayaran tim saya. JUARA tidak menanggung pembayaran ke anggota tim secara terpisah.
            </label>
          </div>
          {errors.teamResponsibilityAccepted && (
            <span className={styles.errorText} style={{ marginTop: '8px', display: 'block' }}>
              {errors.teamResponsibilityAccepted}
            </span>
          )}
        </>
      )}

      <FormField 
        label="Kota Operasi" 
        required 
        error={errors.operatingCities}
        style={{ marginTop: entityType === "individual" ? '24px' : '0' }}
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
