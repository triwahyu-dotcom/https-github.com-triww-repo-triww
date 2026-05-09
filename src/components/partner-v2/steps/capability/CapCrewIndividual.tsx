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
            // Management & Strategic
            "Show Director (Freelance)", "Script Writer", "Event Coordinator", "Production Assistant",
            
            // Production & Field
            "Floor Manager / Floor Director", "Stage Manager", "Liaison Officer (LO)", "Runner / Production Crew",
            
            // Hospitality & Support
            "Guest Relation Officer (GRO)", "Protocoler (VVIP/Government)", "VIP Usher", "Usher / SPG / SPB", "Translator / Interpreter", 
            "Make-Up Artist (MUA)", "Hair Stylist", "Wardrobe / Stylist", "Admin Event", "Registration Staff",
            
            // Specialist Field
            "Signage Coordinator", "Ticketing Manager", "Traffic Manager (Festival/Concert)", "Drone Pilot", "Security / Crowd Control", "Lainnya"
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
