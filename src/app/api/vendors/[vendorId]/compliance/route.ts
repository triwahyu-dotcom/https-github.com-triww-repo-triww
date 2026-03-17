import { NextRequest, NextResponse } from "next/server";

import { updateVendorCompliance } from "@/lib/vendor/ops-store";
import { DocumentType, VendorComplianceItem } from "@/lib/vendor/types";

const DOCUMENT_TYPES: DocumentType[] = [
  "company_profile",
  "catalog",
  "npwp_scan",
  "owner_ktp",
  "nib",
  "invoice_sample",
  "pkp_certificate",
  "nda",
  "pic_ktp",
];

const COMPLIANCE_STATUSES: VendorComplianceItem["status"][] = ["valid", "expiring", "expired", "missing"];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ vendorId: string }> },
) {
  const { vendorId } = await context.params;
  const body = (await request.json()) as {
    documentType?: DocumentType;
    status?: VendorComplianceItem["status"];
    expiresAt?: string;
    note?: string;
  };

  if (!body.documentType || !DOCUMENT_TYPES.includes(body.documentType)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  if (!body.status || !COMPLIANCE_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid compliance status" }, { status: 400 });
  }

  const item = await updateVendorCompliance(vendorId, body.documentType, {
    status: body.status,
    expiresAt: String(body.expiresAt ?? "").trim(),
    note: String(body.note ?? "").trim(),
  });

  return NextResponse.json({ item });
}

