import { NextRequest, NextResponse } from "next/server";

import { getVendorStatusByRegistration } from "@/lib/vendor/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { registrationCode?: string; email?: string };
  const registrationCode = String(body.registrationCode ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!registrationCode) {
    return NextResponse.json({ error: "Registration code is required." }, { status: 400 });
  }

  const vendor = await getVendorStatusByRegistration(registrationCode, email);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor submission not found." }, { status: 404 });
  }

  return NextResponse.json({ vendor });
}

