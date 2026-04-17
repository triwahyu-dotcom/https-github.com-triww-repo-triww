import { VendorIntakeForm } from "@/components/vendor-intake-form";
import { getDashboardData, getVendorByRevisionToken } from "@/lib/vendor/store";

export const dynamic = "force-dynamic";

export default async function VendorRevisionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [dashboard, revisionData] = await Promise.all([getDashboardData(), getVendorByRevisionToken(token)]);

  if (!revisionData) {
    return (
      <main className="vendor-form-shell">
        <div className="vendor-form-card">
          <h1>Revision link invalid</h1>
          <p>Link revisi tidak valid atau sudah kedaluwarsa.</p>
        </div>
      </main>
    );
  }

  const vendor = revisionData.vendor;

  return (
    <VendorIntakeForm
      serviceOptions={dashboard.services}
      mode="revision"
      revisionToken={token}
      generalRevisionNote={revisionData.revision.generalNote}
      revisionItems={revisionData.revision.items}
      initialForm={{
        vendorName: vendor.name,
        services: vendor.serviceNames.join(", "),
        email: vendor.email,
        legalStatus: vendor.legalStatus,
        taxStatus: vendor.taxStatus,
        bankName: vendor.bankName,
        bankAccountNumber: vendor.bankAccountNumber,
        bankAccountHolder: vendor.bankAccountHolder,
        npwpNumber: vendor.npwpNumber,
        businessAddress: vendor.businessAddress,
        websiteUrl: vendor.websiteUrl,
        instagramUrl: vendor.instagramUrl,
        tiktokUrl: vendor.tiktokUrl,
        linkedinUrl: vendor.linkedinUrl,
        picName: vendor.contacts[0]?.name ?? "",
        picTitle: vendor.contacts[0]?.title ?? "",
        picPhone: vendor.contacts[0]?.phone ?? "",
        picEmail: vendor.contacts[0]?.email ?? "",
        documentsFolderUrl: vendor.documentsFolderUrl,
      }}
    />
  );
}

