"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { EntityType, RelationshipType, VendorIntakeV2Payload } from "@/lib/vendor/types";
import { validatePhone, checkBankNameMismatch } from "../lib/validators";
import styles from "../styles.module.css";

interface Step5Props {
  entityType: EntityType;
  relationshipType: RelationshipType;
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

const INDONESIAN_BANKS = [
  "BCA", "Mandiri", "BNI", "BRI", "CIMB Niaga", "Permata", "Danamon", "BTPN", 
  "OCBC NISP", "Maybank", "BSI", "BTN", "Bank Jago", "Allo Bank", "SeaBank", "Lainnya"
];

export function Step5ContactBank({ entityType, relationshipType, formData, onChange, errors }: Step5Props) {
  const [bankWarning, setBankWarning] = useState<string | null>(null);

  const handlePhoneBlur = (field: string, value: string) => {
    const { normalized } = validatePhone(value);
    if (normalized) {
      onChange(field, normalized);
    }
  };

  const handleBankHolderBlur = (value: string) => {
    if (entityType === "business" && formData.name) {
      const warning = checkBankNameMismatch(formData.name, value);
      setBankWarning(warning);
    }
  };

  const renderField = (
    field: string, 
    label: string, 
    type: "text" | "select" | "textarea" = "text", 
    required = false, 
    options: string[] = [], 
    helpText?: string,
    onBlur?: (val: string) => void
  ) => {
    const error = errors[field];
    const isMono = field.includes("Phone") || field.includes("Number");

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
            onBlur={(e) => onBlur?.(e.target.value)}
          />
        ) : type === "textarea" ? (
          <textarea 
            className={`${styles.textarea} ${error ? styles.inputError : ""}`}
            value={formData[field as keyof VendorIntakeV2Payload]?.toString() || ""}
            onChange={(e) => onChange(field, e.target.value)}
            onBlur={(e) => onBlur?.(e.target.value)}
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
      <h2 className={styles.stepTitle}>Kontak & Perbankan</h2>
      <p className={styles.stepDescription}>Informasi korespondensi dan detail rekening untuk koordinasi operasional dan penyelesaian pembayaran.</p>

      {entityType === "business" ? (
        <>
          <div className={styles.sectionHeader}>Kontak Perusahaan</div>
          {renderField("businessAddress", "Alamat Bisnis (lengkap)", "textarea", true, [], "Termasuk kota & kode pos")}
          {renderField("officePhone", "Telepon Kantor", "text", true, [], "+62 21 ...", (v) => handlePhoneBlur("officePhone", v))}
          {renderField("email", "Email Bisnis Utama", "text", true)}

          <div className={styles.sectionHeader}>Person In Charge (PIC)</div>
          {renderField("picName", "Nama PIC Primary", "text", true)}
          {renderField("picTitle", "Jabatan PIC", "text", true, [], "Misal: Account Manager, Operations Director")}
          {renderField("picPhone", "WhatsApp PIC", "text", true, [], "+62 8xx-xxxx-xxxx", (v) => handlePhoneBlur("picPhone", v))}
          {renderField("picEmail", "Email PIC", "text", true)}
          {renderField("picBackupName", "Nama PIC Backup")}
          {renderField("picBackupPhone", "WhatsApp PIC Backup", "text", false, [], "", (v) => handlePhoneBlur("picBackupPhone", v))}
        </>
      ) : (
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>Kontak Pribadi</div>
          {renderField("email", "Email", "text", true)}
          {renderField("picPhone", "WhatsApp / HP", "text", true, [], "Format: +62...", (v) => handlePhoneBlur("picPhone", v))}
          {renderField("businessAddress", "Alamat Domisili", "textarea", false)}
          {renderField("emergencyContactName", "Nama Kontak Darurat")}
          {renderField("emergencyContactPhone", "WhatsApp Kontak Darurat", "text", false, [], "", (v) => handlePhoneBlur("emergencyContactPhone", v))}
        </div>
      )}

      <div className={styles.sectionHeader}>Rekening Pembayaran</div>
      {renderField("bankName", "Bank", "select", true, INDONESIAN_BANKS)}
      {renderField("bankAccountNumber", "Nomor Rekening", "text", true, [], "Hanya angka, tanpa spasi atau tanda baca")}
      
      <div className={styles.field}>
        <label className={styles.label}>
          Atas Nama (sesuai buku tabungan) <span className={styles.requiredStar}>*</span>
        </label>
        <input 
          className={`${styles.input} ${errors.bankAccountHolder ? styles.inputError : ""}`}
          value={formData.bankAccountHolder || ""}
          onChange={(e) => onChange("bankAccountHolder", e.target.value)}
          onBlur={(e) => handleBankHolderBlur(e.target.value)}
        />
        <span className={styles.helperText}>
          {entityType === "business" 
            ? "Sebaiknya sesuai nama PT/CV. Jika berbeda, lampirkan surat kuasa direksi di tahap selanjutnya."
            : "Harus sesuai nama di KTP."}
        </span>
        {errors.bankAccountHolder && <span className={styles.errorText}>{errors.bankAccountHolder}</span>}
        
        {bankWarning && (
          <div className={styles.warningCallout}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>{bankWarning}</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.warningCallout}>
        Data rekening akan digunakan secara otomatis oleh sistem keuangan JUARA untuk transfer pembayaran. Pastikan nomor rekening dan nama pemilik sudah tepat.
      </div>
    </div>
  );
}
