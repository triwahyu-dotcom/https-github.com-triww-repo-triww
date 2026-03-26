import { NextRequest, NextResponse } from "next/server";
import { updateVendorIdentity } from "@/lib/vendor/store";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await context.params;
    const body = await request.json();

    const updatedVendor = await updateVendorIdentity(vendorId, body);

    return NextResponse.json({ success: true, vendor: updatedVendor });
  } catch (err: unknown) {
    console.error("API PATCH vendor error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
