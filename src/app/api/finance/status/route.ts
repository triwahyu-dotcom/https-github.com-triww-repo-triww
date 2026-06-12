import { NextRequest, NextResponse } from "next/server";
import { readRFPs, updateRFP, readDocuments, updateDocument, deleteRFP, deleteDocument } from "@/lib/finance/store";
import { logger } from "@/lib/logger";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { rfpId, docId, status, digitalSignature, rejectionReason, paymentProofUrl, sourceAccountNo, verifiedBy } = body;
    const today = new Date().toISOString();

    // ── PATH A: Handle Document (PO/SPK/Kontrak/CA) approval ──
    if (docId) {
      if (!status) return NextResponse.json({ error: "Status diperlukan" }, { status: 400 });
      const docs = await readDocuments();
      const doc = docs.find(d => d.id === docId);
      
      if (!doc) {
        return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
      }

      // Object Cloning (No Mutation)
      const updatedDoc = { 
        ...doc, 
        status: status as any,
        rejectionReason: rejectionReason || (status === "approved" ? "" : doc.rejectionReason)
      };

      if (status === "draft") {
        delete updatedDoc.approvedBy;
      }

      if (status === "approved" && digitalSignature) {
        // TODO: Replace hardcoded name with session auth user (Tech Debt)
        updatedDoc.approvedBy = { name: "Eka Marutha Yuswardana", date: today, digitalSignature };
        updatedDoc.rejectionReason = ""; 
      } else if (status === "pending_c_level" && verifiedBy) {
        updatedDoc.verifiedBy = verifiedBy;
        updatedDoc.rejectionReason = "";
      } else if (rejectionReason) {
        updatedDoc.rejectionReason = rejectionReason;
      }

      try {
        await updateDocument(updatedDoc);
        
        if (status === "approved") {
          logger.audit("FinanceAPI", "DOCUMENT_APPROVED", { docId, by: "Director", status });
        } else if (status === "rejected") {
          logger.audit("FinanceAPI", "DOCUMENT_REJECTED", { docId, reason: rejectionReason, status });
        } else {
          logger.audit("FinanceAPI", "DOCUMENT_STATUS_CHANGED", { docId, status });
        }

        return NextResponse.json({ success: true, doc: updatedDoc });
      } catch (e: any) {
        if (e.message.includes("tidak ditemukan")) {
          return NextResponse.json({ error: "Dokumen tidak ditemukan di database." }, { status: 404 });
        }
        throw e;
      }
    }

    // ── PATH B + C: Handle RFP status update with Cascade ──
    if (!rfpId || !status) {
      return NextResponse.json({ error: "rfpId atau docId dan status diperlukan" }, { status: 400 });
    }

    const rfps = await readRFPs();
    const rfp = rfps.find(r => r.id === rfpId);
    if (!rfp) {
      return NextResponse.json({ error: "RFP tidak ditemukan" }, { status: 404 });
    }

    const originalRfpStatus = rfp.status;
    const successfulDocUpdates: { doc: any, oldStatus: any }[] = [];
    let rfpUpdated = false;

    try {
      // Step 1: Update RFP status (Cloning)
      const updatedRfp = {
        ...rfp,
        status: status as any,
        rejectionReason: rejectionReason || (status !== "draft" && status !== "pending_finance" ? "" : rfp.rejectionReason)
      };

      // Persist payment-specific fields
      if (status === "paid" && paymentProofUrl) {
        (updatedRfp as any).paymentProofUrl = paymentProofUrl;
      }
      // Rekening sumber dana disimpan saat Finance melakukan Review & Sign (pending_c_level)
      if (status === "pending_c_level" && sourceAccountNo) {
        (updatedRfp as any).sourceAccountNo = sourceAccountNo;
      }

      await updateRFP(updatedRfp);
      rfpUpdated = true;

      // Step 2: Cascade status to linked documents
      const docs = await readDocuments();
      for (const doc of docs) {
        // Support legacy rfpId and new documentIds array
        const isLinked = doc.rfpId === rfpId || (rfp.documentIds && rfp.documentIds.includes(doc.id));

        if (isLinked) {
          const oldStatus = doc.status;
          const updatedDoc = { ...doc };
          let shouldUpdateDoc = false;

          if (status === "approved") {
            updatedDoc.status = "approved" as any;
            // TODO: Replace hardcoded name with session auth user (Tech Debt)
            updatedDoc.approvedBy = { name: "Eka Marutha Yuswardana", date: today, digitalSignature };
            shouldUpdateDoc = true;
          } else if (status === "paid") {
            // Special logic for Cash Advance: after payment, it becomes "Pending Settlement"
            updatedDoc.status = doc.documentType === "CASH_ADVANCE" ? "settlement_pending" as any : "paid" as any;
            shouldUpdateDoc = true;
          } else if (status === "settled") {
            if (doc.documentType === "CASH_ADVANCE" && rfp.settlementDetails) {
              const diff = rfp.settlementDetails.difference || 0;
              if (diff > 0) {
                updatedDoc.status = "approved" as any;
                updatedDoc.amount = rfp.settlementDetails.actualAmount;
              } else {
                updatedDoc.status = "paid" as any;
                if (diff < 0) updatedDoc.amount = rfp.settlementDetails.actualAmount;
              }
            } else {
              updatedDoc.status = "paid" as any;
            }
            shouldUpdateDoc = true;
          } else if (status === "pending_finance") {
            updatedDoc.status = "pending_finance" as any;
            shouldUpdateDoc = true;
          }

          if (shouldUpdateDoc) {
            await updateDocument(updatedDoc);
            successfulDocUpdates.push({ doc, oldStatus });
          }
        }
      }

      logger.audit("FinanceAPI", "RFP_STATUS_CHANGED", { rfpId, status, rejectionReason, docsImpacted: successfulDocUpdates.length });
      return NextResponse.json({ success: true, rfp: updatedRfp, docsUpdated: successfulDocUpdates.length });

    } catch (innerError: any) {
      // ROLLBACK FLOW (Best Effort Consistency)
      console.error("[Status API] Cascade processing failed, starting rollback:", innerError.message);
      const rollbackErrors: any[] = [];

      // Revert documents (Reverse order)
      for (const item of successfulDocUpdates.reverse()) {
        try {
          await updateDocument({ ...item.doc, status: item.oldStatus });
        } catch (rbErr: any) {
          rollbackErrors.push({ type: 'doc', id: item.doc.id, error: rbErr.message });
          console.error(`[Status API] CRITICAL: Rollback failed for doc ${item.doc.id}: ${rbErr.message}`);
        }
      }

      // Revert RFP
      if (rfpUpdated) {
        try {
          await updateRFP({ ...rfp, status: originalRfpStatus });
        } catch (rbErr: any) {
          rollbackErrors.push({ type: 'rfp', id: rfp.id, error: rbErr.message });
          console.error(`[Status API] CRITICAL: Rollback failed for RFP ${rfp.id}: ${rbErr.message}`);
        }
      }

      if (rollbackErrors.length > 0) {
        console.error(`[Status API] PARTIAL ROLLBACK FAILURE: Manual intervention required.`);
      }

      if (innerError.message?.includes("tidak ditemukan")) {
        return NextResponse.json({ error: "Data tidak ditemukan di database." }, { status: 404 });
      }
      throw innerError;
    }

  } catch (error: any) {
    logger.error("FinanceAPI", "STATUS_UPDATE_FAILED", { error });
    console.error("[PATCH /api/finance/status]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rfpId = searchParams.get("rfpId");
    const docId = searchParams.get("docId");

    if (docId) {
      await deleteDocument(docId);
      logger.audit("FinanceAPI", "DOCUMENT_DELETED", { docId });
      return NextResponse.json({ success: true });
    }

    if (rfpId) {
      await deleteRFP(rfpId);
      logger.audit("FinanceAPI", "RFP_DELETED", { rfpId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  } catch (error: any) {
    logger.error("FinanceAPI", "DELETE_FAILED", { error });
    console.error("[DELETE /api/finance/status]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
