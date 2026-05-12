"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EntityType, RelationshipType, VendorIntakeV2Payload } from "@/lib/vendor/types";
import { Stepper } from "./Stepper";
import { 
  validateEmail, 
  validatePhone, 
  validateNIK, 
  validateNPWP, 
  validateBankAccount, 
  validateAccountHolder,
  validateMinLength
} from "./lib/validators";
import { Step1EntityType } from "./steps/Step1EntityType";
import { Step2SubType } from "./steps/Step2SubType";
import { Step3Identity } from "./steps/Step3Identity";
import { Step4Capability } from "./steps/Step4Capability";
import { Step5ContactBank } from "./steps/Step5ContactBank";
import { Step6Documents } from "./steps/Step6Documents";
import { Step7Review } from "./steps/Step7Review";
import { SuccessScreen } from "./SuccessScreen";
import { getRequiredDocs } from "./lib/required-docs";
import styles from "./styles.module.css";

interface PartnerIntakeFormV2Props {
  serviceOptions: string[];
}

export function PartnerIntakeFormV2({ serviceOptions }: PartnerIntakeFormV2Props) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<VendorIntakeV2Payload>>({
    entityType: undefined,
    relationshipType: undefined,
    declaredDocuments: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ vendorId: string; registrationCode: string } | null>(null);
  const [formStartTime] = useState<number>(Date.now());

  const visualSteps = [
    { label: "Tipe Mitra" },
    { label: "Sub-Tipe" },
    { label: "Detail" },
    { label: "Tinjau" }
  ];

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const fillDevData = () => {
    const dummyData: Partial<VendorIntakeV2Payload> = {
      entityType: "business",
      relationshipType: "vendor_rental",
      name: "PT Jasa Juara Perkasa",
      email: "test@juaraevent.id",
      establishedYear: "2020",
      nibNumber: "1234567890123",
      npwpNumber: "123456789012345",
      taxStatus: "PKP",
      businessAddress: "Jl. Event No. 88, Jakarta Selatan",
      officePhone: "+62215551234",
      picName: "Budi Juara",
      picTitle: "Operations Manager",
      picPhone: "+6281234567890",
      picEmail: "budi@juaraevent.id",
      bankName: "BCA",
      bankAccountNumber: "8001234567",
      bankAccountHolder: "PT Jasa Juara Perkasa",
      documentsFolderUrl: "https://drive.google.com/drive/folders/test-folder-juara",
      declaredDocuments: ["Akta Pendirian", "NPWP Badan", "NIB", "Company Profile", "Pricelist Sewa"],
      rentalCategories: ["sound_system", "lighting"],
      capacityNotes: "Tersedia 4 set sound system 5000W dan LED Wall 20sqm.",
      pricingModel: "bundled"
    };
    setFormData(dummyData);
    setStep(6); // Jump to Review
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === "F") {
        fillDevData();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const validateStep3 = () => {
    // TEMPORARILY DISABLED VALIDATION
    return true;
  };

  const validateStep4 = () => {
    // TEMPORARILY DISABLED VALIDATION
    return true;
  };

  const validateStep5 = () => {
    // TEMPORARILY DISABLED VALIDATION
    return true;
  };

  const validateStep6 = () => {
    // TEMPORARILY DISABLED VALIDATION
    return true;
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    setErrors({});
    
    const payload: VendorIntakeV2Payload = {
      ...formData as VendorIntakeV2Payload,
      submissionMetadata: {
        formVersion: "v2.0",
        submittedAt: new Date().toISOString(),
        completionTimeSeconds: Math.floor((Date.now() - formStartTime) / 1000),
      },
    };
    
    try {
      const res = await fetch("/api/vendor-intake-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal submit");
      setSubmitResult({ vendorId: data.vendor.id, registrationCode: data.vendor.registrationCode });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Gagal submit, coba lagi" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 2 && !validateStep3()) return;
    if (step === 3 && !validateStep4()) return;
    if (step === 4 && !validateStep5()) return;
    if (step === 5 && !validateStep6()) return;
    
    if (step < 6) setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isNextDisabled = () => {
    return false;
  };

  const getVisualStepIndex = () => {
    if (step <= 1) return step;
    if (step <= 5) return 2;
    return 3;
  };

  const getDetailSubStepLabel = () => {
    if (step < 2 || step > 5) return null;
    const subLabels = ["Identitas Mitra", "Profil Kapabilitas", "Kontak & Perbankan", "Kelengkapan Dokumen"];
    return `Langkah 3 dari 4 · ${subLabels[step - 2]}`;
  };

  if (submitResult) {
    return (
      <div className={styles.container}>
        <SuccessScreen 
          registrationCode={submitResult.registrationCode}
          vendorName={formData.name || ""}
          onReset={() => {
            setFormData({ entityType: undefined, relationshipType: undefined, declaredDocuments: [] });
            setStep(0);
            setSubmitResult(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.brandHeader}>
        <div className={styles.brandLogoRow}>
          <span className={styles.brandName}>JUARA</span>
          <span className={styles.brandLabel}>PARTNER</span>
          <button 
            onClick={fillDevData}
            style={{ 
              marginLeft: 'auto', 
              fontSize: '10px', 
              padding: '4px 8px', 
              borderRadius: '4px', 
              background: '#f1f5f9', 
              border: '1px solid #e2e8f0',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            [Test Fill]
          </button>
        </div>
        <p className={styles.brandTagline}>Membangun jaringan mitra event terkurasi</p>
      </header>

      <div className={styles.divider} />

      <div className={styles.formLayout}>
        <div className={styles.mainForm}>
          <Stepper currentStep={getVisualStepIndex()} steps={visualSteps} />
          
          {getDetailSubStepLabel() && (
            <span className={styles.subStepIndicator}>
              {getDetailSubStepLabel()}
            </span>
          )}

          <div className={styles.stepContent}>
            {(() => {
              switch (step) {
                case 0: return <Step1EntityType value={formData.entityType || null} onChange={(v) => updateField("entityType", v)} />;
                case 1: return <Step2SubType entityType={formData.entityType as EntityType} value={formData.relationshipType || null} onChange={(v) => updateField("relationshipType", v)} />;
                case 2: return <Step3Identity entityType={formData.entityType as EntityType} relationshipType={formData.relationshipType as RelationshipType} formData={formData} onChange={updateField} errors={errors} />;
                case 3: return <Step4Capability entityType={formData.entityType as EntityType} relationshipType={formData.relationshipType as RelationshipType} formData={formData} onChange={updateField} errors={errors} />;
                case 4: return <Step5ContactBank entityType={formData.entityType as EntityType} relationshipType={formData.relationshipType as RelationshipType} formData={formData} onChange={updateField} errors={errors} />;
                case 5: return <Step6Documents relationshipType={formData.relationshipType as RelationshipType} formData={formData} onChange={updateField} errors={errors} />;
                case 6: return <Step7Review formData={formData} onEdit={setStep} onSubmit={submitForm} isSubmitting={isSubmitting} submitError={errors.submit} />;
                default: return null;
              }
            })()}

            {step < 6 && (
              <div className={styles.navigation}>
                {step > 0 ? (
                  <button className={styles.btnSecondary} onClick={prevStep} disabled={isSubmitting}>
                    <ArrowLeft size={16} /> Kembali
                  </button>
                ) : <div />}

                <button 
                  className={styles.btnPrimary} 
                  onClick={nextStep}
                  disabled={isSubmitting}
                >
                  Lanjut <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info Card (Contextual) */}
        <div className={styles.sidebar}>
          {formData.relationshipType && step >= 2 && step <= 5 ? (() => {
            const type = formData.relationshipType;
            const meta: Record<string, { label: string; tax: string; payment: string; req: string }> = {
              vendor_rental: {
                label: "Vendor Rental",
                tax: "PPh 23 (2% atas nilai sewa). PPN 11% efektif jika PKP.",
                payment: "PO + Surat Jalan + Berita Acara Serah Terima (datang & pulang).",
                req: "Akta, NPWP badan, NIB, KTP direktur, Compro, daftar peralatan + spesifikasi, NDA."
              },
              vendor_service: {
                label: "Vendor Jasa",
                tax: "PPh 23 (2% atas nilai jasa). PPN 11% efektif jika PKP.",
                payment: "PO atau Kontrak + Berita Acara Pelaksanaan + Invoice.",
                req: "Akta, NPWP badan, NIB, KTP direktur, Compro, cakupan layanan, kapasitas crew, NDA."
              },
              vendor_supply: {
                label: "Vendor Supply",
                tax: "TIDAK kena PPh 23 (pembelian barang). PPN 11% efektif jika PKP.",
                payment: "PO + Surat Jalan + Faktur Pembelian.",
                req: "Akta, NPWP badan, NIB, KTP direktur, katalog produk + harga satuan, lead time produksi, NDA."
              },
              eo_partner: {
                label: "EO Partner",
                tax: formData.entityType === 'business' ? "PPh 23 (2%). PPN 11% efektif jika PKP." : "PPh 21 (progresif atau final 0,5% UMKM).",
                payment: "Kontrak kolaborasi. Pembayaran bertahap.",
                req: "Akta/KTP, NPWP, NIB, Compro/Portfolio, profil tim inti."
              },
              talent_agency: {
                label: "Talent Agency",
                tax: "PPh 23 (2%) atas fee agency. PPh 21 untuk talent.",
                payment: "Kontrak + Rider talent.",
                req: "Akta, NPWP, NIB, daftar talent under management, contoh kontrak talent, NDA."
              },
              talent: {
                label: "Talent / Performer",
                tax: "PPh 21. Final 0,5% jika punya NPWP UMKM.",
                payment: "Kontrak Talent + Rider. DP saat sign.",
                req: "KTP, NPWP pribadi (jika ada), Showreel/Demo, Rate card, Rider."
              },
              crew_lead: {
                label: "Crew Lead",
                tax: "PPh 21 ke nama Anda. Anda bayar tim sendiri.",
                payment: "SPK ke nama pribadi. Nilai mencakup seluruh tim.",
                req: "KTP, NPWP (jika ada), Portfolio project, statement tanggung jawab tim."
              },
              crew_individual: {
                label: "Crew Individu",
                tax: "PPh 21 (progresif).",
                payment: "SPK ke nama pribadi. Day rate.",
                req: "KTP, NPWP (jika ada), Sertifikat profesi (jika teknis), Day rate, NDA."
              },
              freelance: {
                label: "Creative Freelance",
                tax: "PPh 21. Final 0,5% jika NPWP UMKM.",
                payment: "PO atau SPK + Invoice (jika ada).",
                req: "KTP, NPWP (jika ada), Portfolio link/showreel, Rate card, Software keahlian."
              }
            };

            const activeMeta = meta[type] || {
              label: "Mitra JUARA",
              tax: "Sesuai ketentuan perpajakan yang berlaku.",
              payment: "Sesuai kesepakatan dalam kontrak atau PO.",
              req: "Dokumen identitas (KTP/NPWP), NIB (untuk badan), Portfolio/Compro."
            };

            return (
              <div className={styles.infoCard}>
                <div className={styles.badgeRow}>
                  <span className={styles.infoBadge}>{activeMeta.label}</span>
                </div>
                <div className={styles.infoSection}>
                  <h3>APA YANG DIBUTUHKAN?</h3>
                  <p>{activeMeta.req}</p>
                </div>
                <div className={styles.infoSection}>
                  <h3>PERLAKUAN PAJAK</h3>
                  <p>{activeMeta.tax}</p>
                </div>
                <div className={styles.infoSection}>
                  <h3>DASAR PEMBAYARAN</h3>
                  <p>{activeMeta.payment}</p>
                </div>
              </div>
            );
          })() : (
            <div className={styles.infoCard}>
              <div className={styles.infoSection}>
                <h3>PROSES VERIFIKASI</h3>
                <p>Tim Procurement JUARA akan melakukan review data dalam 2-3 hari kerja. Pastikan dokumen yang diunggah valid dan jelas.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
