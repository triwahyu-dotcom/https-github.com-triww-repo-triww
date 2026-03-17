"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

const INITIAL_FORM = {
  vendorName: "",
  services: "",
  coverageArea: "",
  email: "",
  legalStatus: "Freelance/Perorangan",
  taxStatus: "Non-PKP",
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
  companyProfileUrl: "",
  catalogUrl: "",
  npwpScanUrl: "",
  ownerKtpUrl: "",
  nibUrl: "",
  invoiceSampleUrl: "",
  pkpCertificateUrl: "",
  ndaUrl: "",
  picKtpUrl: "",
};

type RevisionItem = {
  fieldKey: string;
  label: string;
  note: string;
  section: "identity" | "contact" | "documents" | "finance" | "services";
};

const SECTION_LABELS: Record<RevisionItem["section"], string> = {
  identity: "Identitas",
  contact: "Kontak",
  documents: "Dokumen",
  finance: "Keuangan",
  services: "Layanan",
};

const FIELD_LABELS: Record<keyof typeof INITIAL_FORM, string> = {
  vendorName: "Vendor name",
  services: "Services",
  coverageArea: "Coverage area",
  email: "Business email",
  legalStatus: "Legal status",
  taxStatus: "Tax status",
  bankName: "Bank name",
  bankAccountNumber: "Bank account number",
  bankAccountHolder: "Bank account holder",
  npwpNumber: "NPWP number",
  websiteUrl: "Website",
  instagramUrl: "Instagram",
  tiktokUrl: "TikTok",
  linkedinUrl: "LinkedIn",
  picName: "PIC name",
  picTitle: "PIC title",
  picPhone: "PIC phone",
  picEmail: "PIC email",
  companyProfileUrl: "Company profile",
  catalogUrl: "Catalog",
  npwpScanUrl: "NPWP scan",
  ownerKtpUrl: "Owner KTP",
  nibUrl: "NIB",
  invoiceSampleUrl: "Invoice sample",
  pkpCertificateUrl: "PKP certificate",
  ndaUrl: "NDA",
  picKtpUrl: "PIC KTP",
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
  const [form, setForm] = useState({ ...INITIAL_FORM, ...initialForm });
  const [message, setMessage] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const groupedRevisionItems = revisionItems.reduce<Record<RevisionItem["section"], RevisionItem[]>>(
    (acc, item) => {
      acc[item.section] = [...(acc[item.section] ?? []), item];
      return acc;
    },
    { identity: [], contact: [], documents: [], finance: [], services: [] },
  );
  const completedRevisionItems = revisionItems.filter((item) =>
    Boolean(form[item.fieldKey as keyof typeof INITIAL_FORM]?.trim()),
  ).length;
  const revisionProgress = revisionItems.length === 0 ? 100 : Math.round((completedRevisionItems / revisionItems.length) * 100);

  function updateField(name: keyof typeof INITIAL_FORM, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validateBeforeSubmit() {
    const errors: string[] = [];
    if (!form.vendorName.trim()) errors.push("Vendor name wajib diisi.");
    if (!form.services.trim()) errors.push("Services wajib diisi.");
    if (!form.picName.trim()) errors.push("PIC name wajib diisi.");
    if (!form.picPhone.trim()) errors.push("PIC phone wajib diisi.");

    const normalizedPhone = normalizePhoneToWhatsApp(form.picPhone);
    if (!/^62\d{8,14}$/.test(normalizedPhone)) {
      errors.push("Format PIC phone/WhatsApp tidak valid.");
    }

    const urlKeys: (keyof typeof INITIAL_FORM)[] = [
      "websiteUrl",
      "instagramUrl",
      "tiktokUrl",
      "linkedinUrl",
      "companyProfileUrl",
      "catalogUrl",
      "npwpScanUrl",
      "ownerKtpUrl",
      "nibUrl",
      "invoiceSampleUrl",
      "pkpCertificateUrl",
      "ndaUrl",
      "picKtpUrl",
    ];
    for (const key of urlKeys) {
      if (form[key].trim() && !isValidHttpUrl(form[key].trim())) {
        errors.push(`${FIELD_LABELS[key]} harus URL valid (http/https).`);
      }
    }

    const requiredDocsByLegalStatus: Record<string, (keyof typeof INITIAL_FORM)[]> = {
      "PT/CV": ["companyProfileUrl", "npwpScanUrl", "ownerKtpUrl", "nibUrl", "pkpCertificateUrl", "ndaUrl", "picKtpUrl"],
      "Freelance/Perorangan": ["companyProfileUrl", "npwpScanUrl", "ownerKtpUrl", "ndaUrl", "picKtpUrl"],
      Lainnya: ["companyProfileUrl", "ndaUrl", "picKtpUrl"],
    };

    for (const key of requiredDocsByLegalStatus[form.legalStatus] ?? []) {
      if (!form[key].trim()) {
        errors.push(`${FIELD_LABELS[key]} wajib diisi untuk ${form.legalStatus}.`);
      }
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
        setError(payload.error ?? "Submission failed.");
        return;
      }

      setMessage(
        mode === "revision"
          ? "Revision submitted successfully. Our admin team will review the updated data."
          : "Submission sent successfully. Our admin team will review your vendor profile and contact you if revisions are needed.",
      );
      setRegistrationCode(payload.vendor?.registrationCode ?? "");
      if (mode === "new") {
        setForm(INITIAL_FORM);
      }
    });
  }

  return (
    <div className="notion-shell vendor-form-shell" style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      <header className="vendor-form-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
        <em className="eyebrow" style={{ color: 'var(--blue)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>VENDOR PORTAL</em>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '12px 0 16px', letterSpacing: '-0.02em' }}>
          {mode === "revision" ? "Revise your profile" : "Join our community"}
        </h1>
        <p className="text-muted" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          {mode === "revision"
            ? "Please update the requested fields below to complete your verification."
            : "Connect with our procurement team by sharing your company details and capabilities."}
        </p>
        <div className="vendor-form-links" style={{ justifyContent: 'center' }}>
          <Link href="/vendor/status" className="chip active" style={{ padding: '8px 16px', borderRadius: '20px' }}>Check status</Link>
          <Link href="/vendors" className="chip" style={{ padding: '8px 16px', borderRadius: '20px' }}>Admin Dashboard</Link>
        </div>
      </header>

      <form className="project-card vendor-form-card" onSubmit={handleSubmit} style={{ padding: '32px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '24px' }}>
        {mode === "revision" ? (
          <section className="revision-highlight" style={{ marginBottom: '32px', padding: '20px', background: 'rgba(255, 107, 107, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 107, 107, 0.2)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px', color: '#ff6b6b' }}>Items to revise</h3>
            {generalRevisionNote ? <p className="text-muted" style={{ marginBottom: '16px' }}>{generalRevisionNote}</p> : null}
            <div className="revision-progress" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                <strong>Revision Progress</strong>
                <span>{completedRevisionItems}/{revisionItems.length}</span>
              </div>
              <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${revisionProgress}%`, background: '#ff6b6b', transition: 'width 0.3s' }} />
              </div>
            </div>
            <div className="revision-items-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {(Object.keys(groupedRevisionItems) as RevisionItem["section"][])
                .filter((section) => groupedRevisionItems[section].length > 0)
                .map((section) => (
                  <div key={section} style={{ padding: '12px', background: 'var(--panel-soft)', borderRadius: '12px' }}>
                    <em className="mini-meta" style={{ display: 'block', marginBottom: '4px' }}>{SECTION_LABELS[section]}</em>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.85rem' }}>
                      {groupedRevisionItems[section].map((item) => (
                        <li key={`${item.section}-${item.fieldKey}`} style={{ marginBottom: '4px' }}>
                          <strong className="text-main">{item.label}</strong>: {item.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </section>
        ) : null}
        <section className="vendor-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <h2 className="full" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>Business Identity</h2>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Vendor Name
            <input required value={form.vendorName} onChange={(event) => updateField("vendorName", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Business Email
            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Services Offered
            <input
              required
              list="service-options"
              placeholder="e.g. Stage Decoration, LED Screen, Catering"
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
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Coverage Area
            <input value={form.coverageArea} onChange={(event) => updateField("coverageArea", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Legal Status
            <select value={form.legalStatus} onChange={(event) => updateField("legalStatus", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}>
              <option value="Freelance/Perorangan">Freelance/Perorangan</option>
              <option value="PT/CV">PT/CV</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Tax Status
            <select value={form.taxStatus} onChange={(event) => updateField("taxStatus", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}>
              <option value="Non-PKP">Non-PKP</option>
              <option value="PKP">PKP</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Bank Name
            <input value={form.bankName} onChange={(event) => updateField("bankName", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Account Number
            <input value={form.bankAccountNumber} onChange={(event) => updateField("bankAccountNumber", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Account Holder
            <input value={form.bankAccountHolder} onChange={(event) => updateField("bankAccountHolder", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            NPWP Number
            <input value={form.npwpNumber} onChange={(event) => updateField("npwpNumber", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Website
            <input value={form.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Instagram
            <input value={form.instagramUrl} onChange={(event) => updateField("instagramUrl", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
        </section>

        <section className="vendor-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <h2 className="full" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>Primary Contact</h2>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            PIC Name
            <input required value={form.picName} onChange={(event) => updateField("picName", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            PIC Title
            <input value={form.picTitle} onChange={(event) => updateField("picTitle", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            PIC Phone / WhatsApp
            <input required value={form.picPhone} onChange={(event) => updateField("picPhone", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            PIC Email
            <input type="email" value={form.picEmail} onChange={(event) => updateField("picEmail", event.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
        </section>

        <section className="vendor-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <header className="full" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Documents & Links</h2>
            <p className="mini-meta" style={{ marginTop: '4px' }}>Provide accessible links (Google Drive, Dropbox, etc.)</p>
          </header>
          {[
            { key: "companyProfileUrl", label: "Company Profile" },
            { key: "catalogUrl", label: "Catalog / Pricelist" },
            { key: "npwpScanUrl", label: "NPWP Scan" },
            { key: "ownerKtpUrl", label: "Owner KTP" },
            { key: "nibUrl", label: "NIB" },
            { key: "invoiceSampleUrl", label: "Invoice Sample" },
            { key: "pkpCertificateUrl", label: "PKP/Non-PKP Certificate" },
            { key: "ndaUrl", label: "NDA" },
            { key: "picKtpUrl", label: "PIC KTP" }
          ].map((field) => (
            <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
              {field.label}
              <input 
                placeholder="https://..."
                value={form[field.key as keyof typeof INITIAL_FORM]} 
                onChange={(event) => updateField(field.key as keyof typeof INITIAL_FORM, event.target.value)} 
                style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} 
              />
            </label>
          ))}
        </section>

        {message ? (
          <div className="form-message success" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.2)', color: '#34c759', marginBottom: '24px', textAlign: 'center' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{message}</p>
            {registrationCode ? (
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '12px', display: 'inline-block' }}>
                <span className="mini-meta" style={{ display: 'block', color: 'inherit', opacity: 0.8, marginBottom: '4px' }}>YOUR REGISTRATION CODE</span>
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
            {pending ? "Submitting..." : mode === "revision" ? "Update Profile" : "Create Vendor Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
