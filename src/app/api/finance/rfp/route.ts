import { NextResponse } from "next/server";
import { readDocuments, readRFPs, saveDocument, saveRFP } from "@/lib/finance/store";
import { RequestForPayment } from "@/lib/finance/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      documentId,    // The approved PO/SPK/Kontrak doc ID
      rfpAmount,     // Partial or full amount being requested now
      paymentTerms,  // e.g. "DP 50%", "Full Payment", "Termin 2"
      paymentType,   // "Transfer" | "Cash"
      bankAccount,   // { bankName, accountNo, accountName }
      notes,
      requiredDate,
    } = body;

    if (!documentId || rfpAmount === undefined) {
      return NextResponse.json({ error: "Missing documentId or rfpAmount" }, { status: 400 });
    }

    // Load the source document
    const allDocs = await readDocuments();
    const sourceDoc = allDocs.find(d => d.id === documentId);

    if (!sourceDoc) {
      return NextResponse.json({ error: "Source document not found" }, { status: 404 });
    }

    if (sourceDoc.status !== "approved") {
      return NextResponse.json({ error: "Document must be approved before creating an RFP" }, { status: 400 });
    }

    // Load existing RFPs for this document
    const allRFPs = await readRFPs();
    const existingRFPs = allRFPs.filter(r => r.documentIds.includes(documentId));
    const totalRequested = existingRFPs.reduce((sum, r) => sum + r.totalAmount, 0);

    if (totalRequested + Number(rfpAmount) > sourceDoc.amount + 1) { // +1 for small rounding diffs
      return NextResponse.json({ error: "Total RFP amount exceeds document total" }, { status: 400 });
    }

    // Sequence check if schedule exists
    if (sourceDoc.paymentSchedule && sourceDoc.paymentSchedule.length > 0) {
      // Find the index of the termin being requested
      const terminIndex = sourceDoc.paymentSchedule.findIndex(s => s.label === paymentTerms);
      if (terminIndex > 0) {
        // Higher than 0, check if previous index exists in existingRFPs
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
      status: "pending_c_level",
      paymentType: paymentType || "Transfer",
      bankAccount: {
        bankName: bankAccount?.bankName || "-",
        accountNo: bankAccount?.accountNo || "-",
        accountName: bankAccount?.accountName || "-",
      },
      notes: `${paymentTerms ? `[${paymentTerms}] ` : ""}${notes || ""}\n\nRef. Document: ${documentId}`,
      terminLabel: paymentTerms,
    };

    // Link the RFP back to the document
    sourceDoc.rfpId = rfpId; // Keep for legacy
    if (!sourceDoc.rfpIds) sourceDoc.rfpIds = [];
    sourceDoc.rfpIds.push(rfpId);

    // If fully paid, we could set status but let's keep it approved for now
    
    await saveDocument(sourceDoc);
    await saveRFP(newRFP);

    return NextResponse.json({ success: true, rfpId });
  } catch (error) {
    console.error("[/api/finance/rfp]", error);
    return NextResponse.json({ error: "Failed to create RFP" }, { status: 500 });
  }
}
