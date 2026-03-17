import { NextRequest, NextResponse } from "next/server";

import { ReviewStatus } from "@/lib/vendor/types";
import { updateVendorReview } from "@/lib/vendor/store";

const REVIEW_STATUSES: ReviewStatus[] = [
  "new",
  "in_review",
  "approved",
  "rejected",
  "needs_revision",
];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ vendorId: string }> },
) {
  const { vendorId } = await context.params;
  const body = (await request.json()) as {
    status?: ReviewStatus;
    note?: string;
  };

  if (!body.status || !REVIEW_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
  }

  const vendorDetail = await updateVendorReview(vendorId, body.status, body.note ?? "");

  return NextResponse.json({ vendorDetail });
}
