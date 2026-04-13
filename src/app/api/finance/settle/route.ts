import { NextResponse } from "next/server";
import { readRFPs, saveRFP } from "@/lib/finance/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rfpId, actualAmount, difference, notes, settlementDate, items } = body;

    if (!rfpId || actualAmount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const rfps = await readRFPs();
    const rfp = rfps.find(r => r.id === rfpId);

    if (!rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    if (rfp.status !== "paid") {
      return NextResponse.json({ error: "Only paid RFPs can be settled" }, { status: 400 });
    }

    rfp.status = "pending_settlement_approval";
    rfp.settlementDetails = {
      actualAmount: Number(actualAmount),
      difference: Number(difference),
      notes: notes || "",
      settlementDate: settlementDate || new Date().toISOString(),
      items: items || []
    };

    await saveRFP(rfp);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit settlement" }, { status: 500 });
  }
}
