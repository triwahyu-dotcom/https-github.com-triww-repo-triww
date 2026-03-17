import { NextRequest, NextResponse } from "next/server";

import { requestVendorPortalMagicLink } from "@/lib/vendor/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    registrationCode?: string;
    email?: string;
    phone?: string;
  };

  const registrationCode = String(body.registrationCode ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!registrationCode) {
    return NextResponse.json({ error: "Registration code is required." }, { status: 400 });
  }

  if (!email && !phone) {
    return NextResponse.json({ error: "Email atau phone wajib diisi." }, { status: 400 });
  }

  try {
    const access = await requestVendorPortalMagicLink(registrationCode, { email, phone });
    return NextResponse.json({ access });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to request magic link." },
      { status: 400 },
    );
  }
}
