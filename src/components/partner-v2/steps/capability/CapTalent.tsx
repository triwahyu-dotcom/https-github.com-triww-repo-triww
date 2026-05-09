"use client";

import { VendorIntakeV2Payload } from "@/lib/vendor/types";
import { FormField } from "./CapabilityFields";
import styles from "../../styles.module.css";

interface Props {
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function CapTalent({ formData, onChange, errors }: Props) {
  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 className={styles.stepTitle}>Profil Talent</h2>
      <p className={styles.stepDescription}>Detail performa dan kebutuhan teknis (Rider) Anda.</p>

      <FormField 
        label="Tipe Performer" 
        required 
        error={errors.performerType}
      >
        <select 
          className={styles.select}
          value={formData.performerType || ""}
          onChange={(e) => onChange("performerType", e.target.value)}
        >
          <option value="">-- Pilih --</option>
          {[
            // Host & Voice
            "Professional MC (Formal/Corporate)", "Interactive Host (Gamified/Casual)", "Live Commerce Host", "Voice Over Artist",
            
            // Modern Music
            "DJ (Specialty: EDM/House/Hip-Hop)", "Solo Instrumentalist (Saxophone/Violin)", "Beatboxer",
            
            // Physical Performance
            "Aerial Performer (Silk/Lyra/Hoop)", "Fire & Pyrotechnic Performer", "LED / Light Painter Performer", "Magician / Mentalist",
            
            // Modern Visual & Tech
            "Live Digital Painter", "Cosplayer Professional", "Mascot / Character Performer",
            
            // Specialty
            "VR/AR Experience Guide", "Game Master (Booth/Interactive)", "Brand Ambassador (Premium Look)", "Lainnya"
          ].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </FormField>

      <FormField 
        label="Genre / Spesialisasi" 
        required 
        error={errors.genre}
      >
        <textarea 
          className={styles.textarea}
          value={formData.genre || ""}
          onChange={(e) => onChange("genre", e.target.value)}
          placeholder="Misal: MC formal corporate, Band acoustic 4-piece, DJ EDM"
        />
      </FormField>

      <FormField 
        label="Pengalaman Panggung (jumlah event)" 
        required 
        error={errors.experienceCount}
      >
        <input 
          className={styles.formInput}
          value={formData.experienceCount || ""}
          onChange={(e) => onChange("experienceCount", e.target.value)}
          placeholder="Misal: 100+ event"
        />
      </FormField>

      <FormField label="Bahasa">
        <input 
          className={styles.formInput}
          value={formData.languages || ""}
          onChange={(e) => onChange("languages", e.target.value)}
          placeholder="Misal: Indonesia, Inggris, Mandarin"
        />
      </FormField>

      <FormField 
        label="Rider Standard" 
        helpText="Permintaan teknis & hospitality (sound monitor, hotel, transport, makanan)"
      >
        <textarea 
          className={styles.textarea}
          value={formData.riderNotes || ""}
          onChange={(e) => onChange("riderNotes", e.target.value)}
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
