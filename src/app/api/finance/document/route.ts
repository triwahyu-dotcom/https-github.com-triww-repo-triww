import { NextResponse } from "next/server";
import { readDocuments, saveDocument, deleteDocument } from "@/lib/finance/store";
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
      paymentKeterangan, penaltyMemoUrl,
      usePPh21, pph21Mode, grossAmount, taxAmount, netAmount,
      pphType, usePPN, ppnAmount, totalPO,
      projectInitial,
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
      const initialPart = projectInitial ? `/${projectInitial}` : "";
      docId = `${sequence}/JBBS/${documentType}${initialPart}/${month}/${year}`;
    }
    const subtotalItems = lineItems?.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0) ?? 0;
    
    // Calculate PPh Gross Up if applicable
    const pphRate = pphType === "PPH21" ? 0.025 : pphType === "PPH23" ? 0.02 : 0;
    const isGrossUp = pph21Mode === "grossup";
    const calculatedTaxAmount = isGrossUp ? (subtotalItems / (1 - pphRate)) - subtotalItems : (Number(taxAmount) || 0);
    const subtotalWithTax = subtotalItems + calculatedTaxAmount;

    const ppnAmountValue = usePPN ? subtotalWithTax * 0.11 : 0;
    const totalPOValue = subtotalWithTax + ppnAmountValue;

    const finalAmount = totalPOValue || Number(documentTotal) || 0;
    
    // Determine initial status based on document type
    // PO, SPK, KONTRAK bypass Finance verification and go direct to C-level
    const initialStatus = (documentType === "PO" || documentType === "SPK" || documentType === "KONTRAK") 
      ? "pending_c_level" 
      : "pending_finance";

    const newDoc: ExpenseDocument = {
      id: docId, projectId, projectName, vendorName: vendorName || "Unknown Vendor",
      vendorAddress, vendorTaxId, documentType, issueDate: now.toISOString(),
      description: description || "", amount: finalAmount, status: initialStatus, 
      lineItems: lineItems || [], paymentTerms, deliveryDate, shipTo,
      billingInstruction, billingTerms,
      preparedBy, venue, duration, workScope, lampiran, paymentSchedule,
      paymentKeterangan: paymentKeterangan || [],
      penaltyMemoUrl,
      pphType: pphType || "NONE", 
      usePPh21: (pphType && pphType !== "NONE") || false, 
      pph21Mode: pph21Mode || "none",
      usePPN, 
      grossAmount: subtotalWithTax, 
      taxAmount: calculatedTaxAmount, 
      ppnAmount: ppnAmountValue, 
      netAmount: subtotalWithTax, 
      totalPO: totalPOValue,
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
    
    // Recalculate amounts if any tax or items change
    let calculatedGross = doc.grossAmount;
    let calculatedTax = doc.taxAmount;
    let calculatedPPN = doc.ppnAmount;
    let updatedTotalPO = doc.totalPO;

    if (updates.lineItems || updates.usePPN !== undefined || updates.pphType || updates.pph21Mode) {
      const items = updates.lineItems || doc.lineItems || [];
      const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
      const activeUsePPN = updates.usePPN !== undefined ? updates.usePPN : doc.usePPN;
      const activePphType = updates.pphType || doc.pphType;
      const activePphMode = updates.pph21Mode || doc.pph21Mode;

      const pphRate = activePphType === "PPH21" ? 0.025 : activePphType === "PPH23" ? 0.02 : 0;
      const isGrossUp = activePphMode === "grossup";
      
      calculatedTax = isGrossUp ? (subtotal / (1 - pphRate)) - subtotal : (updates.taxAmount !== undefined ? updates.taxAmount : doc.taxAmount || 0);
      calculatedGross = subtotal + calculatedTax;
      calculatedPPN = activeUsePPN ? calculatedGross * 0.11 : 0;
      updatedTotalPO = calculatedGross + calculatedPPN;
    }

    // Determine status based on document type
    const resetStatus = (doc.documentType === "PO" || doc.documentType === "SPK" || doc.documentType === "KONTRAK") 
      ? "pending_c_level" 
      : "pending_finance";

    const updatedDoc: ExpenseDocument = {
      ...doc,
      ...updates,
      grossAmount: calculatedGross,
      taxAmount: calculatedTax,
      ppnAmount: calculatedPPN,
      totalPO: updatedTotalPO,
      amount: updatedTotalPO,
      status: resetStatus,
      rejectionReason: "", 
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

    await deleteDocument(id);
    logger.audit("FinanceAPI", "DOCUMENT_DELETED", { docId: id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("FinanceAPI", "DOCUMENT_DELETE_FAILED", { error });
    console.error("[DELETE /api/finance/document]", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
