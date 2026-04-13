import { NextResponse } from "next/server";
import { readDocuments, saveDocument, saveRFP } from "@/lib/finance/store";
import { ExpenseDocument, RequestForPayment } from "@/lib/finance/types";
import { getProjectDashboardData } from "@/lib/project/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      projectId, 
      documentType, 
      vendorName, 
      description, 
      paymentType, 
      bankAccount,
      lineItems,
      vendorAddress,
      vendorTaxId,
      paymentTerms,
      deliveryInstruction,
      deliveryDate,
      shipTo,
      billingInstruction,
      billingTerms,
      preparedBy,
      verifiedBy,
      approvedBy,
      documentTotal, // The full 100% amount for the PO
      rfpAmount,     // The requested partial amount for this RFP
      nextPaymentDate // The newly requested next payment date
    } = body;

    // documentType is optional if it's purely Cash Advance, but we treat CASH_ADVANCE as documentType for the generator too
    if (!projectId || !documentType || documentTotal === undefined || rfpAmount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Look up project string to denormalize name
    const { projects } = await getProjectDashboardData();
    const project = projects.find(p => p.id === projectId);
    const projectName = project ? project.projectName : "Unknown Project";

    // 1. Create Document (PO, SPK, Kontrak, or CASH_ADVANCE)
    let docId = "";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    if (documentType === "CASH_ADVANCE") {
      docId = `CA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    } else {
      const allDocs = await readDocuments();
      const typeDocs = allDocs.filter(d => 
        d.documentType === documentType && 
        new Date(d.issueDate).getFullYear() === year
      );
      const sequence = String(typeDocs.length + 1).padStart(3, '0');
      docId = `${sequence}/JBBS/${documentType}/${month}/${year}`;
    }

    const newDoc: ExpenseDocument = {
      id: docId,
      projectId,
      projectName,
      vendorName: vendorName || "Unknown Payee",
      vendorAddress,
      vendorTaxId,
      documentType,
      issueDate: new Date().toISOString(),
      description,
      amount: Number(documentTotal),
      status: "approved", // PM auto-approves POs mentally in the fast flow before director steps in.
      lineItems,
      paymentTerms,
      deliveryInstruction,
      deliveryDate,
      shipTo,
      billingInstruction,
      billingTerms,
      preparedBy,
      verifiedBy,
      approvedBy
    };

    // 2. Wrap it into an RFP
    const rfpId = `RFP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newRFP: RequestForPayment = {
      id: rfpId,
      documentIds: [docId],
      projectId,
      projectName,
      payeeName: vendorName || "Unknown Payee",
      totalAmount: Number(rfpAmount),
      requestDate: new Date().toISOString(),
      requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending_c_level", // Changed from pending_finance directly to pending_C_level based on earlier 1-step logic or pending_finance, waiting for Director.
      paymentType: paymentType || "Transfer",
      bankAccount: {
        bankName: bankAccount?.bankName || "-",
        accountNo: bankAccount?.accountNo || "-",
        accountName: bankAccount?.accountName || "-",
      },
      notes: (description || "Auto-generated from " + documentType) + (nextPaymentDate ? `\n\nNext Payment Date: ${nextPaymentDate}` : ""),
    };

    newDoc.rfpId = rfpId;

    await saveDocument(newDoc);
    await saveRFP(newRFP);

    return NextResponse.json({ success: true, docId, rfpId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate RFP" }, { status: 500 });
  }
}
