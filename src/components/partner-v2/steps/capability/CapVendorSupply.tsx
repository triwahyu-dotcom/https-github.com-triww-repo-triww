"use client";

import { VendorIntakeV2Payload } from "@/lib/vendor/types";
import { FormField, CheckboxGrid } from "./CapabilityFields";
import styles from "../../styles.module.css";

interface Props {
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function CapVendorSupply({ formData, onChange, errors }: Props) {
  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 className={styles.stepTitle}>Produk & Layanan Pendukung</h2>
      <p className={styles.stepDescription}>Detail produk fisik yang Anda sediakan untuk kebutuhan event.</p>

      <FormField 
        label="Kategori Produk" 
        required 
        error={errors.services}
      >
        <select 
          className={styles.select}
          value={formData.services?.[0] || ""}
          onChange={(e) => onChange("services", [e.target.value])}
        >
          <option value="">-- Pilih --</option>
          {["Merchandise", "Konsumsi (F&B kemasan)", "Signage / Print", "ATK", "Goodie Bag", "Souvenir", "Lainnya"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </FormField>

      <FormField 
        label="Daftar Produk Utama" 
        required 
        error={errors.productList}
      >
        <textarea 
          className={styles.textarea}
          value={formData.productList || ""}
          onChange={(e) => onChange("productList", e.target.value)}
          placeholder="Produk yang Anda sediakan, lengkap dengan range harga jika ada"
        />
      </FormField>

      <FormField 
        label="Minimum Order (MOQ)" 
        helpText="Misal: 100 pcs, atau Rp 5.000.000"
      >
        <input 
          className={styles.formInput}
          value={formData.minimumOrderQty || ""}
          onChange={(e) => onChange("minimumOrderQty", e.target.value)}
        />
      </FormField>

      <FormField 
        label="Lead Time Produksi" 
        helpText="Misal: 7-14 hari kerja"
      >
        <input 
          className={styles.formInput}
          value={formData.leadTime || ""}
          onChange={(e) => onChange("leadTime", e.target.value)}
        />
      </FormField>

      <FormField label="Layanan Pendukung yang Tersedia">
        <CheckboxGrid 
          options={["Custom branding / printing", "Custom packaging", "Sample sebelum produksi massal", "Delivery ke venue", "Pickup/return jika tidak terpakai", "Design service", "Quality check sebelum kirim"]}
          selected={formData.addonServices || []}
          onChange={(val) => onChange("addonServices", val)}
        />
      </FormField>

      <FormField 
        label="Kota Operasi / Pengiriman" 
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
