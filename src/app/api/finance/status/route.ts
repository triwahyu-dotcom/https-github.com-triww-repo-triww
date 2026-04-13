import { NextRequest, NextResponse } from "next/server";
import { readRFPs, saveRFP, readDocuments, saveDocument } from "@/lib/finance/store";

export async function PATCH(req: NextRequest) {
  try {
    const { rfpId, docId, status, digitalSignature, rejectionReason } = await req.json();
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
      }
      await saveDocument(docs[idx]);
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
      rfp.notes = (rfp.notes || "") + `\n\n[REJECTION REASON]: ${rejectionReason}`;
    }
    await saveRFP(rfp);

    // Cascade status to linked documents
    const docs = await readDocuments();
    for (const doc of docs) {
      if (doc.rfpId === rfpId) {
        if (status === "approved") {
          doc.status = "approved";
          doc.approvedBy = { name: "Eka Marutha Yuswardana", date: today, digitalSignature };
        } else if (status === "paid") {
          doc.status = "paid";
        } else if (status === "pending_finance") {
          doc.status = "submitted";
        }
        await saveDocument(doc);
      }
    }

    return NextResponse.json({ success: true, rfp });
  } catch (error: any) {
    console.error("Status Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
