"use client";

import { VendorIntakeV2Payload } from "@/lib/vendor/types";
import { FormField, CheckboxGrid } from "./CapabilityFields";
import styles from "../../styles.module.css";

interface Props {
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function CapVendorRental({ formData, onChange, errors }: Props) {
  return (
    <div className={styles.capabilityContainer}>
      <h2 className={styles.stepTitle}>Peralatan & Layanan Rental</h2>
      <p className={styles.stepDescription}>Spesifikasi teknis armada dan peralatan yang Anda sediakan.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <FormField 
            label="Kategori Utama Peralatan" 
            required 
            error={errors.rentalCategories}
          >
            <select 
              className={styles.select}
              value={formData.rentalCategories?.[0] || ""}
              onChange={(e) => onChange("rentalCategories", [e.target.value])}
            >
              <option value="">Pilih...</option>
              {["Sound System", "Lighting", "LED Screen / Video Wall", "Rigging & Truss", "Stage & Booth", "Tenda & Decoration", "Furniture & Carpet", "Genset & Power", "Communication (HT/IEM)", "Kendaraan", "Lainnya"].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>

          <FormField 
            label="Pricing Model" 
            required 
            error={errors.pricingModel}
          >
            <select 
              className={styles.select}
              value={formData.pricingModel || ""}
              onChange={(e) => onChange("pricingModel", e.target.value)}
            >
              <option value="">Pilih...</option>
              <option value="bundled">Bundled (All-in)</option>
              <option value="unbundled">Unbundled (Per item)</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </FormField>
        </div>

        <FormField label="Sub-kategori (pilih semua yang tersedia)">
          <CheckboxGrid 
            options={[
              "Sound: Line Array", "Sound: PA System", "Sound: Stage Monitor", "Sound: Digital Mixer",
              "Lighting: Moving Head", "Lighting: LED PAR", "Lighting: Effect/Hazer", "Lighting: Console",
              "LED: Indoor P2.6/2.9", "LED: Outdoor P3.9/4.8", "LED: Transparent/Mesh", "LED: Floor/Dancefloor",
              "Video: Media Server", "Video: Switcher/Cam", "Video: Processor",
              "Rigging: Truss/Layher", "Stage: Modular/Level", "Tenda: Roder/Sarnafil", "Decor: Backdrop/Furniture",
              "Power: Genset Silent", "Power: Distribution", "Comm: HT/IEM/Clearcom"
            ]}
            selected={formData.rentalSubcategories || []}
            onChange={(val) => onChange("rentalSubcategories", val)}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
          <FormField 
            label="Kapasitas / Stock" 
            required 
            error={errors.capacityNotes}
          >
            <textarea 
              className={styles.textarea}
              value={formData.capacityNotes || ""}
              onChange={(e) => onChange("capacityNotes", e.target.value)}
              placeholder="Misal: 3 set sound 5000W, 50 unit moving head"
              rows={2}
            />
          </FormField>

          <FormField 
            label="Kota Operasi" 
            required 
            error={errors.operatingCities}
          >
            <input 
              className={styles.input}
              value={formData.operatingCities || ""}
              onChange={(e) => onChange("operatingCities", e.target.value)}
              placeholder="Jakarta, Bandung, dll"
            />
          </FormField>
        </div>

        <FormField 
          label="Layanan TERMASUK dalam harga sewa" 
          required 
          error={errors.includedServices}
        >
          <CheckboxGrid 
            options={["Setup & Install", "Bongkar / Load-out", "Transport ke venue", "Operator hari-H", "Stand-by crew selama acara", "Cleaning setelah pakai", "Tidak ada"]}
            selected={formData.includedServices || []}
            onChange={(val) => onChange("includedServices", val)}
          />
        </FormField>

        <FormField label="Layanan TAMBAHAN (charge terpisah)" helpText="opsional">
          <CheckboxGrid 
            options={["Operator/VJ Extended", "Backup Equipment", "Technical Drawing (CAD/3D)", "Rider Review", "Pre-event Soundcheck", "Live Recording", "Post-event Documentation", "Maintenance Contract"]}
            selected={formData.addonServices || []}
            onChange={(val) => onChange("addonServices", val)}
          />
        </FormField>
      </div>
    </div>
  );
}
