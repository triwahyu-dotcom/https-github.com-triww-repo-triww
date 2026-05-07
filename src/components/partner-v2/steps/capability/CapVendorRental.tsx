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
    <div style={{ maxWidth: '600px' }}>
      <h2 className={styles.stepTitle}>Peralatan & Layanan Rental</h2>
      <p className={styles.stepDescription}>Spesifikasi teknis armada dan peralatan yang Anda sediakan.</p>

      <FormField 
        label="Kategori Utama Peralatan" 
        required 
        error={errors.rentalCategories}
      >
        <CheckboxGrid 
          options={["Sound System", "Lighting", "LED Screen / Video Wall", "Rigging & Truss", "Stage & Booth", "Tenda & Decoration", "Furniture & Carpet", "Genset & Power", "Communication (HT/IEM)", "Kendaraan", "Lainnya"]}
          selected={formData.rentalCategories || []}
          onChange={(val) => onChange("rentalCategories", val)}
        />
      </FormField>

      <FormField label="Sub-kategori spesifik">
        <CheckboxGrid 
          options={["Line Array", "PA System", "Stage Monitor", "Conventional Light", "Moving Head", "LED PAR", "Indoor LED P3", "Outdoor LED P5", "Layher", "Truss", "Stage Modular", "Tenda Roder", "Tenda Sarnafil", "Backdrop", "HT", "IEM", "Genset Silent"]}
          selected={formData.rentalSubcategories || []}
          onChange={(val) => onChange("rentalSubcategories", val)}
        />
      </FormField>

      <FormField 
        label="Operator Disertakan?" 
        required 
        error={errors.withOperator}
        helpText="Penting untuk planning project — apakah JUARA perlu hire operator terpisah."
      >
        <select 
          className={styles.select}
          value={formData.withOperator || ""}
          onChange={(e) => onChange("withOperator", e.target.value)}
        >
          <option value="">-- Pilih --</option>
          <option value="always">Selalu disertakan operator</option>
          <option value="optional">Bisa dengan/tanpa operator (dry hire optional)</option>
          <option value="dry_hire_only">Dry hire saja (tanpa operator)</option>
        </select>
      </FormField>

      <FormField 
        label="Kapasitas / Stock" 
        required 
        error={errors.capacityNotes}
      >
        <textarea 
          className={styles.textarea}
          value={formData.capacityNotes || ""}
          onChange={(e) => onChange("capacityNotes", e.target.value)}
          placeholder="Misal: 3 set sound 5000W, 50 unit moving head, LED 50 sqm"
        />
      </FormField>

      <FormField 
        label="Layanan TERMASUK dalam harga sewa" 
        required 
        error={errors.includedServices}
      >
        <CheckboxGrid 
          options={["Setup & Install", "Bongkar / Load-out", "Transport ke venue", "Operator hari-H", "Stand-by crew selama acara", "Cleaning setelah pakai", "Tidak ada (dry hire saja)"]}
          selected={formData.includedServices || []}
          onChange={(val) => onChange("includedServices", val)}
        />
      </FormField>

      <FormField label="Layanan TAMBAHAN tersedia (charge terpisah)">
        <CheckboxGrid 
          options={["Operator extended (multi-day)", "Backup equipment", "Konsultasi teknis pra-acara", "Soundcheck / Trial day", "Technical drawing / rider review", "Post-event documentation", "Maintenance contract"]}
          selected={formData.addonServices || []}
          onChange={(val) => onChange("addonServices", val)}
        />
      </FormField>

      <FormField 
        label="Pricing Model" 
        required 
        error={errors.pricingModel}
        helpText="Penting untuk transparansi biaya & negosiasi."
      >
        <select 
          className={styles.select}
          value={formData.pricingModel || ""}
          onChange={(e) => onChange("pricingModel", e.target.value)}
        >
          <option value="">-- Pilih --</option>
          <option value="bundled">Bundled (sewa + semua layanan dalam 1 harga)</option>
          <option value="unbundled">Unbundled (sewa & layanan dipisah, charge per item)</option>
          <option value="hybrid">Hybrid (sewa bundled, sebagian layanan add-on)</option>
        </select>
      </FormField>

      <FormField 
        label="Kota Operasi" 
        required 
        error={errors.operatingCities}
        helpText="Pisahkan dengan koma. Misal: Jakarta, Bandung, Surabaya"
      >
        <input 
          className={styles.input}
          value={formData.operatingCities || ""}
          onChange={(e) => onChange("operatingCities", e.target.value)}
        />
      </FormField>
    </div>
  );
}
