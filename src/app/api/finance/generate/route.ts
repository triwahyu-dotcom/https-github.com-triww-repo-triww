import { NextRequest, NextResponse } from "next/server";
import { readDocuments, createDocument, createRFP, deleteDocument } from "@/lib/finance/store";
import { ExpenseDocument, RequestForPayment } from "@/lib/finance/types";
import { getProjectDashboardData } from "@/lib/project/store";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  let docCreated = false;
  let finalDocId = "";

  try {
    const body = await request.json();
    const { 
      projectId, documentType, vendorName, description, paymentType, bankAccount,
      lineItems, vendorAddress, vendorTaxId, paymentTerms, deliveryInstruction,
      deliveryDate, shipTo, billingInstruction, billingTerms, preparedBy,
      verifiedBy, approvedBy, documentTotal, rfpAmount, nextPaymentDate 
    } = body;

    // 1. Validation (Identical to original)
    if (!projectId || !documentType || documentTotal === undefined || rfpAmount === undefined) {
      return NextResponse.json({ error: "Kolom yang diperlukan tidak lengkap" }, { status: 400 });
    }

    const { projects } = await getProjectDashboardData();
    const project = projects.find(p => p.id === projectId);
    const projectName = project ? project.projectName : "Unknown Project";

    // 2. Generate RFP ID First (Preserve behavior for backlink)
    const rfpId = `RFP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 3. Generate Initial Doc ID Guess (Preserve length+1 logic)
    let initialDocId = "";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    if (documentType === "CASH_ADVANCE") {
      initialDocId = `CA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    } else {
      const allDocs = await readDocuments();
      const typeDocs = allDocs.filter(d => 
        d.documentType === documentType && 
        new Date(d.issueDate).getFullYear() === year
      );
      const sequence = String(typeDocs.length + 1).padStart(3, '0');
      initialDocId = `${sequence}/JBBS/${documentType}/${month}/${year}`;
    }

    // 4. Build & Create Document (with Backlink)
    const newDoc: ExpenseDocument = {
      id: initialDocId,
      projectId,
      projectName,
      vendorName: vendorName || "Unknown Payee",
      vendorAddress,
      vendorTaxId,
      documentType,
      issueDate: new Date().toISOString(),
      description,
      amount: Number(documentTotal),
      status: "approved" as any,
      lineItems,
      paymentTerms,
      deliveryInstruction,
      deliveryDate,
      shipTo,
      billingInstruction,
      billingTerms,
      preparedBy,
      verifiedBy,
      approvedBy,
      rfpId: rfpId // <-- Legacy Backlink Preserved
    };

    // createDocument will handle retries internally if initialDocId exists
    const createdDoc = await createDocument(newDoc);
    finalDocId = createdDoc.id;
    docCreated = true;

    // 5. Build & Create RFP (Referencing FINAL Doc ID)
    const newRFP: RequestForPayment = {
      id: rfpId,
      documentIds: [finalDocId], // <-- Use database-confirmed ID (important if retry happened)
      projectId,
      projectName,
      payeeName: vendorName || "Unknown Payee",
      totalAmount: Number(rfpAmount),
      requestDate: new Date().toISOString(),
      requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending_c_level" as any,
      paymentType: paymentType || "Transfer",
      bankAccount: {
        bankName: bankAccount?.bankName || "-",
        accountNo: bankAccount?.accountNo || "-",
        accountName: bankAccount?.accountName || "-",
      },
      notes: (description || "Auto-generated from " + documentType) + 
             (nextPaymentDate ? `\n\nNext Payment Date: ${nextPaymentDate}` : ""),
    };

    await createRFP(newRFP);

    logger.audit("FinanceAPI", "DOCUMENT_GENERATED", { docId: finalDocId, rfpId });
    return NextResponse.json({ success: true, docId: finalDocId, rfpId });

  } catch (error: any) {
    // 6. Rollback Mechanism (Reverse Order)
    if (docCreated && finalDocId) {
      try {
        console.warn(`[Generate API] Rolling back document ${finalDocId} due to RFP creation failure`);
        await deleteDocument(finalDocId);
      } catch (rbErr: any) {
        console.error(`[Generate API] CRITICAL: Rollback failed for ${finalDocId}:`, rbErr.message);
      }
    }

    // 7. Error Categorization
    if (error.message?.includes("DATABASE_CONCURRENCY_ERROR")) {
      return NextResponse.json({ error: "Gagal generate: Tabrakan nomor urut dokumen. Silakan coba lagi." }, { status: 409 });
    }

    logger.error("FinanceAPI", "GENERATE_FAILED", { error: error.message });
    console.error("[POST /api/finance/generate]", error);
    return NextResponse.json({ error: error.message || "Gagal generate RFP" }, { status: 500 });
  }
}
