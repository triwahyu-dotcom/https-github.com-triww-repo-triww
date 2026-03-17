"use client";

import { useState, useTransition } from "react";

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
    <div className="notion-shell vendor-form-shell" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <header className="vendor-form-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
        <em className="eyebrow" style={{ color: 'var(--blue)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>VENDOR PORTAL</em>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '12px 0 16px', letterSpacing: '-0.02em' }}>Track your verification</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          Enter your registration code to check your progress, document status, and review notes.
        </p>
      </header>

      <form className="project-card" onSubmit={handleSubmit} style={{ padding: '32px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '24px', marginBottom: '32px' }}>
        <section className="vendor-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Registration Code
            <input required value={form.registrationCode} onChange={(event) => setForm((current) => ({ ...current, registrationCode: event.target.value }))} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            Business Email (Optional)
            <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }} />
          </label>
        </section>

        {error ? (
          <div className="form-message error" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)', color: '#ff6b6b', marginBottom: '24px', fontSize: '0.9rem' }}>
            {error}
          </div>
        ) : null}

        <div className="vendor-form-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="primary-button" type="submit" disabled={pending} style={{ padding: '12px 24px', borderRadius: '999px', background: 'var(--blue)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
            {pending ? "Checking..." : "Check Status"}
          </button>
          <button className="ghost-button" onClick={handleMagicLinkRequest} type="button" disabled={magicLinkPending} style={{ padding: '12px 24px', borderRadius: '999px', border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>
            {magicLinkPending ? "Generating..." : "Generate Magic Link"}
          </button>
        </div>
        
        {magicLink ? (
          <div className="form-message success" style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', background: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.2)', color: '#34c759' }}>
            Magic Link created: <a href={magicLink} style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>Click here to access</a>
          </div>
        ) : null}
        {magicLinkError ? <p className="form-message error">{magicLinkError}</p> : null}

        {result ? (
          <div className="status-results" style={{ marginTop: '40px', borderTop: '1px solid var(--line)', paddingTop: '40px' }}>
            <header style={{ marginBottom: '24px' }}>
              <em className="mini-meta" style={{ color: 'var(--blue)' }}>VERIFICATION RESULT</em>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 0' }}>{result.vendor.name}</h2>
            </header>

            <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{ padding: '16px', background: 'var(--panel-soft)', borderRadius: '16px', border: '1px solid var(--line)' }}>
                <span className="mini-meta">REGISTRATION</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}>{result.vendor.registrationCode}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--panel-soft)', borderRadius: '16px', border: '1px solid var(--line)' }}>
                <span className="mini-meta">LIFECYCLE</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '4px', color: 'var(--blue)' }}>{result.vendor.lifecycleStatus}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--panel-soft)', borderRadius: '16px', border: '1px solid var(--line)' }}>
                <span className="mini-meta">REVIEW</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}>{result.vendor.reviewStatus}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--panel-soft)', borderRadius: '16px', border: '1px solid var(--line)' }}>
                <span className="mini-meta">DOCS</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}>{result.vendor.documentCompletion.complete}/{result.vendor.documentCompletion.required}</div>
              </div>
            </div>
            {result.vendor.latestReviewNote ? (
              <div className="alert-box" style={{ padding: '20px', borderRadius: '16px', background: 'var(--panel-soft)', border: '1px solid var(--line)', marginBottom: '32px' }}>
                <span className="mini-meta" style={{ display: 'block', marginBottom: '8px' }}>LATEST REVIEW NOTE</span>
                <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text)' }}>{result.vendor.latestReviewNote}</p>
              </div>
            ) : null}

            {result.vendor.activeRevisionRequest ? (
              <div className="revision-block" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--blue)', background: 'rgba(91, 140, 255, 0.05)', marginBottom: '32px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, color: 'var(--blue)', fontSize: '1.1rem' }}>Revision Required</h3>
                  <a href={`/vendor/revise/${result.vendor.activeRevisionRequest.editToken}`} className="primary-button" style={{ padding: '8px 20px', borderRadius: '999px', background: 'var(--blue)', color: 'white', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                    Open Revision Portal
                  </a>
                </header>
                {result.vendor.activeRevisionRequest.generalNote && (
                   <p style={{ fontSize: '0.9rem', marginBottom: '16px', opacity: 0.8 }}>{result.vendor.activeRevisionRequest.generalNote}</p>
                )}
                <div className="revision-items" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {result.vendor.activeRevisionRequest.items.map((item) => (
                    <div key={item.id} style={{ padding: '12px', background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                      <span className="mini-meta" style={{ color: 'var(--blue)' }}>{item.label}</span>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="timeline-block">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Verification Timeline</h3>
              <div className="timeline-stack" style={{ borderLeft: '1px solid var(--line)', paddingLeft: '24px', marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {result.vendor.reviews.slice(0, 6).map((item) => (
                  <div key={item.id} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-29px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--line)', border: '2px solid var(--panel)' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="eyebrow" style={{ fontSize: '0.75rem', color: 'var(--blue)' }}>{item.status.toUpperCase()}</span>
                      <span className="mini-meta" style={{ fontSize: '0.7rem' }}>{new Date(item.updatedAt).toLocaleDateString("id-ID")}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>{item.note || "No comments provided"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
