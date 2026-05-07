"use client";

import { Check, UserPlus, ArrowRight } from "lucide-react";
import styles from "./styles.module.css";

interface SuccessScreenProps {
  registrationCode: string;
  vendorName: string;
  onReset: () => void;
}

export function SuccessScreen({ registrationCode, vendorName, onReset }: SuccessScreenProps) {
  return (
    <div className={styles.successContainer}>
      <div className={styles.successIcon}>
        <Check size={32} strokeWidth={3} />
      </div>
      
      <h1 className={styles.stepTitle} style={{ textAlign: 'center', marginBottom: '16px' }}>
        Pendaftaran Berhasil Terkirim
      </h1>
      
      <p className={styles.stepDescription} style={{ textAlign: 'center', margin: '0 auto 40px' }}>
        Terima kasih, <strong>{vendorName}</strong>. Profil kemitraan Anda telah masuk ke dalam antrian verifikasi strategis JUARA.
      </p>

      <div className={styles.codeBox}>
        <span className={styles.codeLabel}>ID Pendaftaran</span>
        <div className={styles.codeValue}>{registrationCode}</div>
      </div>

      <div style={{ textAlign: 'left', marginBottom: '48px' }}>
        <h4 className={styles.reviewTitle} style={{ marginBottom: '16px', color: 'var(--color-text-primary)' }}>Apa Selanjutnya?</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--color-accent)' }}>01</span>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Tim operasional kami akan meninjau dokumen dan kapabilitas teknis Anda dalam 1-3 hari kerja.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--color-accent)' }}>02</span>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Konfirmasi aktivasi atau permintaan revisi akan dikirimkan melalui WhatsApp dan Email resmi.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--color-accent)' }}>03</span>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Setelah akun aktif, Anda akan mulai menerima undangan pengadaan dan permintaan penawaran (RFQ) secara otomatis.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button 
          className={styles.btnPrimary} 
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => window.location.href = `/vendor/status?code=${registrationCode}`}
        >
          Cek Status Pendaftaran <ArrowRight size={18} />
        </button>
        
        <button 
          className={styles.btnSecondary} 
          style={{ width: '100%', justifyContent: 'center', border: 'none' }}
          onClick={onReset}
        >
          <UserPlus size={18} /> Daftarkan Mitra Lain
        </button>
      </div>
    </div>
  );
}
