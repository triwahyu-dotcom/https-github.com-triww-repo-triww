import { NextRequest, NextResponse } from "next/server";

import { addVendorScorecard } from "@/lib/vendor/ops-store";

function clampScore(value: unknown) {
  const number = Number(value);
  return Math.min(5, Math.max(1, Number.isFinite(number) ? number : 3));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ vendorId: string }> },
) {
  const { vendorId } = await context.params;
  const body = (await request.json()) as {
    projectId?: string;
    quality?: number;
    reliability?: number;
    pricing?: number;
    communication?: number;
    onTime?: number;
    note?: string;
  };

  const scorecard = await addVendorScorecard(vendorId, {
    projectId: String(body.projectId ?? "").trim(),
    quality: clampScore(body.quality),
    reliability: clampScore(body.reliability),
    pricing: clampScore(body.pricing),
    communication: clampScore(body.communication),
    onTime: clampScore(body.onTime),
    note: String(body.note ?? "").trim(),
  });

  return NextResponse.json({ scorecard });
}

