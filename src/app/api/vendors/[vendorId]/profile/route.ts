import { NextRequest, NextResponse } from "next/server";

import { upsertVendorOpsProfile } from "@/lib/vendor/ops-store";

function parseCities(value: unknown) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ vendorId: string }> },
) {
  const { vendorId } = await context.params;
  const body = (await request.json()) as {
    rateCardNotes?: string;
    availabilityNotes?: string;
    cities?: string;
    accountManager?: string;
  };

  const profile = await upsertVendorOpsProfile(vendorId, {
    rateCardNotes: body.rateCardNotes,
    availabilityNotes: body.availabilityNotes,
    cities: body.cities !== undefined ? parseCities(body.cities) : undefined,
    accountManager: body.accountManager,
  });

  return NextResponse.json({ profile });
}

