import Link from "next/link";

import { getVendorByPortalToken } from "@/lib/vendor/store";

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function VendorMySubmissionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await getVendorByPortalToken(token);

  if (!payload) {
    return (
      <main className="vendor-form-shell">
        <div className="vendor-form-card">
          <h1>Magic link invalid</h1>
          <p>Link tidak valid atau sudah kedaluwarsa. Minta link baru dari halaman status vendor.</p>
          <Link className="ghost-button" href="/vendor/status">
            Kembali ke portal status
          </Link>
        </div>
      </main>
    );
  }

  const { vendor, expiresAt } = payload;
  const timeline = vendor.reviews
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return (
    <main className="vendor-form-shell">
      <div className="vendor-form-cover">
        <div className="vendor-form-copy">
          <p className="vendor-form-kicker">Vendor Portal</p>
          <h1>My Submission</h1>
          <p>Ringkasan status pendaftaran vendor dan catatan review terbaru.</p>
        </div>
      </div>

      <section className="vendor-form-card">
        <h2>{vendor.name}</h2>
        <div className="property-list">
          <div><span>Registration</span><strong>{vendor.registrationCode}</strong></div>
          <div><span>Review</span><strong>{vendor.reviewStatus}</strong></div>
          <div><span>Lifecycle</span><strong>{vendor.lifecycleStatus}</strong></div>
          <div><span>Documents</span><strong>{vendor.documentCompletion.complete}/{vendor.documentCompletion.required}</strong></div>
          <div><span>Expires</span><strong>{formatDate(expiresAt)}</strong></div>
        </div>
        {vendor.latestReviewNote ? <p className="detail-client">{vendor.latestReviewNote}</p> : null}
        {vendor.activeRevisionRequest ? (
          <div className="detail-block">
            <h3>Perlu revisi</h3>
            {vendor.activeRevisionRequest.generalNote ? <p className="detail-client">{vendor.activeRevisionRequest.generalNote}</p> : null}
            <div className="compact-note-stack">
              {vendor.activeRevisionRequest.items.map((item) => (
                <article key={item.id}>
                  <span>{item.label}</span>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
            <Link className="ghost-button" href={`/vendor/revise/${vendor.activeRevisionRequest.editToken}`}>
              Buka form revisi
            </Link>
          </div>
        ) : null}
      </section>

      <section className="vendor-form-card">
        <h3>Timeline status</h3>
        <div className="compact-note-stack">
          {timeline.map((item) => (
            <article key={item.id}>
              <span>{item.status}</span>
              <p>{item.note || "-"}</p>
              <small>{formatDate(item.updatedAt)}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
