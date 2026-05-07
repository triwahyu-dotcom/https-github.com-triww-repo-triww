"use client";

import { RelationshipType, VendorIntakeV2Payload } from "@/lib/vendor/types";
import { getRequiredDocs } from "../lib/required-docs";
import styles from "../styles.module.css";

interface Step6Props {
  relationshipType: RelationshipType;
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function Step6Documents({ relationshipType, formData, onChange, errors }: Step6Props) {
  const docs = getRequiredDocs(relationshipType);
  const declaredDocs = formData.declaredDocuments || [];

  const toggleDoc = (docName: string) => {
    const next = declaredDocs.includes(docName)
      ? declaredDocs.filter(d => d !== docName)
      : [...declaredDocs, docName];
    onChange("declaredDocuments", next);
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>Dokumen Pendukung</h2>
      <p className={styles.stepDescription}>
        Simpan seluruh dokumen legalitas dan portofolio Anda dalam satu folder Google Drive, lalu lampirkan link-nya di bawah.
      </p>

      <div className={styles.sectionHeader}>Link Google Drive</div>
      <div className={styles.field}>
        <label className={styles.label}>
          Link Folder Google Drive <span className={styles.requiredStar}>*</span>
        </label>
        <input 
          className={`${styles.input} ${errors.documentsFolderUrl ? styles.inputError : ""}`}
          value={formData.documentsFolderUrl || ""}
          onChange={(e) => onChange("documentsFolderUrl", e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
        />
        <p className={styles.helperText}>
          Pastikan akses folder diatur ke "Anyone with link can view".
        </p>
        {errors.documentsFolderUrl && <span className={styles.errorText}>{errors.documentsFolderUrl}</span>}
      </div>

      <div className={styles.sectionHeader}>Checklist Dokumen</div>
      <p className={styles.helperText} style={{ marginBottom: '16px' }}>
        Centang dokumen yang sudah Anda siapkan di dalam folder Drive tersebut.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {docs.map((doc, idx) => {
          const isSelected = declaredDocs.includes(doc.name);
          return (
            <div 
              key={idx} 
              className={`${styles.checkItem} ${isSelected ? styles.cardSelected : ""}`}
              onClick={() => toggleDoc(doc.name)}
              style={{ borderStyle: isSelected ? 'solid' : 'dashed' }}
            >
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => {}} 
                style={{ pointerEvents: 'none' }}
              />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{doc.name}</span>
                {doc.required ? (
                  <span className={styles.cardBadge} style={{ background: 'var(--color-text-primary)', color: 'var(--color-text-inverse)' }}>Wajib</span>
                ) : (
                  <span className={styles.cardBadge}>Opsional</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {errors.declaredDocuments && (
        <span className={styles.errorText} style={{ marginTop: '12px' }}>{errors.declaredDocuments}</span>
      )}

      <div className={styles.sectionHeader}>Media Sosial & Portfolio (Opsional)</div>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>Website / Portfolio URL</label>
          <input 
            className={styles.input}
            value={formData.websiteUrl || ""}
            onChange={(e) => onChange("websiteUrl", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Instagram</label>
          <input 
            className={styles.input}
            value={formData.instagramUrl || ""}
            onChange={(e) => onChange("instagramUrl", e.target.value)}
            placeholder="@username"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>TikTok</label>
          <input 
            className={styles.input}
            value={formData.tiktokUrl || ""}
            onChange={(e) => onChange("tiktokUrl", e.target.value)}
            placeholder="@username"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>LinkedIn URL</label>
          <input 
            className={styles.input}
            value={formData.linkedinUrl || ""}
            onChange={(e) => onChange("linkedinUrl", e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />
        </div>
      </div>
    </div>
  );
}
