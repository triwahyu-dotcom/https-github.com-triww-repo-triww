import { NextResponse } from "next/server";
import { readRFPs, saveRFP, readDocuments, saveDocument } from "@/lib/finance/store";
import { logger } from "@/lib/logger";

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

    const allowedStatuses = ["paid", "pending_settlement_approval", "settled"];
    if (!allowedStatuses.includes(rfp.status)) {
      return NextResponse.json({ error: `Hanya RFP dengan status PAID yang bisa di-settle. Status saat ini: ${rfp.status}` }, { status: 400 });
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

    // Update linked CA document status to "settlement_audit"
    const docs = await readDocuments();
    for (const docId of rfp.documentIds || []) {
      const doc = docs.find(d => d.id === docId);
      if (doc && doc.documentType === "CASH_ADVANCE") {
        doc.status = "settlement_audit" as any;
        await saveDocument(doc);
      }
    }

    logger.audit("FinanceAPI", "RFP_SETTLEMENT_SUBMITTED", { rfpId, actualAmount: Number(actualAmount), difference: Number(difference) });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("FinanceAPI", "RFP_SETTLEMENT_FAILED", { error });
    console.error(error);
    return NextResponse.json({ error: "Failed to submit settlement" }, { status: 500 });
  }
}
