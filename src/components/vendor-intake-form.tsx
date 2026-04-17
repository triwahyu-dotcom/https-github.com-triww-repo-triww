"use client";

import { useMemo, useState, useTransition } from "react";
import { Locale, t } from "@/lib/vendor/i18n";
import { LegalStatus, TaxStatus } from "@/lib/vendor/types";

const INITIAL_FORM = {
  vendorName: "",
  services: "",
  email: "",
  businessAddress: "",
  legalStatus: "Freelance/Perorangan" as LegalStatus,
  taxStatus: "Non-PKP" as TaxStatus,
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
  npwpNumber: "",
  websiteUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  linkedinUrl: "",
  picName: "",
  picTitle: "",
  picPhone: "",
  picEmail: "",
  documentsFolderUrl: "",
};

type RevisionItem = {
  fieldKey: string;
  label: string;
  note: string;
  section: "identity" | "contact" | "documents" | "finance" | "services";
};

function isValidHttpUrl(value: string) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizePhoneToWhatsApp(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

export function VendorIntakeForm({
  serviceOptions,
  initialForm,
  mode = "new",
  revisionToken = "",
  revisionItems = [],
  generalRevisionNote = "",
}: {
  serviceOptions: string[];
  initialForm?: Partial<typeof INITIAL_FORM>;
  mode?: "new" | "revision";
  revisionToken?: string;
  revisionItems?: RevisionItem[];
  generalRevisionNote?: string;
}) {
  const [locale, setLocale] = useState<Locale>("id");
  const [form, setForm] = useState({ ...INITIAL_FORM, ...initialForm });
  const [message, setMessage] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const groupedRevisionItems = useMemo(() => revisionItems.reduce<Record<RevisionItem["section"], RevisionItem[]>>(
    (acc, item) => {
      acc[item.section] = [...(acc[item.section] ?? []), item];
      return acc;
    },
    { identity: [], contact: [], documents: [], finance: [], services: [] }
  ), [revisionItems]);

  const completedRevisionItems = revisionItems.filter((item) =>
    Boolean(form[item.fieldKey as keyof typeof INITIAL_FORM]?.toString().trim())
  ).length;

  const revisionProgress = revisionItems.length === 0 ? 100 : Math.round((completedRevisionItems / revisionItems.length) * 100);

  function updateField(name: keyof typeof INITIAL_FORM, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validateBeforeSubmit() {
    const errors: string[] = [];
    if (!form.vendorName.trim()) errors.push(locale === "id" ? "Nama vendor wajib diisi." : "Vendor name is required.");
    if (!form.services.trim()) errors.push(locale === "id" ? "Layanan wajib diisi." : "Services are required.");
    if (!form.picName.trim()) errors.push(locale === "id" ? "Nama PIC wajib diisi." : "PIC name is required.");
    if (!form.picPhone.trim()) errors.push(locale === "id" ? "No. WA PIC wajib diisi." : "PIC phone is required.");

    const normalizedPhone = normalizePhoneToWhatsApp(form.picPhone);
    if (!/^62\d{8,14}$/.test(normalizedPhone)) {
      errors.push(locale === "id" ? "Format No. WA PIC tidak valid." : "Invalid PIC phone/WhatsApp format.");
    }

    if (form.websiteUrl.trim() && !isValidHttpUrl(form.websiteUrl.trim())) {
      errors.push(locale === "id" ? "Website harus berupa URL valid." : "Website must be a valid URL.");
    }
    
    if (form.documentsFolderUrl.trim() && !isValidHttpUrl(form.documentsFolderUrl.trim())) {
      errors.push(locale === "id" ? "Link folder dokumen harus berupa URL valid." : "Document folder link must be a valid URL.");
    }

    if (!form.documentsFolderUrl.trim()) {
      errors.push(locale === "id" ? "Link folder dokumen wajib diisi." : "Document folder link is required.");
    }

    return errors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setRegistrationCode("");
    const validationErrors = validateBeforeSubmit();
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    startTransition(async () => {
      const response = await fetch(mode === "revision" ? `/api/vendor-revision/${revisionToken}` : "/api/vendor-intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { error?: string; vendor?: { registrationCode: string; portalUsername: string } };

      if (!response.ok) {
        setError(payload.error ?? (locale === "id" ? "Gagal mengirim data." : "Submission failed."));
        return;
      }

      setMessage(mode === "revision" ? t(locale, "successRevision") : t(locale, "successNew"));
      setRegistrationCode(payload.vendor?.registrationCode ?? "");
      if (mode === "new") {
        setForm(INITIAL_FORM);
      }
    });
  }

  return (
    <div className="notion-shell vendor-form-shell" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--panel-soft)', padding: '4px', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <button 
            type="button"
            onClick={() => setLocale("id")}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '8px', 
              fontSize: '0.75rem', 
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: locale === "id" ? 'var(--blue)' : 'transparent',
              color: locale === "id" ? 'white' : 'var(--muted)'
            }}
          >
            🇮🇩 ID
          </button>
          <button 
            type="button"
            onClick={() => setLocale("en")}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '8px', 
              fontSize: '0.75rem', 
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: locale === "en" ? 'var(--blue)' : 'transparent',
              color: locale === "en" ? 'white' : 'var(--muted)'
            }}
          >
            🇺🇸 EN
          </button>
        </div>
      </div>

      <form 
        className="vendor-form-card" 
        onSubmit={handleSubmit} 
        style={{ 
          padding: '40px', 
          background: 'rgba(255, 255, 255, 0.01)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '32px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          marginTop: '0'
        }}
      >
        {mode === "revision" ? (
          <section className="revision-highlight" style={{ marginBottom: '32px', padding: '20px', background: 'rgba(255, 107, 107, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 107, 107, 0.2)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px', color: '#ff6b6b' }}>{t(locale, "itemsToRevise")}</h3>
            {generalRevisionNote ? <p className="text-muted" style={{ marginBottom: '16px' }}>{generalRevisionNote}</p> : null}
            <div className="revision-progress" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                <strong>{t(locale, "revisionProgress")}</strong>
                <span>{completedRevisionItems}/{revisionItems.length}</span>
              </div>
              <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${revisionProgress}%`, background: '#ff6b6b', transition: 'width 0.3s' }} />
              </div>
            </div>
          </section>
        ) : null}

        <div className="form-section-title">{t(locale, "businessIdentity")}</div>
        <section className="form-grid-2" style={{ marginBottom: '32px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "vendorName")}
            <input required value={form.vendorName} onChange={(event) => updateField("vendorName", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "businessEmail")}
            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "servicesOffered")}
            <input
              required
              list="service-options"
              placeholder={t(locale, "servicesPlaceholder")}
              value={form.services}
              onChange={(event) => updateField("services", event.target.value)}
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}
            />
            <datalist id="service-options">
              {serviceOptions.map((service) => (
                <option key={service} value={service} />
              ))}
            </datalist>
          </label>
          <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "businessAddress")}
            <textarea 
              value={form.businessAddress} 
              onChange={(event) => updateField("businessAddress", event.target.value)} 
              rows={2}
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)', fontFamily: 'inherit' }} 
            />
          </label>
        </section>

        <div className="form-section-title">Legal & Operations</div>
        <section className="form-grid-3" style={{ marginBottom: '32px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "legalStatus")}
            <select value={form.legalStatus} onChange={(event) => updateField("legalStatus", event.target.value as LegalStatus)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}>
              <option value="Freelance/Perorangan">{locale === "id" ? "Freelance / Perorangan" : "Freelance / Individual"}</option>
              <option value="PT/CV">PT / CV (Company)</option>
              <option value="Lainnya">{locale === "id" ? "Lainnya" : "Other"}</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "taxStatus")}
            <select value={form.taxStatus} onChange={(event) => updateField("taxStatus", event.target.value as TaxStatus)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}>
              <option value="Non-PKP">Non-PKP</option>
              <option value="PKP">PKP</option>
            </select>
          </label>
        </section>

        <div className="form-section-title">{t(locale, "bankName")} & Tax</div>
        <section className="form-grid-2" style={{ marginBottom: '32px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "bankName")}
            <input value={form.bankName} onChange={(event) => updateField("bankName", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "bankAccountNumber")}
            <input value={form.bankAccountNumber} onChange={(event) => updateField("bankAccountNumber", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "bankAccountHolder")}
            <input value={form.bankAccountHolder} onChange={(event) => updateField("bankAccountHolder", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "npwpNumber")}
            <input value={form.npwpNumber} onChange={(event) => updateField("npwpNumber", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
        </section>

        <div className="form-section-title">{t(locale, "primaryContact")}</div>
        <section className="form-grid-2" style={{ marginBottom: '40px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "picName")}
            <input required value={form.picName} onChange={(event) => updateField("picName", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "picPhone")}
            <input required placeholder="6281..." value={form.picPhone} onChange={(event) => updateField("picPhone", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
        </section>

        <div className="form-section-title">{t(locale, "documentsAndLinks")}</div>
        <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 12px' }}>{t(locale, "downloadTemplates")}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <a href="/templates/NDA_Template_JUARA.docx" download className="chip" style={{ background: 'var(--panel-soft)', textDecoration: 'none', color: 'var(--text)', border: '1px solid var(--line)' }}>
              📄 {t(locale, "downloadNDA")}
            </a>
            <a href="/templates/Pernyataan_Non_PKP_JUARA.docx" download className="chip" style={{ background: 'var(--panel-soft)', textDecoration: 'none', color: 'var(--text)', border: '1px solid var(--line)' }}>
              📄 {t(locale, "downloadNonPKP")}
            </a>
          </div>
        </div>

        <section style={{ marginBottom: '40px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t(locale, "documentsFolderUrl")}
            <input 
              required
              placeholder="https://drive.google.com/..."
              value={form.documentsFolderUrl} 
              onChange={(event) => updateField("documentsFolderUrl", event.target.value)} 
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} 
            />
            <p className="mini-meta" style={{ marginTop: '4px' }}>
              {t(locale, "documentsFolderHint")}
            </p>
          </label>
        </section>

        {message ? (
          <div className="form-message success" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.2)', color: '#34c759', marginBottom: '24px', textAlign: 'center' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{message}</p>
            {registrationCode ? (
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '12px', display: 'inline-block' }}>
                <span className="mini-meta" style={{ display: 'block', color: 'inherit', opacity: 0.8, marginBottom: '4px' }}>{t(locale, "registrationCode")}</span>
                <strong style={{ fontSize: '1.5rem', letterSpacing: '0.1em' }}>{registrationCode}</strong>
              </div>
            ) : null}
          </div>
        ) : null}
        
        {error ? (
          <div className="form-message error" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)', color: '#ff6b6b', marginBottom: '24px', fontSize: '0.9rem' }}>
            {error}
          </div>
        ) : null}

        <div className="vendor-form-actions" style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <button 
            className="ghost-button" 
            type="submit" 
            disabled={pending}
            style={{ 
              padding: '16px 48px', 
              borderRadius: '999px', 
              fontSize: '1rem', 
              fontWeight: 700, 
              background: 'var(--blue)', 
              color: 'white', 
              border: 'none', 
              cursor: pending ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(91, 140, 255, 0.3)',
              transition: 'transform 0.2s, background 0.2s'
            }}
          >
            {pending ? t(locale, "submitting") : mode === "revision" ? t(locale, "updateVendorProfile") : t(locale, "submitVendorProfile")}
          </button>
        </div>
      </form>
    </div>
  );
}
