"use client";

import { EntityType, RelationshipType, VendorIntakeV2Payload } from "@/lib/vendor/types";
import { RELATIONSHIP_LABELS } from "../lib/constants";
import styles from "../styles.module.css";

interface Step3Props {
  entityType: EntityType;
  relationshipType: RelationshipType;
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function Step3Identity({ entityType, relationshipType, formData, onChange, errors }: Step3Props) {
  const isBusiness = entityType === "business";

  const renderField = (field: string, label: string, type: "text" | "select" = "text", required = false, options: string[] = [], helpText?: string) => {
    const error = errors[field];
    const isMono = field.includes("Npwp") || field.includes("nik") || field.includes("nib");

    return (
      <div key={field} className={styles.field}>
        <label className={styles.label}>
          {label} {required && <span className={styles.requiredStar}>*</span>}
        </label>
        
        {type === "text" ? (
          <input 
            className={`${styles.input} ${isMono ? styles.inputMono : ""} ${error ? styles.inputError : ""}`}
            value={formData[field as keyof VendorIntakeV2Payload]?.toString() || ""}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder={field.includes("Npwp") ? "15-16 digit angka" : field.includes("nik") ? "16 digit angka" : ""}
          />
        ) : (
          <select 
            className={`${styles.select} ${error ? styles.inputError : ""}`}
            value={formData[field as keyof VendorIntakeV2Payload]?.toString() || ""}
            onChange={(e) => onChange(field, e.target.value)}
          >
            <option value="">-- Pilih --</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}

        {error ? <span className={styles.errorText}>{error}</span> : helpText ? <span className={styles.helperText}>{helpText}</span> : null}
      </div>
    );
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>Identitas Mitra</h2>
      <p className={styles.stepDescription}>
        Lengkapi data identitas resmi Anda. Pastikan informasi yang dimasukkan sesuai dengan dokumen {isBusiness ? "akta/pajak perusahaan" : "KTP"} Anda.
      </p>

      <div className={styles.formSection}>
        {isBusiness ? (
          <>
            {renderField("name", "Nama Perusahaan (resmi sesuai akta)", "text", true)}
            {relationshipType === "eo_partner" && renderField("stageBrandName", "Brand Name (jika berbeda dengan nama PT)", "text", false)}
            {renderField("legalEntityForm", "Bentuk Badan Usaha", "select", true, ["PT", "CV", "UD", "Lainnya"])}
            {renderField("npwpNumber", "NPWP Badan", "text", true, [], "Tanpa titik, tanpa strip")}
            {renderField("taxStatus", "Status PKP", "select", true, ["PKP", "Non-PKP"])}
            {renderField("nibNumber", "NIB (Nomor Induk Berusaha)", "text", true, [], "Wajib untuk vendor badan usaha")}
            {renderField("establishedYear", "Tahun Berdiri", "text", false)}
          </>
        ) : (
          <>
            {renderField("name", "Nama Lengkap (sesuai KTP)", "text", true)}
            {relationshipType === "eo_partner" && renderField("stageBrandName", "Brand Name EO Anda", "text", true, [], "Nama EO yang Anda gunakan untuk operasional")}
            {relationshipType === "talent" && renderField("stageBrandName", "Nama Panggung (jika ada)", "text", false, [], "Stage name untuk performer")}
            {relationshipType === "freelance" && renderField("stageBrandName", "Brand Name (jika ada)", "text", false, [], "Nama brand kreatif Anda")}
            {renderField("nikNumber", "NIK (KTP)", "text", true, [], "Tanpa spasi")}
            {renderField("personalNpwpNumber", "NPWP Pribadi", "text", false, [], "Wajib jika ingin tarif PPh 21 final 0,5% UMKM")}
            {renderField("domicileCity", "Domisili (Kota)", "text", true)}
          </>
        )}
      </div>

      <div className={styles.warningCallout}>
        Data identitas ini akan digunakan sebagai dasar pembuatan Kontrak Kerjasama dan bukti potong pajak. Mohon teliti dalam penginputan.
      </div>
    </div>
  );
}
