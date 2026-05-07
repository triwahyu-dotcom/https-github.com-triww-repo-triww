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

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    const data = formData;
    const isBusiness = data.entityType === "business";

    if (!data.name || data.name.trim().length < 3) {
      newErrors.name = "Nama minimal 3 karakter";
    }

    if (isBusiness) {
      if (!data.legalEntityForm) newErrors.legalEntityForm = "Pilih bentuk badan usaha";
      if (!data.taxStatus) newErrors.taxStatus = "Pilih status PKP";
      const npwpErr = validateNPWP(data.npwpNumber || "", true);
      if (npwpErr) newErrors.npwpNumber = npwpErr;
      const nibDigits = (data.nibNumber || "").replace(/\D/g, "");
      if (nibDigits.length !== 13) newErrors.nibNumber = "NIB harus 13 digit";
    } else {
      if (!data.domicileCity) newErrors.domicileCity = "Kota domisili wajib diisi";
      if (data.relationshipType === "eo_partner" && !data.stageBrandName?.trim()) {
        newErrors.stageBrandName = "Brand Name EO wajib diisi";
      }
      const nikErr = validateNIK(data.nikNumber || "");
      if (nikErr) newErrors.nikNumber = nikErr;
      if (data.personalNpwpNumber) {
        const pNpwpErr = validateNPWP(data.personalNpwpNumber, false);
        if (pNpwpErr) newErrors.personalNpwpNumber = pNpwpErr;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};
    const data = formData;
    const type = data.relationshipType;

    const checkMinOne = (field: string, label: string) => {
      if (!data[field as keyof VendorIntakeV2Payload] || (data[field as keyof VendorIntakeV2Payload] as any[]).length === 0) {
        newErrors[field] = `Pilih minimal satu ${label}`;
      }
    };
    const checkRequired = (field: string, msg: string) => {
      if (data[field as keyof VendorIntakeV2Payload] === undefined || data[field as keyof VendorIntakeV2Payload] === null || data[field as keyof VendorIntakeV2Payload]?.toString().trim() === "") {
        newErrors[field] = msg;
      }
    };

    switch (type) {
      case "vendor_rental":
        checkMinOne("rentalCategories", "kategori");
        checkRequired("withOperator", "Pilih status operator");
        checkRequired("capacityNotes", "Isi kapasitas stok peralatan");
        checkMinOne("includedServices", "layanan");
        checkRequired("pricingModel", "Pilih pricing model");
        checkRequired("operatingCities", "Isi kota operasi");
        break;
      case "vendor_service":
        checkMinOne("services", "layanan");
        checkRequired("capacityNotes", "Isi kapasitas operasi");
        checkRequired("operatingCities", "Isi kota operasi");
        break;
      case "vendor_supply":
        checkMinOne("services", "kategori produk");
        checkRequired("productList", "Isi daftar produk");
        checkRequired("operatingCities", "Isi kota operasi");
        break;
      case "eo_partner":
        checkMinOne("services", "spesialisasi");
        checkRequired("capacityNotes", "Isi skala project");
        checkRequired("experienceCount", "Isi jumlah project");
        checkRequired("operatingCities", "Isi kota operasi");
        if (data.entityType === "individual") {
          checkRequired("teamComposition", "Isi komposisi tim");
          if (!data.teamResponsibilityAccepted) newErrors.teamResponsibilityAccepted = "Persetujuan tanggung jawab tim wajib dicentang";
        }
        break;
      case "talent_agency":
        checkMinOne("services", "tipe talent");
        checkRequired("capacityNotes", "Isi jumlah talent");
        checkRequired("operatingCities", "Isi kota operasi");
        break;
      case "talent":
        checkRequired("performerType", "Pilih tipe performer");
        checkRequired("genre", "Isi genre/spesialisasi");
        checkRequired("experienceCount", "Isi pengalaman panggung");
        checkRequired("operatingCities", "Isi kota operasi");
        break;
      case "crew_lead":
        checkRequired("crewLeadRole", "Pilih role utama");
        checkRequired("teamComposition", "Isi komposisi tim");
        checkRequired("teamSize", "Isi total tim");
        checkRequired("teamExperience", "Isi pengalaman bersama tim");
        checkRequired("teamDayRate", "Isi day rate tim");
        checkRequired("operatingCities", "Isi kota operasi");
        if (!data.teamResponsibilityAccepted) newErrors.teamResponsibilityAccepted = "Persetujuan tanggung jawab tim wajib dicentang";
        break;
      case "crew_individual":
        checkRequired("crewRole", "Pilih role spesialisasi");
        checkRequired("experienceCount", "Isi jumlah project");
        checkRequired("dayRate", "Isi day rate");
        checkRequired("operatingCities", "Isi kota operasi");
        break;
      case "freelance":
        checkRequired("creativeSpecialty", "Pilih spesialisasi utama");
        checkRequired("softwareSkills", "Isi software keahlian");
        checkRequired("ratePerProject", "Isi rate project");
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep5 = () => {
    const newErrors: Record<string, string> = {};
    const data = formData;
    const isBusiness = data.entityType === "business";

    if (!data.bankName) newErrors.bankName = "Pilih bank";
    const bankAccErr = validateBankAccount(data.bankAccountNumber || "");
    if (bankAccErr) newErrors.bankAccountNumber = bankAccErr;
    const holderErr = validateAccountHolder(data.bankAccountHolder || "");
    if (holderErr) newErrors.bankAccountHolder = holderErr;

    if (isBusiness) {
      const addrErr = validateMinLength(data.businessAddress || "", 20, "Alamat bisnis");
      if (addrErr) newErrors.businessAddress = addrErr;
      const bizEmail = validateEmail(data.email || "");
      if (bizEmail) newErrors.email = bizEmail;
      if (!data.picName || data.picName.trim().length < 3) newErrors.picName = "Nama PIC minimal 3 karakter";
      if (!data.picTitle) newErrors.picTitle = "Jabatan PIC wajib diisi";
      const picPhone = validatePhone(data.picPhone || "");
      if (picPhone.error) newErrors.picPhone = picPhone.error;
      const picEmail = validateEmail(data.picEmail || "");
      if (picEmail) newErrors.picEmail = picEmail;
    } else {
      const emailErr = validateEmail(data.email || "");
      if (emailErr) newErrors.email = emailErr;
      const phoneErr = validatePhone(data.picPhone || "");
      if (phoneErr.error) newErrors.picPhone = phoneErr.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep6 = () => {
    const newErrors: Record<string, string> = {};
    const driveUrl = formData.documentsFolderUrl || "";
    if (!driveUrl.startsWith("https://drive.google.com/drive/folders/")) {
      newErrors.documentsFolderUrl = "Link harus berupa Google Drive folder yang valid.";
    } else if (driveUrl.length < 50) {
      newErrors.documentsFolderUrl = "Link folder tidak valid (ID folder hilang).";
    }

    const requiredDocs = getRequiredDocs(formData.relationshipType as RelationshipType).filter(d => d.required).map(d => d.name);
    const declaredDocs = formData.declaredDocuments || [];
    const missing = requiredDocs.filter(d => !declaredDocs.includes(d));

    if (missing.length > 0) {
      newErrors.declaredDocuments = "Mohon centang semua dokumen wajib.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    if (step === 0 && !formData.entityType) return true;
    if (step === 1 && !formData.relationshipType) return true;
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
      <SuccessScreen 
        registrationCode={submitResult.registrationCode}
        vendorName={formData.name || ""}
        onReset={() => {
          setFormData({ entityType: undefined, relationshipType: undefined, declaredDocuments: [] });
          setStep(0);
          setSubmitResult(null);
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.brandHeader}>
        <div className={styles.brandLogoRow}>
          <span className={styles.brandName}>JUARA</span>
          <span className={styles.brandLabel}>PARTNER</span>
        </div>
        <p className={styles.brandTagline}>Membangun jaringan mitra event terkurasi</p>
      </header>

      <div className={styles.divider} />

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
              disabled={isNextDisabled() || isSubmitting}
            >
              Lanjut <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
