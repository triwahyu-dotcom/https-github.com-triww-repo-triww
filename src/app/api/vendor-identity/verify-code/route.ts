import { NextRequest, NextResponse } from "next/server";

import { verifyVendorVerificationCode } from "@/lib/vendor/identity-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { channel?: "email" | "phone"; target?: string; code?: string };
  const channel = body.channel;
  const target = String(body.target ?? "").trim();
  const code = String(body.code ?? "").trim();

  if (!channel || !["email", "phone"].includes(channel)) {
    return NextResponse.json({ error: "Invalid verification channel." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
  }

  try {
    const result = await verifyVendorVerificationCode(channel, target, code);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify code." },
      { status: 400 },
    );
  }
}

