import { NextResponse } from "next/server";
import { readDocuments, readRFPs, saveDocument, saveRFP } from "@/lib/finance/store";
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
    } = body;

    if (!documentId || rfpAmount === undefined) {
      return NextResponse.json({ error: "Missing documentId or rfpAmount" }, { status: 400 });
    }

    const allDocs = await readDocuments();
    const sourceDoc = allDocs.find(d => d.id === documentId);

    if (!sourceDoc) {
      return NextResponse.json({ error: "Source document not found" }, { status: 404 });
    }

    if (sourceDoc.status !== "approved" && sourceDoc.status !== "pending_finance" && sourceDoc.status !== "pending_c_level") {
      return NextResponse.json({ error: "Document must be approved or in review before creating an RFP" }, { status: 400 });
    }

    const allRFPs = await readRFPs();
    const existingRFPs = allRFPs.filter(r => r.documentIds.includes(documentId));
    const totalRequested = existingRFPs.reduce((sum, r) => sum + r.totalAmount, 0);

    if (totalRequested + Number(rfpAmount) > sourceDoc.amount + 1) {
      return NextResponse.json({ error: "Total RFP amount exceeds document total" }, { status: 400 });
    }

    if (sourceDoc.paymentSchedule && sourceDoc.paymentSchedule.length > 0) {
      const terminIndex = sourceDoc.paymentSchedule.findIndex(s => s.label === paymentTerms);
      if (terminIndex > 0) {
        const previousTermin = sourceDoc.paymentSchedule[terminIndex - 1];
        const prevExists = existingRFPs.some(r => r.terminLabel === previousTermin.label);
        if (!prevExists) {
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
    };

    if (!sourceDoc.rfpIds) sourceDoc.rfpIds = [];
    sourceDoc.rfpIds.push(rfpId);

    await saveDocument(sourceDoc);
    await saveRFP(newRFP);

    logger.audit("FinanceAPI", "RFP_CREATED", { rfpId, amount: Number(rfpAmount), documentId });
    return NextResponse.json({ success: true, rfpId });
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
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const rfp = allRFPs[rfpIndex];

    const updatedRFP: RequestForPayment = {
      ...rfp,
      ...updates,
      rejectionReason: "", 
    };

    await saveRFP(updatedRFP);

    logger.audit("FinanceAPI", "RFP_UPDATED", { rfpId: id, updates });
    return NextResponse.json({ success: true, rfp: updatedRFP });
  } catch (error: any) {
    logger.error("FinanceAPI", "RFP_UPDATE_FAILED", { error });
    console.error("[PATCH /api/finance/rfp]", error);
    return NextResponse.json({ error: "Failed to update RFP" }, { status: 500 });
  }
}
