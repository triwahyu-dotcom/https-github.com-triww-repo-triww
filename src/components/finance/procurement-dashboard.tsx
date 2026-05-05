"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { FinanceDashboardData, RequestForPayment, ExpenseDocument } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { SummaryCard } from "../ui/summary-card";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";

import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Wallet, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  Eye, 
  Undo2,
  Plus,
  Printer,
  Edit
} from "lucide-react";

import { POCreatorModal } from "./po-creator-modal";
import { CashAdvanceModal } from "./cash-advance-modal";
import { RfpFromDocModal } from "./rfp-from-doc-modal";
import { SettlementModal } from "./settlement-modal";

import { FilterBar } from "./filter-bar";
import { updateDocStatus, updateRFPStatus } from "@/lib/finance/actions";

interface Props {
  initialData: FinanceDashboardData;
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
  availableFreelancers?: any[];
}

const docTypeLabel: Record<string, string> = {
  PO: "PO",
  SPK: "SPK",
  KONTRAK: "Kontrak",
  CASH_ADVANCE: "Cash Advance",
};

const statusBadgeStyles: Record<string, { bg: string, color: string }> = {
  pending_c_level: { bg: 'rgba(239,159,39,0.15)', color: '#EF9F27' },
  pending_finance: { bg: 'rgba(55,138,221,0.15)', color: '#85B7EB' },
  approved: { bg: 'rgba(99,153,34,0.15)', color: '#97C459' },
  paid: { bg: 'rgba(15,110,86,0.15)', color: '#5DCAA5' },
  draft: { bg: 'rgba(255,255,255,0.06)', color: '#71717a' },
  returned: { bg: 'rgba(226,75,74,0.15)', color: '#F09595' },
  settlement_pending: { bg: 'rgba(255,255,255,0.06)', color: '#a1a1aa' },
  settlement_audit: { bg: 'rgba(55,138,221,0.15)', color: '#85B7EB' },
};

const docTypeStyles: Record<string, { bg: string, color: string }> = {
  PO: { bg: 'rgba(55,138,221,0.15)', color: '#85B7EB' },
  SPK: { bg: 'rgba(83,74,183,0.15)', color: '#AFA9EC' },
  KONTRAK: { bg: 'rgba(15,110,86,0.15)', color: '#5DCAA5' },
  CASH_ADVANCE: { bg: 'rgba(180,115,23,0.15)', color: '#EF9F27' },
};

export function ProcurementDashboard({ initialData, activeProjects, availableVendors = [], availableFreelancers = [] }: Props) {
  const [activeTab, setActiveTab] = useState<"docs" | "rfps">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("procurement-active-tab") as "docs" | "rfps") || "docs";
    }
    return "docs";
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTabChange = (tab: "docs" | "rfps") => {
    setActiveTab(tab);
    localStorage.setItem("procurement-active-tab", tab);
  };
  const [showPOModal, setShowPOModal] = useState(false);
  const [showCAModal, setShowCAModal] = useState(false);
  const [selectedDocForRFP, setSelectedDocForRFP] = useState<ExpenseDocument | null>(null);

  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  const [editDocData, setEditDocData] = useState<ExpenseDocument | null>(null);
  const [editRfpData, setEditRfpData] = useState<RequestForPayment | null>(null);
  const [selectedRfpForSettlement, setSelectedRfpForSettlement] = useState<RequestForPayment | null>(null);

  const reload = () => window.location.reload();

  const docs = useMemo(() => initialData.expenseDocuments || [], [initialData.expenseDocuments]);
  const rfps = useMemo(() => initialData.rfps || [], [initialData.rfps]);

  const [filteredDocs, setFilteredDocs] = useState<ExpenseDocument[]>([]);
  const [filteredRfps, setFilteredRfps] = useState<RequestForPayment[]>([]);

  const pendingApprovalDocs = useMemo(() => docs.filter(d => d.status === "draft" || d.status === "pending_finance" || d.status === "pending_c_level"), [docs]);

  const getDocRfps = useCallback((docId: string) => rfps.filter(r => r.documentIds.includes(docId)), [rfps]);
  const getDocTotalRfpAmount = useCallback((docId: string) => getDocRfps(docId).reduce((s, r) => s + r.totalAmount, 0), [getDocRfps]);

  const readyForRfpDocs = useMemo(() => docs.filter(d => {
    if (d.status !== "approved" && d.status !== "pending_finance" && d.status !== "pending_c_level") return false;
    const totalPaid = getDocTotalRfpAmount(d.id);
    return totalPaid < d.amount - 100;
  }), [docs, getDocTotalRfpAmount]);

  const totalDocValue = useMemo(() => docs.reduce((s, d) => s + d.amount, 0), [docs]);

  const handleFilterDocs = useCallback((items: ExpenseDocument[]) => {
    setFilteredDocs(items);
  }, []);

  const handleFilterRfps = useCallback((items: RequestForPayment[]) => {
    setFilteredRfps(items);
  }, []);

  const headerActions = (
    <div style={{ display: "flex", gap: "10px" }}>
      <button 
        onClick={() => setShowCAModal(true)} 
        style={{ 
          background: 'transparent',
          border: '0.5px solid rgba(255,255,255,0.15)',
          color: '#a1a1aa',
          borderRadius: '8px',
          padding: '6px 14px',
          fontSize: '12px',
          cursor: 'pointer',
          display: isMobile ? "none" : "flex", 
          alignItems: "center", 
          gap: "8px",
          transition: 'all 0.2s'
        }}
      >
        <Plus size={14} /> Cash Advance
      </button>
      <button 
        onClick={() => setShowPOModal(true)} 
        style={{ 
          background: '#378ADD',
          border: 'none',
          color: '#fff',
          borderRadius: '8px',
          padding: '6px 16px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          display: "flex", 
          alignItems: "center", 
          gap: "8px",
          transition: 'all 0.2s'
        }}
      >
        <Plus size={14} /> {isMobile ? "Create" : "New PO / SPK / Kontrak"}
      </button>
    </div>
  );

  return (
    <WorkspaceShell
      title="Procurement Cockpit"
      eyebrow="PROCUREMENT WORKSPACE"
      actions={headerActions}
    >
      {/* Summary Cards */}
      <section className="procurement-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: "24px" }}>
        <SummaryCard 
          label="Total Dokumen" 
          value={String(docs.length)} 
          description={isMobile ? "All" : "PO, SPK, Kontrak, CA"} 
          icon={<FileText size={18} />} 
          trendType="up"
        />
        <SummaryCard 
          label="Menunggu Approve" 
          value={String(pendingApprovalDocs.length)} 
          description={isMobile ? "Wait" : "Belum ditandatangani Director"} 
          icon={<Clock size={18} />} 
          trendType="up"
        />
        <SummaryCard 
          label="Siap Buat RFP" 
          value={String(readyForRfpDocs.length)} 
          description={isMobile ? "RFP" : "Submitted/Approved, belum ada RFP"} 
          icon={<CheckCircle2 size={18} />} 
          trendType="neutral"
        />
        <SummaryCard 
          label="Total Nilai" 
          value={formatCurrencyIDR(totalDocValue)} 
          description={isMobile ? "Total" : "Semua dokumen aktif"} 
          icon={<Wallet size={18} />} 
          trendType="up"
        />
      </section>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <button 
          onClick={() => handleTabChange("docs")} 
          style={{ 
            padding: "6px 14px", 
            borderRadius: "8px", 
            border: activeTab === "docs" ? "none" : "0.5px solid rgba(255,255,255,0.08)", 
            cursor: "pointer", 
            fontSize: "13px", 
            background: activeTab === "docs" ? "#378ADD" : "transparent", 
            color: activeTab === "docs" ? "#fff" : "#71717a", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            transition: 'all 0.2s'
          }}
        >
          Dokumen Pengadaan <span style={{ opacity: 0.7 }}>({docs.length})</span>
        </button>
        <button 
          onClick={() => handleTabChange("rfps")} 
          style={{ 
            padding: "6px 14px", 
            borderRadius: "8px", 
            border: activeTab === "rfps" ? "none" : "0.5px solid rgba(255,255,255,0.08)", 
            cursor: "pointer", 
            fontSize: "13px", 
            background: activeTab === "rfps" ? "#378ADD" : "transparent", 
            color: activeTab === "rfps" ? "#fff" : "#71717a", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            transition: 'all 0.2s'
          }}
        >
          RFP Tracking <span style={{ opacity: 0.7 }}>({rfps.length})</span>
        </button>
      </div>

      {/* Info Banner */}
      {pendingApprovalDocs.length > 0 && activeTab === "docs" && (
        <div style={{ 
          background: 'rgba(55,138,221,0.08)',
          border: '0.5px solid rgba(55,138,221,0.2)',
          borderRadius: '8px',
          padding: '8px 14px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={14} color="#85B7EB" />
          <span style={{ fontSize: '12px', color: '#85B7EB' }}>
            {pendingApprovalDocs.length} dokumen menunggu approval dari Director
          </span>
        </div>
      )}

      {activeTab === "docs" ? (
        <FilterBar items={docs} type="docs" onFilter={handleFilterDocs} />
      ) : (
        <FilterBar items={rfps} type="rfps" onFilter={handleFilterRfps} />
      )}

      {/* Tab: Dokumen */}
      {activeTab === "docs" && (
        <div style={{ background: '#111113', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div className="procurement-table-header" style={{ 
            display: 'grid', 
            gridTemplateColumns: '200px 1fr 1fr 100px 130px 220px',
            background: '#111113',
            padding: '10px 16px',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500 }}>NOMOR DOKUMEN</div>
            <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500 }}>VENDOR / PEMOHON</div>
            <div className="hide-mobile" style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500 }}>PROJECT</div>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500 }}>TIPE</div>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500 }}>NILAI</div>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500, textAlign: 'right' }}>STATUS & AKSI</div>
          </div>

          {filteredDocs.length === 0 ? (
            <div style={{ padding: "80px 20px", textAlign: "center", color: "#3f3f46" }}>
              Tidak ada dokumen yang sesuai filter
            </div>
          ) : filteredDocs.map(doc => (
            <div key={doc.id} className="list-row-premium procurement-row" style={{ 
              display: 'grid', 
              gridTemplateColumns: '200px 1fr 1fr 100px 130px 220px',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '0.5px solid rgba(255,255,255,0.05)'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{doc.id}</div>
                <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>{formatDateFullID(doc.issueDate)}</div>
              </div>
              <div className="hide-mobile" style={{ fontSize: '13px', color: '#a1a1aa' }}>{doc.vendorName || "–"}</div>
              <div className="hide-mobile" style={{ fontSize: '13px', color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.projectName}>
                {doc.projectName}
              </div>
              <div className="hide-mobile">
                <span style={{ 
                  background: docTypeStyles[doc.documentType]?.bg || 'rgba(255,255,255,0.06)', 
                  color: docTypeStyles[doc.documentType]?.color || '#71717a',
                  borderRadius: '20px',
                  padding: '3px 9px',
                  fontSize: '11px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}>
                  {docTypeLabel[doc.documentType]}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#e4e4e7', textAlign: 'right', fontWeight: 500 }}>
                {formatCurrencyIDR(doc.amount)}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <span style={{ 
                  background: statusBadgeStyles[doc.status]?.bg || 'rgba(255,255,255,0.06)', 
                  color: statusBadgeStyles[doc.status]?.color || '#71717a',
                  borderRadius: '20px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 500
                }}>
                  {doc.status.replace(/_/g, " ").toUpperCase()}
                </span>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  {doc.status === "draft" && (
                    <button onClick={() => setEditDocData(doc)} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>
                      Edit
                    </button>
                  )}
                  {(doc.status === "pending_finance" || doc.status === "pending_c_level") && (
                    <button onClick={async () => { if(confirm("Tarik dokumen?")) { await updateDocStatus(doc.id, "draft"); reload(); } }} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>
                      Tarik
                    </button>
                  )}
                  {doc.status === "approved" && (
                    <button onClick={() => setSelectedDocForRFP(doc)} style={{ background: 'rgba(55,138,221,0.15)', color: '#85B7EB', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', border: 'none', cursor: 'pointer' }}>
                      Buat RFP
                    </button>
                  )}
                  {doc.status === "settlement_pending" && doc.documentType === "CASH_ADVANCE" && (
                    <button 
                      onClick={() => {
                        const linkedRfp = rfps.find(r => r.documentIds.includes(doc.id) && (r.status === "paid" || r.status === "settled"));
                        if (linkedRfp) setSelectedRfpForSettlement(linkedRfp);
                        else alert("RFP untuk CA ini belum lunas atau tidak ditemukan.");
                      }} 
                      style={{ background: 'rgba(239,159,39,0.15)', color: '#EF9F27', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', border: 'none', cursor: 'pointer' }}
                    >
                      Submit STL
                    </button>
                  )}
                  <button onClick={() => window.open(`/finance/print/${doc.id}`, "_blank")} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>
                    Print
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: RFP Tracking */}
      {activeTab === "rfps" && (
        <div style={{ background: '#111113', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '150px 1fr 1fr 130px 220px',
            background: '#111113',
            padding: '10px 16px',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500 }}>RFP ID</div>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500 }}>PAYEE / VENDOR</div>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500 }}>PROJECT</div>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500 }}>NOMINAL</div>
            <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.05em', fontWeight: 500, textAlign: 'right' }}>STATUS & AKSI</div>
          </div>

          {filteredRfps.length === 0 ? (
            <div style={{ padding: "80px 20px", textAlign: "center", color: "#3f3f46" }}>
              Tidak ada RFP yang sesuai filter
            </div>
          ) : filteredRfps.map(rfp => (
            <div key={rfp.id} className="list-row-premium" style={{ 
              display: 'grid', 
              gridTemplateColumns: '150px 1fr 1fr 130px 220px',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '0.5px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ fontFamily: "monospace", fontSize: "12px", color: '#e4e4e7' }}>#{rfp.id.substring(0, 10)}</div>
              <div>
                <div style={{ fontSize: '13px', color: '#a1a1aa' }}>{rfp.payeeName}</div>
                <div style={{ fontSize: '11px', color: '#52525b' }}>{rfp.paymentType}</div>
              </div>
              <div style={{ fontSize: '13px', color: '#a1a1aa' }}>{rfp.projectName}</div>
              <div style={{ fontSize: '13px', color: '#e4e4e7', fontWeight: 500 }}>{formatCurrencyIDR(rfp.netAmount || rfp.totalAmount)}</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <span style={{ 
                  background: statusBadgeStyles[rfp.status]?.bg || 'rgba(255,255,255,0.06)', 
                  color: statusBadgeStyles[rfp.status]?.color || '#71717a',
                  borderRadius: '20px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 500
                }}>
                  {rfp.status.replace(/_/g, " ").toUpperCase()}
                </span>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  {rfp.status === "draft" && (
                    <button onClick={() => setEditRfpData(rfp)} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>
                      Edit
                    </button>
                  )}
                  {(rfp.status === "pending_finance" || rfp.status === "pending_c_level") && (
                    <button onClick={async () => { if(confirm("Tarik RFP?")) { await updateRFPStatus(rfp.id, "draft"); reload(); } }} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>
                      Tarik
                    </button>
                  )}
                  {rfp.paymentProofUrl && (
                    <button onClick={() => setViewProofUrl(rfp.paymentProofUrl!)} style={{ background: 'transparent', border: '0.5px solid rgba(151,196,89,0.3)', color: '#97C459', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>
                      Bukti
                    </button>
                  )}
                  <button onClick={() => window.open(`/finance/print/${rfp.id}`, "_blank")} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>
                    Print
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {(showPOModal || (editDocData && editDocData.documentType !== "CASH_ADVANCE")) && (
        <POCreatorModal
          activeProjects={activeProjects}
          availableVendors={availableVendors}
          availableFreelancers={availableFreelancers}
          editDoc={editDocData && editDocData.documentType !== "CASH_ADVANCE" ? editDocData : undefined}
          onClose={() => { setShowPOModal(false); setEditDocData(null); }}
          onSuccess={() => { setShowPOModal(false); setEditDocData(null); reload(); }}
        />
      )}
      {(showCAModal || (editDocData && editDocData.documentType === "CASH_ADVANCE")) && (
        <CashAdvanceModal
          activeProjects={activeProjects}
          availableVendors={availableVendors}
          editDoc={editDocData && editDocData.documentType === "CASH_ADVANCE" ? editDocData : undefined}
          onClose={() => { setShowCAModal(false); setEditDocData(null); }}
          onSuccess={() => { setShowCAModal(false); setEditDocData(null); reload(); }}
        />
      )}
      {(selectedDocForRFP || editRfpData) && (
        <RfpFromDocModal
          doc={selectedDocForRFP || docs.find(d => d.id === editRfpData?.documentIds[0])!}
          editRfp={editRfpData || undefined}
          allRfps={rfps}
          availableVendors={availableVendors}
          onClose={() => { setSelectedDocForRFP(null); setEditRfpData(null); }}
          onSuccess={() => { setSelectedDocForRFP(null); setEditRfpData(null); handleTabChange("rfps"); reload(); }}
        />
      )}

      {selectedRfpForSettlement && (
        <SettlementModal 
          rfp={selectedRfpForSettlement} 
          isOpen={true} 
          onClose={() => setSelectedRfpForSettlement(null)} 
        />
      )}


      {/* Proof Lightbox */}
      {viewProofUrl && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}
          onClick={() => setViewProofUrl(null)}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button style={{ position: "absolute", top: "-40px", right: "0", background: "none", border: "none", color: "white", fontSize: "24px", cursor: "pointer" }}>&times; Tutup</button>
            <img src={viewProofUrl} alt="Bukti Transfer" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 1024px) {
          .procurement-stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .procurement-table-header {
            grid-template-columns: 100px 60px 80px 1fr !important;
          }
          .procurement-row {
            grid-template-columns: 100px 60px 80px 1fr !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .procurement-stat-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </WorkspaceShell>
  );
}
