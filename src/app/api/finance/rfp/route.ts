import { NextResponse } from "next/server";
import { readDocuments, readRFPs, updateDocument, createRFP, updateRFP, deleteRFP } from "@/lib/finance/store";
import { RequestForPayment } from "@/lib/finance/types";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      documentId,
      rfpAmount,
      paymentTerms,
      paymentType,
      bankAccount,
      notes,
      requiredDate,
      vendorInvoiceUrl,
      taxAmount,
      ppnAmount,
      netAmount,
      grossAmount,
      pphType,
    } = body;

    if (!documentId || rfpAmount === undefined) {
      console.log("RFP ERROR: Missing documentId or rfpAmount", { documentId, rfpAmount });
      return NextResponse.json({ error: "Missing documentId or rfpAmount" }, { status: 400 });
    }

    const allDocs = await readDocuments();
    const sourceDoc = allDocs.find(d => d.id === documentId);

    if (!sourceDoc) {
      console.log("RFP ERROR: Source document not found", { documentId });
      return NextResponse.json({ error: "Gagal membuat RFP: Dokumen sumber tidak ditemukan." }, { status: 404 });
    }

    if (sourceDoc.status !== "approved" && sourceDoc.status !== "pending_finance" && sourceDoc.status !== "pending_c_level") {
      console.log("RFP ERROR: Invalid document status", { docId: sourceDoc.id, status: sourceDoc.status });
      return NextResponse.json({ error: "Document must be approved or in review before creating an RFP" }, { status: 400 });
    }

    const allRFPs = await readRFPs();
    const existingRFPs = allRFPs.filter(r => r.documentIds.includes(documentId));
    const totalRequested = existingRFPs.reduce((sum, r) => sum + r.totalAmount, 0);

    if (totalRequested + Number(rfpAmount) > (sourceDoc.amount || 0) + 10) {
      console.log("RFP ERROR: Amount exceeds limit", { 
        totalRequested, 
        rfpAmount, 
        docAmount: sourceDoc.amount,
        diff: (totalRequested + Number(rfpAmount)) - (sourceDoc.amount || 0)
      });
      return NextResponse.json({ 
        error: `Total RFP (Rp ${Math.round(totalRequested + Number(rfpAmount)).toLocaleString()}) melebihi limit dokumen (Rp ${Math.round(sourceDoc.amount || 0).toLocaleString()}). Sisa plafon: Rp ${Math.round((sourceDoc.amount || 0) - totalRequested).toLocaleString()}.` 
      }, { status: 400 });
    }

    if (sourceDoc.paymentSchedule && sourceDoc.paymentSchedule.length > 0) {
      const terminIndex = sourceDoc.paymentSchedule.findIndex(s => s.label === paymentTerms);
      console.log("RFP DEBUG: Termin check", { paymentTerms, terminIndex });
      if (terminIndex > 0) {
        const previousTermin = sourceDoc.paymentSchedule[terminIndex - 1];
        const prevExists = existingRFPs.some(r => r.terminLabel === previousTermin.label);
        if (!prevExists) {
          console.log("RFP ERROR: Sequential termin missing", { previousTerminLabel: previousTermin.label });
          return NextResponse.json({ error: `Harus membuat RFP untuk ${previousTermin.label} terlebih dahulu.` }, { status: 400 });
        }
      }
    }

    const rfpId = `RFP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = new Date();

    const newRFP: RequestForPayment = {
      id: rfpId,
      documentIds: [documentId],
      projectId: sourceDoc.projectId,
      projectName: sourceDoc.projectName,
      payeeName: sourceDoc.vendorName,
      totalAmount: Number(rfpAmount),
      requestDate: now.toISOString(),
      requiredDate: requiredDate || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending_finance",
      paymentType: paymentType || "Transfer",
      bankAccount: {
        bankName: bankAccount?.bankName || "-",
        accountNo: bankAccount?.accountNo || "-",
        accountName: bankAccount?.accountName || "-",
      },
      notes: notes || "",
      terminLabel: paymentTerms,
      vendorInvoiceUrl,
      taxAmount,
      pphType,
      ppnAmount,
      netAmount,
      grossAmount,
    };

    if (!sourceDoc.rfpIds) sourceDoc.rfpIds = [];
    sourceDoc.rfpIds.push(rfpId);

    let rfpCreated = false;
    try {
      // Step 1: Create RFP first
      await createRFP(newRFP);
      rfpCreated = true;

      // Step 2: Update parent doc with link
      await updateDocument(sourceDoc);

      logger.audit("FinanceAPI", "RFP_CREATED", { rfpId, amount: Number(rfpAmount), documentId });
      return NextResponse.json({ success: true, rfpId });
    } catch (e: any) {
      // Rollback: delete RFP if parent update fails
      if (rfpCreated) {
        try {
          await deleteRFP(newRFP.id);
          console.warn(`[RFP API] Rolled back orphan RFP ${newRFP.id} due to parent update failure`);
        } catch (rollbackErr: any) {
          console.error(`[RFP API] CRITICAL: Rollback failed for ${newRFP.id}: ${rollbackErr.message}`);
        }
      }

      if (e.message.includes("tidak ditemukan")) {
        return NextResponse.json({ 
          error: "Gagal membuat RFP: Dokumen sumber tidak ditemukan." 
        }, { status: 404 });
      }
      throw e;
    }
  } catch (error: any) {
    logger.error("FinanceAPI", "RFP_CREATE_FAILED", { error });
    console.error("[/api/finance/rfp]", error);
    return NextResponse.json({ error: "Failed to create RFP" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing rfp id" }, { status: 400 });
    }

    const allRFPs = await readRFPs();
    const rfpIndex = allRFPs.findIndex(r => r.id === id);

    if (rfpIndex === -1) {
      return NextResponse.json({ error: "RFP tidak ditemukan." }, { status: 404 });
    }

    const rfp = allRFPs[rfpIndex];

    const updatedRFP: RequestForPayment = {
      ...rfp,
      ...updates,
      rejectionReason: "", 
    };

    try {
      await updateRFP(updatedRFP);
      logger.audit("FinanceAPI", "RFP_UPDATED", { rfpId: id, updates });
      return NextResponse.json({ success: true, rfp: updatedRFP });
    } catch (e: any) {
      if (e.message.includes("tidak ditemukan")) {
        return NextResponse.json({ error: "RFP tidak ditemukan." }, { status: 404 });
      }
      throw e;
    }
  } catch (error: any) {
    logger.error("FinanceAPI", "RFP_UPDATE_FAILED", { error });
    console.error("[PATCH /api/finance/rfp]", error);
    return NextResponse.json({ error: "Failed to update RFP" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing RFP id" }, { status: 400 });

    await deleteRFP(id);
    logger.audit("FinanceAPI", "RFP_DELETED", { rfpId: id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("FinanceAPI", "RFP_DELETE_FAILED", { error });
    console.error("[DELETE /api/finance/rfp]", error);
    return NextResponse.json({ error: "Failed to delete RFP" }, { status: 500 });
  }
}
