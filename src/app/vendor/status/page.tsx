"use client";

import { useState, useTransition, useEffect } from "react";

type StatusPayload = {
  registrationCode: string;
  email: string;
  phone: string;
};

type VendorStatusResult = {
  vendor: {
    name: string;
    registrationCode: string;
    lifecycleStatus: string;
    reviewStatus: string;
    documentCompletion: {
      complete: number;
      required: number;
      missingLabels: string[];
    };
    latestReviewNote: string;
    sourceTimestamp: string;
    activeRevisionRequest: null | {
      generalNote: string;
      editToken: string;
      items: { id: string; label: string; note: string }[];
    };
    reviews: { id: string; status: string; note: string; updatedAt: string }[];
  };
};

const INITIAL_FORM: StatusPayload = {
  registrationCode: "",
  email: "",
  phone: "",
};

export default function VendorStatusPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState<VendorStatusResult | null>(null);
  const [error, setError] = useState("");
  const [magicLink, setMagicLink] = useState("");
  const [magicLinkError, setMagicLinkError] = useState("");
  const [magicLinkPending, startMagicLinkTransition] = useTransition();
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setMagicLink("");
    setMagicLinkError("");

    startTransition(async () => {
      const response = await fetch("/api/vendor-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as VendorStatusResult & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Status tidak ditemukan.");
        return;
      }

      setResult(payload);
    });
  }

  async function handleMagicLinkRequest() {
    setMagicLink("");
    setMagicLinkError("");
    startMagicLinkTransition(async () => {
      const response = await fetch("/api/vendor-status/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationCode: form.registrationCode,
          email: form.email,
          phone: form.phone,
        }),
      });
      const payload = (await response.json()) as { error?: string; access?: { linkPath: string } };
      if (!response.ok || !payload.access) {
        setMagicLinkError(payload.error ?? "Gagal membuat magic link.");
        return;
      }
      setMagicLink(payload.access.linkPath);
    });
  }

  return (
    <div className="v2-status-shell" style={{ background: '#FAF9F7', minHeight: '100vh', padding: '60px 20px', color: '#0A0A0A', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
      <header style={{ maxWidth: '600px', margin: '0 auto 48px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>JUARA</span>
          <span style={{ fontWeight: 600, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A8A' }}>STATUS PORTAL</span>
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Pantau Status Pendaftaran</h1>
        <p style={{ fontSize: '15px', color: '#525252', lineHeight: 1.6, margin: 0 }}>
          Masukkan kode registrasi Anda untuk melihat progres verifikasi, status dokumen, dan catatan dari tim procurement.
        </p>
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit} style={{ background: '#FFFFFF', border: '1px solid #ECEAE5', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 2px rgba(10, 10, 10, 0.04), 0 4px 12px rgba(10, 10, 10, 0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#525252' }}>ID Pendaftaran (Registration Code)</label>
              <input 
                required 
                placeholder="JU-2026-XXXXX"
                value={form.registrationCode} 
                onChange={(event) => setForm((current) => ({ ...current, registrationCode: event.target.value }))} 
                style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #DCD9D2', background: '#FFFFFF', color: '#0A0A0A', fontSize: '14px', outline: 'none' }} 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#525252' }}>Email Bisnis (Opsional)</label>
              <input 
                placeholder="email@perusahaan.com"
                value={form.email} 
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} 
                style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #DCD9D2', background: '#FFFFFF', color: '#0A0A0A', fontSize: '14px', outline: 'none' }} 
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#FFEBEB', border: '1px solid #C5303020', color: '#C53030', marginBottom: '24px', fontSize: '13px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              type="submit" 
              disabled={pending} 
              style={{ padding: '14px', borderRadius: '8px', background: '#0A0A0A', color: '#FAF9F7', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {pending ? "Mengecek..." : "Cek Status Sekarang"}
            </button>
            
            <div style={{ position: 'relative', textAlign: 'center', margin: '8px 0' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#ECEAE5', zIndex: 0 }}></div>
              <span style={{ position: 'relative', background: '#FFFFFF', padding: '0 12px', fontSize: '12px', color: '#8A8A8A', zIndex: 1 }}>atau</span>
            </div>

            <button 
              onClick={handleMagicLinkRequest} 
              type="button" 
              disabled={magicLinkPending} 
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #DCD9D2', background: 'transparent', color: '#525252', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            >
              {magicLinkPending ? "Sedang Membuat..." : "Gunakan Magic Link (Akses Cepat)"}
            </button>
          </div>
          
          {magicLink && (
            <div style={{ marginTop: '20px', padding: '12px', borderRadius: '8px', background: '#E8F5EC', border: '1px solid #2D7A3F20', color: '#2D7A3F', fontSize: '13px' }}>
              Magic Link berhasil dibuat: <a href={magicLink} style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>Klik di sini untuk masuk otomatis</a>
            </div>
          )}
        </form>

        {result && (
          <div style={{ marginTop: '40px', animation: 'fadeIn 0.5s ease-out' }}>
            <header style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #ECEAE5' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#8A8A8A', textTransform: 'uppercase' }}>HASIL VERIFIKASI</span>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.02em' }}>{result.vendor.name}</h2>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '32px' }}>
              <div style={{ padding: '16px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #ECEAE5' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#8A8A8A' }}>STATUS UTAMA</span>
                <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '4px', color: '#D84315' }}>{result.vendor.lifecycleStatus.toUpperCase()}</div>
              </div>
              <div style={{ padding: '16px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #ECEAE5' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#8A8A8A' }}>KELENGKAPAN DOKUMEN</span>
                <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '4px' }}>{result.vendor.documentCompletion.complete} / {result.vendor.documentCompletion.required}</div>
              </div>
            </div>

            {result.vendor.activeRevisionRequest && (
              <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid #D84315', background: '#FFF1ED', marginBottom: '32px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: '#D84315', fontSize: '16px', fontWeight: 700 }}>Perlu Revisi Data</h3>
                  <a href={`/vendor/revise/${result.vendor.activeRevisionRequest.editToken}`} style={{ padding: '8px 16px', borderRadius: '6px', background: '#D84315', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                    Buka Portal Revisi
                  </a>
                </header>
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#0A0A0A', margin: '0 0 16px' }}>{result.vendor.activeRevisionRequest.generalNote || "Terdapat beberapa data yang perlu diperbaiki sesuai catatan di bawah ini."}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.vendor.activeRevisionRequest.items.map((item) => (
                    <div key={item.id} style={{ padding: '10px 14px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid rgba(216, 67, 21, 0.2)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#D84315' }}>{item.label}</span>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#525252' }}>{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#FFFFFF', border: '1px solid #ECEAE5', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px', color: '#0A0A0A' }}>Timeline Verifikasi</h3>
              <div style={{ borderLeft: '1px solid #ECEAE5', paddingLeft: '24px', marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {result.vendor.reviews.slice(0, 6).map((item) => (
                  <div key={item.id} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-29px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: '#DCD9D2', border: '2px solid #FFFFFF' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0A0A0A' }}>{item.status.toUpperCase()}</span>
                      <span style={{ fontSize: '11px', color: '#8A8A8A' }}>{new Date(item.updatedAt).toLocaleDateString("id-ID")}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#525252', lineHeight: 1.5 }}>{item.note || "Sedang dalam tahap peninjauan."}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
