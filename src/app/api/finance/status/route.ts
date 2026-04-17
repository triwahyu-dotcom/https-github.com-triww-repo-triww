import { NextRequest, NextResponse } from "next/server";
import { readRFPs, saveRFP, readDocuments, saveDocument } from "@/lib/finance/store";
import { logger } from "@/lib/logger";

export async function PATCH(req: NextRequest) {
  try {
    const { rfpId, docId, status, digitalSignature, rejectionReason, paymentProofUrl, verifiedBy } = await req.json();
    const today = new Date().toISOString();

    // ── Handle Document (PO/SPK/Kontrak/CA) approval by Director ──
    if (docId) {
      if (!status) return NextResponse.json({ error: "Status is required" }, { status: 400 });
      const docs = await readDocuments();
      const idx = docs.findIndex(d => d.id === docId);
      if (idx === -1) return NextResponse.json({ error: "Document not found" }, { status: 404 });

      docs[idx].status = status as any;
      if (status === "approved" && digitalSignature) {
        docs[idx].approvedBy = { name: "Eka Marutha Yuswardana", date: today, digitalSignature };
        docs[idx].rejectionReason = ""; // Clear on approval
      } else if (status === "pending_c_level" && verifiedBy) {
        docs[idx].verifiedBy = verifiedBy;
        docs[idx].rejectionReason = ""; // Clear on forwarding
      } else if (rejectionReason) {
        docs[idx].rejectionReason = rejectionReason;
      }
      await saveDocument(docs[idx]);
      
      if (status === "approved") {
        logger.audit("FinanceAPI", "DOCUMENT_APPROVED", { docId, by: "Director", status });
      } else if (status === "rejected") {
        logger.audit("FinanceAPI", "DOCUMENT_REJECTED", { docId, reason: rejectionReason, status });
      } else {
        logger.audit("FinanceAPI", "DOCUMENT_STATUS_CHANGED", { docId, status });
      }

      return NextResponse.json({ success: true, doc: docs[idx] });
    }

    // ── Handle RFP status update ──
    if (!rfpId || !status) {
      return NextResponse.json({ error: "rfpId or docId and status are required" }, { status: 400 });
    }

    const rfps = await readRFPs();
    const rfpIndex = rfps.findIndex(r => r.id === rfpId);
    if (rfpIndex === -1) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const rfp = rfps[rfpIndex];
    rfp.status = status;
    if (rejectionReason) {
      rfp.rejectionReason = rejectionReason;
    } else if (status !== "draft" && status !== "pending_finance") {
      // Clear rejection reason when moving to C-level or Paid
      rfp.rejectionReason = "";
    }
    await saveRFP(rfp);

    // Cascade status to linked documents
    const docs = await readDocuments();
    let docsUpdated = 0;

    for (const doc of docs) {
      // Check if this doc is linked to this RFP (checking both legacy ID and new documentIds array)
      const isLinked = doc.rfpId === rfpId || (rfp.documentIds && rfp.documentIds.includes(doc.id));

      if (isLinked) {
        if (status === "approved") {
          doc.status = "approved";
          doc.approvedBy = { name: "Eka Marutha Yuswardana", date: today, digitalSignature };
        } else if (status === "paid") {
          // Special logic for Cash Advance: after payment, it becomes "Pending Settlement"
          if (doc.documentType === "CASH_ADVANCE") {
            doc.status = "settlement_pending";
          } else {
            doc.status = "paid";
          }
        } else if (status === "pending_finance") {
          doc.status = "pending_finance";
        }
        await saveDocument(doc);
        docsUpdated++;
      }
    }

    logger.audit("FinanceAPI", "RFP_STATUS_CHANGED", { rfpId, status, rejectionReason, docsImpacted: docsUpdated });
    return NextResponse.json({ success: true, rfp, docsUpdated });
  } catch (error: any) {
    logger.error("FinanceAPI", "STATUS_UPDATE_FAILED", { error });
    console.error("Status Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
