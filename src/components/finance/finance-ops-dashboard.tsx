"use client";

import { useState } from "react";
import { FinanceDashboardData, RequestForPayment } from "@/lib/finance/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { SummaryCard } from "../ui/summary-card";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";
import { updateRFPStatus } from "@/lib/finance/actions";

interface Props {
  initialData: FinanceDashboardData;
}

export function FinanceOpsDashboard({ initialData }: Props) {
  const [activeTab, setActiveTab] = useState<"verification" | "payment" | "settlement">("verification");
  
  const handleUpdateStatus = (rfpId: string, status: string) => updateRFPStatus(rfpId, status);

  const verificationQueue = initialData.rfps.filter(r => r.status === "pending_finance");
  const paymentQueue = initialData.rfps.filter(r => r.status === "approved");
  const settlementQueue = initialData.rfps.filter(r => r.status === "pending_settlement_approval");

  const getActiveQueue = () => {
    if (activeTab === "verification") return verificationQueue;
    if (activeTab === "payment") return paymentQueue;
    return settlementQueue;
  };

  return (
    <WorkspaceShell title="Finance Operations" eyebrow="Finance Admin View">
      <section className="summary-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '24px' }}>
         <SummaryCard label="In Review" value={String(verificationQueue.length)} description="Awaiting audit" icon="🔍" />
         <SummaryCard label="Ready to Pay" value={String(paymentQueue.length)} description="C-Level approved" icon="💳" />
         <SummaryCard label="Pending Settlement" value={String(settlementQueue.length)} description="Waiting for approval" icon="🧾" />
         <SummaryCard label="Outstanding" value={formatCurrencyIDR(initialData.summary.totalOutstandingAmount)} description="Unpaid commitment" icon="💰" />
         <SummaryCard label="Processed" value={String(initialData.rfps.filter(r => r.status === 'paid' || r.status === 'settled').length)} description="Completed payments" icon="✅" />
      </section>

      <div className="toolbar-panel">
        <div className="database-tabs">
           <button className={`chip ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => setActiveTab('verification')}>
             Verification Queue ({verificationQueue.length})
           </button>
           <button className={`chip ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
             Payment Hub ({paymentQueue.length})
           </button>
           <button className={`chip ${activeTab === 'settlement' ? 'active' : ''}`} onClick={() => setActiveTab('settlement')}>
             Settlement Checks ({settlementQueue.length})
           </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '24px' }}>
         <div className="table-shell">
            <div className="project-table" style={{ minWidth: "1000px" }}>
               <div className="table-row table-head" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr 1.5fr" }}>
                  <div>RFP Detail</div>
                  <div>Project / Payee</div>
                  <div>Amount {activeTab === "settlement" && " / Diff"}</div>
                  <div>Request Date</div>
                  <div style={{ textAlign: "right" }}>Action</div>
               </div>
               
               {getActiveQueue().length === 0 ? (
                 <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted-soft)' }}>
                    Queue is empty. Great job!
                 </div>
               ) : getActiveQueue().map(rfp => (
                 <div key={rfp.id} className="table-row" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr 1.5fr" }}>
                    <div style={{ fontWeight: 600 }}>#{rfp.id.substring(0,8)}</div>
                    <div>
                       <div>{rfp.projectName}</div>
                       <div className="mini-meta">{rfp.payeeName}</div>
                    </div>
                    <div>
                       <div style={{ fontWeight: 600 }}>{formatCurrencyIDR(rfp.totalAmount)}</div>
                       {activeTab === "settlement" && rfp.settlementDetails && (
                         <div style={{ fontSize: '11px', color: rfp.settlementDetails.difference > 0 ? '#ff4a4a' : '#22c55e', marginTop: '2px' }}>
                           Actual: {formatCurrencyIDR(rfp.settlementDetails.actualAmount)}
                         </div>
                       )}
                    </div>
                    <div className="mini-meta">{formatDateFullID(rfp.requestDate)}</div>
                    <div style={{ textAlign: "right", display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                       <a href={`/finance/print/${rfp.id}`} className="secondary-button" style={{ fontSize: "11px", padding: '4px 12px' }}>Audit Docs</a>
                       {activeTab === 'verification' && (
                          <button onClick={() => handleUpdateStatus(rfp.id, 'pending_c_level')} className="primary-button" style={{ fontSize: "11px", padding: '4px 16px', background: 'var(--blue)' }}>Verify & Forward</button>
                       )}
                       {activeTab === 'payment' && (
                          <button onClick={() => handleUpdateStatus(rfp.id, 'paid')} className="primary-button" style={{ fontSize: "11px", padding: '4px 16px', background: 'var(--green)' }}>Mark as Paid</button>
                       )}
                       {activeTab === 'settlement' && (
                          <button onClick={() => handleUpdateStatus(rfp.id, 'settled')} className="primary-button" style={{ fontSize: "11px", padding: '4px 16px', background: 'var(--green)' }}>Approve Settlement</button>
                       )}
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </WorkspaceShell>
  );
}
