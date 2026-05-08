import { NextResponse } from "next/server";
import { readRFPs, updateRFP, readDocuments, updateDocument } from "@/lib/finance/store";
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
      return NextResponse.json({ error: "RFP tidak ditemukan." }, { status: 404 });
    }

    // TODO: Add optimistic concurrency check via conditional update in store.ts
    // Currently relies on UI button being disabled after click
    const allowedStatuses = ["paid", "pending_settlement_approval", "settled"];
    if (!allowedStatuses.includes(rfp.status)) {
      return NextResponse.json({ error: `Hanya RFP dengan status PAID yang bisa di-settle. Status saat ini: ${rfp.status}` }, { status: 400 });
    }

    const originalRfpStatus = rfp.status;
    const successfulDocUpdates: { doc: any, oldStatus: any }[] = [];
    let rfpUpdated = false;

    try {
      // Step 1: Update RFP with Settlement Details (No Mutation)
      const updatedRfp = {
        ...rfp,
        status: "pending_settlement_approval" as any,
        settlementDetails: {
          actualAmount: Number(actualAmount),
          difference: Number(difference),
          notes: notes || "",
          settlementDate: settlementDate || new Date().toISOString(),
          items: items || []
        }
      };

      await updateRFP(updatedRfp);
      rfpUpdated = true;

      // Step 2: Update linked CA document status to "settlement_audit"
      const docs = await readDocuments();
      for (const docId of rfp.documentIds || []) {
        const doc = docs.find(d => d.id === docId);
        if (doc) {
          if (doc.documentType === "CASH_ADVANCE") {
            const oldStatus = doc.status;
            const updatedDoc = { ...doc, status: "settlement_audit" as any };
            
            await updateDocument(updatedDoc);
            successfulDocUpdates.push({ doc, oldStatus });
          }
        } else {
          console.warn(`[Settle API] Orphan document reference found: ${docId} on RFP ${rfp.id}`);
        }
      }

      logger.audit("FinanceAPI", "RFP_SETTLEMENT_SUBMITTED", { 
        rfpId, 
        actualAmount: Number(actualAmount), 
        difference: Number(difference) 
      });
      return NextResponse.json({ success: true });

    } catch (innerError: any) {
      // ROLLBACK FLOW (Best Effort Consistency)
      console.error("[Settle API] Processing failed, starting rollback:", innerError.message);
      const rollbackErrors: any[] = [];

      // 1. Rollback Documents (Reverse order)
      for (const item of successfulDocUpdates.reverse()) {
        try {
          const revertedDoc = { ...item.doc, status: item.oldStatus };
          await updateDocument(revertedDoc);
        } catch (rbErr: any) {
          rollbackErrors.push({ id: item.doc.id, error: rbErr.message });
          console.error(`[Settle API] CRITICAL: Rollback failed for doc ${item.doc.id}: ${rbErr.message}`);
        }
      }

      // 2. Rollback RFP status
      if (rfpUpdated) {
        try {
          const revertedRfp = { ...rfp, status: originalRfpStatus };
          // Note: In DB this will overwrite/remove settlementDetails because revertedRfp is based on original rfp object
          await updateRFP(revertedRfp);
        } catch (rbErr: any) {
          rollbackErrors.push({ id: rfp.id, error: rbErr.message });
          console.error(`[Settle API] CRITICAL: Rollback failed for RFP ${rfp.id}: ${rbErr.message}`);
        }
      }

      if (rollbackErrors.length > 0) {
        console.error(`[Settle API] PARTIAL ROLLBACK FAILURE: Manual intervention required for ${rollbackErrors.length} items.`);
      }

      if (innerError.message?.includes("tidak ditemukan")) {
        return NextResponse.json({ error: "Gagal memproses settlement: Data tidak ditemukan." }, { status: 404 });
      }
      throw innerError;
    }

  } catch (error: any) {
    logger.error("FinanceAPI", "RFP_SETTLEMENT_FAILED", { error });
    console.error("[POST /api/finance/settle]", error);
    return NextResponse.json({ error: "Failed to submit settlement" }, { status: 500 });
  }
}
