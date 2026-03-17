import { NextRequest, NextResponse } from "next/server";

import { requestVendorVerificationCode } from "@/lib/vendor/identity-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { channel?: "email" | "phone"; target?: string };
  const channel = body.channel;
  const target = String(body.target ?? "").trim();

  if (!channel || !["email", "phone"].includes(channel)) {
    return NextResponse.json({ error: "Invalid verification channel." }, { status: 400 });
  }

  try {
    const result = await requestVendorVerificationCode(channel, target);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to request code." },
      { status: 400 },
    );
  }
}

