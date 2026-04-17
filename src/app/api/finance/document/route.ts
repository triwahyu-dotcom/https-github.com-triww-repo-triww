import { NextResponse } from "next/server";
import { readDocuments, saveDocument } from "@/lib/finance/store";
import { ExpenseDocument } from "@/lib/finance/types";
import { getProjectDashboardData } from "@/lib/project/store";
import { logger } from "@/lib/logger";
/** API for Finance Documents (PO, SPK, CA, KONTRAK) */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId, documentType, vendorName, vendorPhone, vendorAddress,
      vendorTaxId, lineItems, description, documentTotal, paymentTerms,
      paymentDate, deliveryDate, shipTo, billingInstruction, billingTerms,
      notes, preparedBy, venue, duration, workScope, lampiran, paymentSchedule,
    } = body;
    if (!projectId || !documentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const { projects } = await getProjectDashboardData();
    const project = projects.find(p => p.id === projectId);
    const projectName = project ? project.projectName : "Unknown Project";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    let docId = "";
    if (documentType === "CASH_ADVANCE") {
      const allDocs = await readDocuments();
      const caDocs = allDocs.filter(d => d.documentType === "CASH_ADVANCE" && new Date(d.issueDate).getFullYear() === year);
      const seq = String(caDocs.length + 1).padStart(3, '0');
      docId = `CA-${seq}-${month}/${year}`;
    } else {
      const allDocs = await readDocuments();
      const typeDocs = allDocs.filter(d => d.documentType === documentType && new Date(d.issueDate).getFullYear() === year);
      const sequence = String(typeDocs.length + 1).padStart(3, '0');
      docId = `${sequence}/JBBS/${documentType}/${month}/${year}`;
    }
    const calculatedTotal = lineItems?.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0) ?? Number(documentTotal) ?? 0;
    const newDoc: ExpenseDocument = {
      id: docId, projectId, projectName, vendorName: vendorName || "Unknown Vendor",
      vendorAddress, vendorTaxId, documentType, issueDate: now.toISOString(),
      description: description || "", amount: calculatedTotal, status: "pending_finance", 
      lineItems: lineItems || [], paymentTerms, deliveryDate, shipTo,
      billingInstruction, billingTerms,
      preparedBy, venue, duration, workScope, lampiran, paymentSchedule,
    };
    await saveDocument(newDoc);
    logger.audit("FinanceAPI", "DOCUMENT_CREATED", { docId, projectId, documentType });
    return NextResponse.json({ success: true, docId, document: newDoc });
  } catch (error: any) {
    logger.error("FinanceAPI", "DOCUMENT_CREATE_FAILED", { error });
    console.error("[/api/finance/document]", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    const allDocs = await readDocuments();
    const docIndex = allDocs.findIndex(d => d.id === id);
    if (docIndex === -1) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    const doc = allDocs[docIndex];
    const updatedDoc: ExpenseDocument = {
      ...doc, ...updates, status: "pending_finance", rejectionReason: "", 
    };
    await saveDocument(updatedDoc);
    logger.audit("FinanceAPI", "DOCUMENT_UPDATED", { docId: id, updates });
    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error: any) {
    logger.error("FinanceAPI", "DOCUMENT_UPDATE_FAILED", { error });
    console.error("[PATCH /api/finance/document]", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
