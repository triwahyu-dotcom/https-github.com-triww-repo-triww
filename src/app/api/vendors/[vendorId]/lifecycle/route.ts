import { NextRequest, NextResponse } from "next/server";

import { updateVendorLifecycleStatus } from "@/lib/vendor/ops-store";
import { VendorLifecycleStatus } from "@/lib/vendor/types";

const STATUSES: VendorLifecycleStatus[] = [
  "submitted",
  "screening",
  "verified",
  "approved",
  "blacklisted",
  "inactive",
];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ vendorId: string }> },
) {
  const { vendorId } = await context.params;
  const body = (await request.json()) as { lifecycleStatus?: VendorLifecycleStatus };

  if (!body.lifecycleStatus || !STATUSES.includes(body.lifecycleStatus)) {
    return NextResponse.json({ error: "Invalid lifecycle status" }, { status: 400 });
  }

  const profile = await updateVendorLifecycleStatus(vendorId, body.lifecycleStatus);
  return NextResponse.json({ profile });
}

