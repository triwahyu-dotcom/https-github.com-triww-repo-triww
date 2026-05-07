import { NextRequest, NextResponse } from "next/server";
import { submitVendorIntakeV2 } from "@/lib/vendor/store";
import type { VendorIntakeV2Payload } from "@/lib/vendor/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VendorIntakeV2Payload;
    
    // Server-side validation (defensive)
    if (!body.entityType || !body.relationshipType) {
      return NextResponse.json({ error: "Tipe vendor wajib diisi" }, { status: 400 });
    }
    if (!body.name || body.name.trim().length < 3) {
      return NextResponse.json({ error: "Nama wajib diisi (min 3 karakter)" }, { status: 400 });
    }
    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
    }
    if (!body.bankAccountNumber || !body.bankName || !body.bankAccountHolder) {
      return NextResponse.json({ error: "Data bank wajib diisi" }, { status: 400 });
    }
    if (!body.documentsFolderUrl?.startsWith("https://drive.google.com/")) {
      return NextResponse.json({ error: "Link Drive tidak valid" }, { status: 400 });
    }
    
    // Save via store
    const vendor = await submitVendorIntakeV2(body);
    return NextResponse.json({ 
      success: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        registrationCode: vendor.registrationCode
      }
    });
  } catch (err) {
    console.error("V2 intake error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Submission failed" },
      { status: 400 }
    );
  }
}
