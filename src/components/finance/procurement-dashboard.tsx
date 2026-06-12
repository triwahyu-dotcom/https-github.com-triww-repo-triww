"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { FinanceDashboardData, RequestForPayment, ExpenseDocument } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { MetricCard } from "../ui/MetricCard";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";
import { ViewSwitcher } from "./portal-router";

import { POCreatorModal } from "./po-creator-modal";
import { CashAdvanceModal } from "./cash-advance-modal";
import { RfpFromDocModal } from "./rfp-from-doc-modal";
import { SettlementModal } from "./settlement-modal";

import { FilterBar } from "./filter-bar";
import { updateDocStatus, updateRFPStatus, deleteExpenseDocument, deleteRFP } from "@/lib/finance/actions";
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
  Edit,
  Trash2,
  X
} from "lucide-react";

interface Props {
  initialData: FinanceDashboardData;
  activeProjects: ProjectRecord[];
  availableVendors?: any[];
  availableFreelancers?: any[];
  viewMode?: "monitoring" | "operational";
  onViewModeChange?: (mode: "monitoring" | "operational") => void;
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

export function ProcurementDashboard({ 
  initialData, 
  activeProjects, 
  availableVendors = [], 
  availableFreelancers = [],
  viewMode,
  onViewModeChange
}: Props) {
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const openPO = localStorage.getItem("juara_finance_open_po_on_load");
      if (openPO === "true") {
        setShowPOModal(true);
        localStorage.removeItem("juara_finance_open_po_on_load");
      }
    }
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
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    confirmText?: string;
    isDanger?: boolean;
  } | null>(null);

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
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      {viewMode && onViewModeChange && (
        <ViewSwitcher viewMode={viewMode} onViewModeChange={onViewModeChange} />
      )}
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
        <MetricCard
          label="Total Dokumen"
          value={String(docs.length)}
          subtitle={isMobile ? "All" : "PO, SPK, Kontrak, CA"}
          icon={<FileText size={16} />}
        />
        <MetricCard
          label="Menunggu Approve"
          value={String(pendingApprovalDocs.length)}
          subtitle={isMobile ? "Wait" : "Belum ditandatangani Director"}
          icon={<Clock size={16} />}
        />
        <MetricCard
          label="Siap Buat RFP"
          value={String(readyForRfpDocs.length)}
          subtitle={isMobile ? "RFP" : "Submitted/Approved, belum ada RFP"}
          icon={<CheckCircle2 size={16} />}
        />
        <MetricCard
          label="Total Nilai"
          value={formatCurrencyIDR(totalDocValue)}
          subtitle={isMobile ? "Total" : "Semua dokumen aktif"}
          icon={<Wallet size={16} />}
          valueColor="#EF9F27"
        />
      </section>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)', marginBottom: '20px' }}>
        <div
          onClick={() => handleTabChange("docs")}
          className={`tab-item ${activeTab === "docs" ? 'tab-active' : 'tab-inactive'}`}
          style={{ padding: '12px 20px', fontSize: 13, cursor: 'pointer' }}
        >
          Dokumen Pengadaan <span style={{ opacity: 0.6, fontSize: '11px' }}>({docs.length})</span>
        </div>
        <div
          onClick={() => handleTabChange("rfps")}
          className={`tab-item ${activeTab === "rfps" ? 'tab-active' : 'tab-inactive'}`}
          style={{ padding: '12px 20px', fontSize: 13, cursor: 'pointer' }}
        >
          RFP Tracking <span style={{ opacity: 0.6, fontSize: '11px' }}>({rfps.length})</span>
        </div>
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
                    <>
                      <button onClick={() => setEditDocData(doc)} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit size={10} /> Edit
                      </button>
                      <button 
                        onClick={() => { 
                          setConfirmModal({
                            isOpen: true,
                            title: "Hapus Dokumen",
                            message: `Apakah Anda yakin ingin menghapus dokumen ${doc.id}? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`,
                            confirmText: "Hapus Permanen",
                            isDanger: true,
                            onConfirm: async () => {
                              await deleteExpenseDocument(doc.id);
                            }
                          });
                        }} 
                        style={{ background: 'rgba(226,75,74,0.1)', color: '#F09595', border: '0.5px solid rgba(226,75,74,0.2)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={10} /> Hapus
                      </button>
                    </>
                  )}
                  {(doc.status === "pending_finance" || doc.status === "pending_c_level" || doc.status === "approved") && (
                    <button 
                      onClick={() => { 
                        const confirmMsg = doc.status === "approved" 
                          ? "Apakah Anda yakin ingin menarik dokumen ini? Ini akan membatalkan persetujuan C-Level dan menghapus tanda tangan digital resmi pada dokumen." 
                          : "Apakah Anda yakin ingin menarik kembali dokumen ini ke status Draf?";
                        setConfirmModal({
                          isOpen: true,
                          title: "Tarik Dokumen",
                          message: confirmMsg,
                          confirmText: "Tarik Ke Draf",
                          isDanger: doc.status === "approved",
                          onConfirm: async () => {
                            await updateDocStatus(doc.id, "draft");
                            reload();
                          }
                        });
                      }} 
                      style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
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
          <div className="procurement-table-header" style={{ 
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
            <div key={rfp.id} className="list-row-premium procurement-row" style={{ 
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
                {rfp.sourceAccountNo && (
                  <div style={{ fontSize: '10px', color: '#378ADD', marginTop: '2px', fontFamily: 'monospace' }}>
                    ← BCA {rfp.sourceAccountNo}
                  </div>
                )}
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
                    <>
                      <button onClick={() => setEditRfpData(rfp)} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit size={10} /> Edit
                      </button>
                      <button 
                        onClick={() => { 
                          setConfirmModal({
                            isOpen: true,
                            title: "Hapus RFP",
                            message: `Apakah Anda yakin ingin menghapus RFP #${rfp.id.substring(0,8)}? Tindakan ini bersifat permanen.`,
                            confirmText: "Hapus Permanen",
                            isDanger: true,
                            onConfirm: async () => {
                              await deleteRFP(rfp.id);
                            }
                          });
                        }} 
                        style={{ background: 'rgba(226,75,74,0.1)', color: '#F09595', border: '0.5px solid rgba(226,75,74,0.2)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={10} /> Hapus
                      </button>
                    </>
                  )}
                  {(rfp.status === "pending_finance" || rfp.status === "pending_c_level") && (
                    <button 
                      onClick={() => { 
                        setConfirmModal({
                          isOpen: true,
                          title: "Tarik RFP",
                          message: "Apakah Anda yakin ingin menarik kembali RFP ini ke status Draf?",
                          confirmText: "Tarik Ke Draf",
                          isDanger: false,
                          onConfirm: async () => {
                            await updateRFPStatus(rfp.id, "draft");
                            reload();
                          }
                        });
                      }} 
                      style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: '#71717a', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
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

      {confirmModal && confirmModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 3000, display: "grid", placeItems: "center", padding: "20px" }}>
          <div style={{ background: "#1f1f23", borderRadius: "24px", width: "100%", maxWidth: "440px", border: "0.5px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)", overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', background: '#111113', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: confirmModal.isDanger ? 'rgba(239,68,68,0.1)' : 'rgba(55,138,221,0.1)', color: confirmModal.isDanger ? '#f87171' : '#85B7EB', display: 'grid', placeItems: 'center' }}>
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#f4f4f5" }}>{confirmModal.title}</h3>
              </div>
              <button onClick={() => setConfirmModal(null)} style={{ background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '32px' }}>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                {confirmModal.message}
              </p>
              
              <div style={{ display: "flex", gap: "12px", marginTop: '24px' }}>
                <button onClick={() => setConfirmModal(null)} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#a1a1aa", fontSize: '13px', fontWeight: 600, cursor: "pointer" }}>Batal</button>
                <button 
                  onClick={async () => {
                    await confirmModal.onConfirm();
                    setConfirmModal(null);
                  }} 
                  style={{ 
                    flex: 2, padding: "12px", background: confirmModal.isDanger ? "#f87171" : "#378ADD", border: "none", borderRadius: "10px", 
                    color: "#fff", fontSize: '13px', fontWeight: 700, cursor: "pointer", 
                    transition: 'all 0.2s'
                  }}
                >
                  {confirmModal.confirmText || "Konfirmasi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 1024px) {
          .procurement-stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .procurement-table-header {
            display: none !important;
          }
          .procurement-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            padding: 14px 16px !important;
            background: rgba(255, 255, 255, 0.02) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
          .procurement-row > div {
            text-align: left !important;
          }
          .procurement-row > div:last-child {
            justify-content: flex-start !important;
            margin-top: 4px;
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
