import { NextRequest, NextResponse } from "next/server";

import { submitVendorIntake, validateVendorIntakePayload, VendorIntakePayload } from "@/lib/vendor/store";

function parseServices(value: unknown) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;

  const payload: VendorIntakePayload = {
    vendorName: String(body.vendorName ?? "").trim(),
    services: parseServices(body.services),
    email: String(body.email ?? "").trim(),
    legalStatus: (String(body.legalStatus ?? "Unknown").trim() as VendorIntakePayload["legalStatus"]),
    taxStatus: (String(body.taxStatus ?? "Unknown").trim() as VendorIntakePayload["taxStatus"]),
    bankName: String(body.bankName ?? "").trim(),
    bankAccountNumber: String(body.bankAccountNumber ?? "").trim(),
    bankAccountHolder: String(body.bankAccountHolder ?? "").trim(),
    npwpNumber: String(body.npwpNumber ?? "").trim(),
    websiteUrl: String(body.websiteUrl ?? "").trim(),
    instagramUrl: String(body.instagramUrl ?? "").trim(),
    tiktokUrl: String(body.tiktokUrl ?? "").trim(),
    linkedinUrl: String(body.linkedinUrl ?? "").trim(),
    businessAddress: String(body.businessAddress ?? "").trim(),
    documentsFolderUrl: String(body.documentsFolderUrl ?? "").trim(),
    picName: String(body.picName ?? "").trim(),
    picTitle: String(body.picTitle ?? "").trim(),
    picPhone: String(body.picPhone ?? "").trim(),
    picEmail: String(body.picEmail ?? "").trim(),
  };

  const validationErrors = validateVendorIntakePayload(payload);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: validationErrors[0] },
      { status: 400 },
    );
  }

  try {
    const vendor = await submitVendorIntake(payload);
    return NextResponse.json({ vendor });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed" },
      { status: 400 },
    );
  }
}
