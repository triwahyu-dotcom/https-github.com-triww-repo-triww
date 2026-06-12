"use client";

import { Check, Edit2, AlertCircle, ArrowRight } from "lucide-react";
import { VendorIntakeV2Payload } from "@/lib/vendor/types";
import { RELATIONSHIP_LABELS } from "../lib/constants";
import styles from "../styles.module.css";

interface Step7Props {
  formData: Partial<VendorIntakeV2Payload>;
  onEdit: (step: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError?: string;
}

export function Step7Review({ formData, onEdit, onSubmit, isSubmitting, submitError }: Step7Props) {
  const ReviewSection = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
    <div className={styles.reviewSection}>
      <div className={styles.reviewHeader}>
        <h3 className={styles.reviewTitle}>{title}</h3>
        <button onClick={() => onEdit(step)} className={styles.editButton}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Edit2 size={12} /> Edit
          </div>
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );

  const ReviewRow = ({ label, value, mono }: { label: string; value?: any; mono?: boolean }) => {
    if (value === undefined || value === null || value === "") return null;
    return (
      <div className={styles.reviewRow}>
        <div className={styles.reviewKey}>{label}</div>
        <div className={`${styles.reviewValue} ${mono ? styles.inputMono : ""}`}>
          {typeof value === "boolean" ? (value ? "✓ Ya" : "✗ Tidak") : Array.isArray(value) ? value.join(", ") : value}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>Tinjau Pendaftaran</h2>
      <p className={styles.stepDescription}>
        Periksa kembali seluruh data yang telah Anda masukkan. Momen ini penting untuk memastikan kelancaran proses verifikasi dan pembayaran di masa mendatang.
      </p>

      {submitError && (
        <div className={styles.warningCallout} style={{ background: 'var(--color-error-soft)', color: 'var(--color-error)', borderLeftColor: 'var(--color-error)', marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{submitError}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ReviewSection title="Tipe Kemitraan" step={0}>
          <ReviewRow label="Entitas" value={formData.entityType === "business" ? "Badan Usaha" : "Perorangan"} />
          <ReviewRow label="Kategori" value={RELATIONSHIP_LABELS[formData.relationshipType || ""]} />
        </ReviewSection>

        <ReviewSection title="Identitas Resmi" step={2}>
          <ReviewRow label="Nama Resmi" value={formData.name} />
          {formData.stageBrandName && <ReviewRow label="Brand Name" value={formData.stageBrandName} />}
          {formData.legalEntityForm && <ReviewRow label="Bentuk Legal" value={formData.legalEntityForm} />}
          {formData.npwpNumber && <ReviewRow label="NPWP Badan" value={formData.npwpNumber} mono />}
          {formData.taxStatus && <ReviewRow label="Status PKP" value={formData.taxStatus} />}
          {formData.nibNumber && <ReviewRow label="NIB" value={formData.nibNumber} mono />}
          {formData.nikNumber && <ReviewRow label="NIK (KTP)" value={formData.nikNumber} mono />}
          {formData.personalNpwpNumber && <ReviewRow label="NPWP Pribadi" value={formData.personalNpwpNumber} mono />}
        </ReviewSection>

        <ReviewSection title="Profil & Kapabilitas" step={3}>
          {formData.rentalCategories && <ReviewRow label="Kategori Rental" value={formData.rentalCategories} />}
          {formData.services && <ReviewRow label="Layanan" value={formData.services} />}
          {formData.capacityNotes && <ReviewRow label="Kapasitas" value={formData.capacityNotes} />}
          {formData.operatingCities && <ReviewRow label="Wilayah Operasi" value={formData.operatingCities} />}
          {formData.dayRate && <ReviewRow label="Rate Jasa" value={formData.dayRate} />}
        </ReviewSection>

        <ReviewSection title="Kontak & Perbankan" step={4}>
          <ReviewRow label="Email" value={formData.email} />
          <ReviewRow label="WhatsApp" value={formData.picPhone} mono />
          <ReviewRow label="Bank 1" value={formData.bankName} />
          <ReviewRow label="No. Rekening 1" value={formData.bankAccountNumber} mono />
          <ReviewRow label="Atas Nama 1" value={formData.bankAccountHolder} />
          {formData.bankName2 && <ReviewRow label="Bank 2" value={formData.bankName2} />}
          {formData.bankAccountNumber2 && <ReviewRow label="No. Rekening 2" value={formData.bankAccountNumber2} mono />}
          {formData.bankAccountHolder2 && <ReviewRow label="Atas Nama 2" value={formData.bankAccountHolder2} />}
        </ReviewSection>

        <ReviewSection title="Dokumen & Portfolio" step={5}>
          <ReviewRow label="Link Drive" value={formData.documentsFolderUrl} />
          <div className={styles.reviewRow}>
            <div className={styles.reviewKey}>Dokumen Terlampir</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {(formData.declaredDocuments || []).map((doc, i) => (
                <span key={i} className={styles.cardBadge}>
                  <Check size={10} style={{ marginRight: '4px' }} /> {doc}
                </span>
              ))}
            </div>
          </div>
        </ReviewSection>
      </div>

      <div style={{ marginTop: '48px', padding: '32px', background: 'var(--color-text-primary)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-inverse)' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Konfirmasi Akhir</h4>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          Dengan menekan tombol kirim, Anda menyatakan bahwa seluruh data yang diberikan adalah benar dan dapat dipertanggungjawabkan. Tim JUARA akan menghubungi Anda setelah proses verifikasi selesai.
        </p>
        
        <button 
          className={styles.btnPrimary} 
          style={{ width: '100%', height: '52px', fontSize: '16px', background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: 'none' }}
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sedang Mengirim..." : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              Submit Pendaftaran <ArrowRight size={18} />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
