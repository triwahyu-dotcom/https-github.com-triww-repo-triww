import { getFinanceDashboardData } from "@/lib/finance/store";
import { PrintLayout } from "./print-layout";

export const dynamic = "force-dynamic";

export default async function PrintRFPPage({ params }: { params: Promise<{ id: string[] }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id.join("/");
  
  console.log("[PrintPage] Captured ID:", id);
  
  const financeData = await getFinanceDashboardData();
  
  // Find if it's an RFP or a Doc
  const rfp = financeData.rfps.find(r => r.id === id);
  const doc = financeData.expenseDocuments.find(d => d.id === id || d.rfpId === id);

  console.log("[PrintPage] Found:", { hasRfp: !!rfp, hasDoc: !!doc, docType: doc?.documentType });

  if (!rfp && !doc) {
    return <div style={{ padding: 40, textAlign: "center" }}>Document not found: {id}</div>;
  }

  // If we arrived via doc ID but it has an RFP, show both or show the RFP.
  // We'll pass both to the layout.
  return <PrintLayout rfp={rfp} doc={doc} />;
}
