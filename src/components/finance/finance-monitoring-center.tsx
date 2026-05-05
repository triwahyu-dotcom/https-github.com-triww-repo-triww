"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  BarChart3, 
  Clock, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  ArrowRight,
  Filter,
  Download,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Briefcase,
  Search,
  Receipt
} from "lucide-react";
import { FinanceDashboardData, ExpenseDocument, RequestForPayment, LineItem, PaymentEvent } from "@/lib/finance/types";
import { ProjectRecord } from "@/lib/project/types";
import { WorkspaceShell } from "../layout/workspace-shell";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";

interface Props {
  initialData: FinanceDashboardData;
  activeProjects: ProjectRecord[];
}

export function FinanceMonitoringCenter({ initialData, activeProjects }: Props) {
  const [activeTab, setActiveTab] = useState<"project" | "outstanding" | "approval" | "summary" | "settlement">("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjects[0]?.id || null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedProject = useMemo(() => 
    activeProjects.find(p => p.id === selectedProjectId) || activeProjects[0]
  , [activeProjects, selectedProjectId]);

  // Global Stat Calculations
  const globalStats = useMemo(() => {
    const totalBudget = activeProjects.reduce((sum, p) => sum + (p.projectValue || 0), 0);
    
    const allDocs = initialData.expenseDocuments || [];
    const allRFPs = initialData.rfps || [];
    
    const totalCommitted = allDocs.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalPaid = allRFPs.filter(r => r.status === "paid" || r.status === "settled").reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const totalOutstanding = totalCommitted - totalPaid;
    
    const pendingApproval = 
      allDocs.filter(d => d.status === "pending_finance" || d.status === "pending_c_level").length +
      allRFPs.filter(r => r.status === "pending_finance" || r.status === "pending_c_level").length;

    return { totalBudget, totalOutstanding, totalPaid, pendingApproval };
  }, [initialData, activeProjects]);

  // Financial calculations for the selected project
  const projectStats = useMemo(() => {
    if (!selectedProject) return null;
    
    const docs = (initialData.expenseDocuments || []).filter(d => d.projectId === selectedProject.id);
    const rfps = (initialData.rfps || []).filter(r => r.projectId === selectedProject.id);
    
    const totalPO = docs.filter(d => d.documentType !== "CASH_ADVANCE").reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalCA = docs.filter(d => d.documentType === "CASH_ADVANCE").reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalPaid = rfps.filter(r => r.status === "paid" || r.status === "settled").reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const totalOutstanding = (totalPO + totalCA) - totalPaid;
    
    const budget = selectedProject.projectValue || 0;
    const usedBudget = totalPO + totalCA;
    const budgetPercent = budget > 0 ? Math.min(Math.round((usedBudget / budget) * 100), 100) : 0;

    // Build timeline from document payment schedules
    const timelineItems = docs.flatMap(d => (d.paymentSchedule || []).map(s => ({
      label: `${d.documentType}: ${s.label} — ${formatCurrencyIDR(s.amount || 0)}`,
      date: s.date || d.issueDate,
      status: (initialData.rfps || []).some(r => r.documentIds?.includes(d.id) && r.status === "paid") ? "Lunas" : "Pending",
      type: (initialData.rfps || []).some(r => r.documentIds?.includes(d.id) && r.status === "paid") ? "success" : "warning"
    }))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);

    return { totalPO, totalCA, totalPaid, totalOutstanding, budget, usedBudget, budgetPercent, timelineItems };
  }, [selectedProject, initialData]);

  // Outstanding Payment Monitor Data
  const outstandingPayments = useMemo(() => {
    return (initialData.expenseDocuments || [])
      .map(d => {
        const paidAmount = (initialData.rfps || [])
          .filter(r => r.documentIds?.includes(d.id) && (r.status === "paid" || r.status === "settled"))
          .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        return { ...d, outstandingAmount: d.amount - paidAmount };
      })
      .filter(d => d.outstandingAmount > 0)
      .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
  }, [initialData]);

  // Export Functionality
  const handleExport = () => {
    const headers = ["Project Name", "Client", "Total Value", "Realization", "% Burn", "Outstanding"];
    const rows = activeProjects.map(p => {
      const docs = (initialData.expenseDocuments || []).filter(d => d.projectId === p.id);
      const rfps = (initialData.rfps || []).filter(r => r.projectId === p.id);
      const realization = docs.reduce((s, d) => s + (d.amount || 0), 0);
      const paid = rfps.filter(r => r.status === "paid" || r.status === "settled").reduce((s, r) => s + (r.totalAmount || 0), 0);
      const outstanding = realization - paid;
      const budget = p.projectValue || 0;
      const percent = budget > 0 ? Math.round((realization / budget) * 100) : 0;
      
      return [
        p.projectName,
        p.client,
        budget,
        realization,
        `${percent}%`,
        outstanding
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Finance_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <WorkspaceShell title="Finance Monitoring Center" eyebrow="FINANCE & RFP — MONITORING">
      
      {/* Top Header Actions */}
      <div className="finance-header-actions" style={{ position: 'absolute', top: '24px', right: isMobile ? '16px' : '40px', display: 'flex', gap: '12px' }}>
        <button 
          onClick={handleExport}
          className="desktop-only-btn"
          style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 20px', color: '#e4e4e7', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={16} /> Export
        </button>
        <button style={{ background: '#378ADD', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> {isMobile ? 'New' : '+ New PO / SPK'}
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="finance-nav-tabs" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.06)', width: isMobile ? '100%' : 'fit-content', marginBottom: '32px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {[
          { id: 'project', label: isMobile ? 'Project' : 'Project Finance Dashboard', icon: <BarChart3 size={16} /> },
          { id: 'outstanding', label: isMobile ? 'Out.' : 'Outstanding Payment', icon: <Clock size={16} /> },
          { id: 'approval', label: isMobile ? 'Appr.' : 'Approval Pipeline', icon: <CheckCircle2 size={16} /> },
          { id: 'settlement', label: isMobile ? 'Sett.' : 'CA Settlement Tracker', icon: <Receipt size={16} /> },
          { id: 'summary', label: isMobile ? 'Sum.' : 'Multi-Project Summary', icon: <Briefcase size={16} /> }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            style={{ 
              padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none',
              display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', flexShrink: 0,
              background: activeTab === tab.id ? '#378ADD' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#71717a'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Global Stat Cards */}
      <div className="finance-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
        <StatCard label="Total Budget Aktif" value={formatCurrencyIDR(globalStats.totalBudget)} trend="+ Rp 0M dari bulan lalu" trendType="neutral" icon={<TrendingUp size={20} />} />
        <StatCard label="Outstanding" value={formatCurrencyIDR(globalStats.totalOutstanding)} trend="Total committed unpaid" trendType="down" icon={<AlertCircle size={20} />} color="#EF9F27" />
        <StatCard label="Pending Approval" value={String(globalStats.pendingApproval)} trend="Queue awaiting action" trendType="down" icon={<Clock size={20} />} color="#378ADD" />
        <StatCard label="Sudah Dibayar" value={formatCurrencyIDR(globalStats.totalPaid)} trend="Total realization" trendType="up" icon={<CheckCircle2 size={20} />} color="#5DCAA5" />
      </div>

      {activeTab === 'project' && (
        <div className="finance-project-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
          
          {/* Project Summary Left Column */}
          <div style={{ background: '#1f1f23', borderRadius: '20px', border: '0.5px solid rgba(255,255,255,0.06)', padding: isMobile ? '20px' : '32px' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', marginBottom: '32px', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ position: 'relative', width: '100%' }}>
                   <select 
                    value={selectedProjectId || ""} 
                    onChange={e => setSelectedProjectId(e.target.value)}
                    style={{ 
                      appearance: 'none',
                      background: 'rgba(255,255,255,0.03)', 
                      border: '0.5px solid rgba(255,255,255,0.1)', 
                      color: '#f4f4f5', 
                      fontSize: isMobile ? '16px' : '20px', 
                      fontWeight: 700, 
                      outline: 'none', 
                      width: '100%', 
                      padding: '10px 40px 10px 16px', 
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#378ADD'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  >
                    {activeProjects.map(p => <option key={p.id} value={p.id} style={{ background: '#18181b', color: '#e4e4e7', padding: '12px' }}>{p.projectName}</option>)}
                  </select>
                  <ChevronRight size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: '#71717a', pointerEvents: 'none' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', marginLeft: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{selectedProject?.client}</span>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3f3f46' }} />
                  <span style={{ fontSize: '12px', color: '#378ADD', fontWeight: 600 }}>{selectedProject?.currentStageLabel || 'Finance stage'}</span>
                </div>
              </div>
              <div style={{ background: 'rgba(239,159,39,0.1)', color: '#EF9F27', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 800, border: '0.5px solid rgba(239,159,39,0.2)', textAlign: 'center' }}>
                {formatCurrencyIDR(projectStats?.usedBudget || 0)}
              </div>
            </div>

            {/* Budget Bar */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#71717a' }}>Budget terpakai</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#EF9F27' }}>{projectStats?.budgetPercent}%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${projectStats?.budgetPercent}%`, background: 'linear-gradient(90deg, #EF9F27, #f59e0b)', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Project Details Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ProjectDetailRow label="Total PO/SPK" value={formatCurrencyIDR(projectStats?.totalPO || 0)} meta={`${(initialData.expenseDocuments || []).filter(d => d.projectId === selectedProject?.id && d.documentType !== "CASH_ADVANCE").length} dokumen`} icon={<CreditCard size={18} />} />
              <ProjectDetailRow label="Cash Advance" value={formatCurrencyIDR(projectStats?.totalCA || 0)} meta={`${(initialData.expenseDocuments || []).filter(d => d.projectId === selectedProject?.id && d.documentType === "CASH_ADVANCE").length} CA aktif`} icon={<DollarSign size={18} />} />
              <ProjectDetailRow label="Outstanding" value={formatCurrencyIDR(projectStats?.totalOutstanding || 0)} meta="Belum terbayar" valueColor="#EF9F27" icon={<Clock size={18} />} />
              <ProjectDetailRow label="Sudah dibayar" value={formatCurrencyIDR(projectStats?.totalPaid || 0)} meta="Total RFPs Paid" valueColor="#5DCAA5" icon={<CheckCircle2 size={18} />} />
            </div>
          </div>

          {/* Timeline Right Column */}
          <div style={{ background: '#1f1f23', borderRadius: '20px', border: '0.5px solid rgba(255,255,255,0.06)', padding: isMobile ? '20px' : '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', margin: '0 0 8px 0' }}>Timeline</h3>
            <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 32px 0' }}>Jadwal pembayaran project</p>

            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: 'rgba(255,255,255,0.06)' }} />
              
              {projectStats?.timelineItems.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#3f3f46', fontSize: '13px' }}>No payment schedules found.</div>
              ) : projectStats?.timelineItems.map((item, i) => (
                <TimelineItem key={i} label={item.label} date={formatDateFullID(item.date)} status={item.status} statusType={item.type} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'outstanding' && (
        <div style={{ background: '#1f1f23', borderRadius: '20px', border: '0.5px solid rgba(255,255,255,0.06)', padding: '32px', animation: 'fadeIn 0.3s ease-out' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
             <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>Outstanding Payments Across All Projects</h3>
             <div style={{ display: 'flex', gap: '8px' }}>
               <div style={{ position: 'relative' }}>
                 <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
                 <input style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px 8px 34px', fontSize: '13px', color: '#e4e4e7', outline: 'none', width: '240px' }} placeholder="Search vendor or project..." />
               </div>
               <button style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#71717a', fontSize: '13px', cursor: 'pointer' }}><Filter size={16} /></button>
             </div>
           </div>

           <div className="finance-table-header" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px' }}>
             <span>PROJECT & VENDOR</span>
             <span>DUE DATE</span>
             <span>TOTAL VALUE</span>
             <span>OUTSTANDING</span>
             <span style={{ textAlign: 'right' }}>ACTION</span>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column' }}>
             {outstandingPayments.length === 0 ? (
               <div style={{ padding: '80px', textAlign: 'center', color: '#3f3f46' }}>No outstanding payments found.</div>
             ) : outstandingPayments.map((item, idx) => (
               <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '20px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.2s' }}>
                 <div>
                   <div style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>{item.projectName}</div>
                   <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>{item.vendorName}</div>
                 </div>
                 <div>
                   <div style={{ fontSize: '13px', color: '#e4e4e7' }}>{formatDateFullID(item.issueDate)}</div>
                   <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>Due in 4 days</div>
                 </div>
                 <div style={{ fontSize: '13px', color: '#a1a1aa' }}>{formatCurrencyIDR(item.amount)}</div>
                 <div style={{ fontSize: '14px', fontWeight: 700, color: '#EF9F27' }}>{formatCurrencyIDR(item.outstandingAmount)}</div>
                 <div style={{ textAlign: 'right' }}>
                   <button style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Create RFP</button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'approval' && (
        <div style={{ background: '#1f1f23', borderRadius: '20px', border: '0.5px solid rgba(255,255,255,0.06)', padding: '32px', animation: 'fadeIn 0.3s ease-out' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', marginBottom: '32px' }}>Approval Pipeline Status</h3>
           
           <div className="pipeline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '40px' }}>
              <PipelineCard label="Draft" count={ (initialData.expenseDocuments || []).filter(d => d.status === "draft").length } color="#52525b" />
              <PipelineCard label="Pending C-Level" count={ (initialData.expenseDocuments || []).filter(d => d.status === "pending_c_level").length } color="#EF9F27" active />
              <PipelineCard label="Pending Finance" count={ (initialData.expenseDocuments || []).filter(d => d.status === "pending_finance").length } color="#378ADD" />
              <PipelineCard label="Ready to Pay" count={ (initialData.rfps || []).filter(r => r.status === "approved").length } color="#8b5cf6" />
              <PipelineCard label="Approved" count={ (initialData.expenseDocuments || []).filter(d => d.status === "approved").length } color="#97C459" />
              <PipelineCard label="Paid" count={ (initialData.rfps || []).filter(r => r.status === "paid").length } color="#5DCAA5" />
           </div>

           <div style={{ background: '#111113', borderRadius: '16px', padding: '24px', border: '0.5px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} color="#ef4444" /> Stuck / Aging Alert
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(initialData.expenseDocuments || [])
                  .filter(d => d.status !== "paid" && d.status !== "settled")
                  .map(d => {
                    const days = Math.floor((new Date().getTime() - new Date(d.issueDate).getTime()) / (1000 * 60 * 60 * 24));
                    if (days < 3) return null;
                    return (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239,68,68,0.05)', borderLeft: `4px solid ${days > 7 ? '#ef4444' : '#f59e0b'}`, padding: '12px 20px', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontSize: '14px', color: '#e4e4e7', fontWeight: 500 }}>{d.id} — {d.vendorName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: '#a1a1aa', padding: '4px 10px', borderRadius: '6px' }}>{d.status}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: days > 7 ? '#ef4444' : '#f59e0b' }}>{days} hari</span>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
           </div>
        </div>
      )}

      {activeTab === 'settlement' && (
        <div style={{ background: '#1f1f23', borderRadius: '20px', border: '0.5px solid rgba(255,255,255,0.06)', padding: '32px', animation: 'fadeIn 0.3s ease-out' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', marginBottom: '32px' }}>Cash Advance Settlement Tracker</h3>
           
           <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px' }}>
             <span>PROJECT & REQUESTER</span>
             <span>ADVANCE DATE</span>
             <span>AMOUNT</span>
             <span>AGING</span>
             <span style={{ textAlign: 'right' }}>STATUS</span>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column' }}>
             {(initialData.expenseDocuments || [])
               .filter(d => d.documentType === "CASH_ADVANCE" && d.status !== "settled")
               .map(d => {
                 const days = Math.floor((new Date().getTime() - new Date(d.issueDate).getTime()) / (1000 * 60 * 60 * 24));
                 return (
                   <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '20px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                     <div>
                       <div style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>{d.projectName}</div>
                       <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>Requester: {d.vendorName}</div>
                     </div>
                     <div style={{ fontSize: '13px', color: '#e4e4e7' }}>{formatDateFullID(d.issueDate)}</div>
                     <div style={{ fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>{formatCurrencyIDR(d.amount)}</div>
                     <div style={{ fontSize: '13px', color: days > 7 ? '#ef4444' : '#a1a1aa', fontWeight: days > 7 ? 700 : 400 }}>{days} hari</div>
                     <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF9F27', background: 'rgba(239,159,39,0.1)', padding: '4px 10px', borderRadius: '6px' }}>Outstanding</span>
                     </div>
                   </div>
                 );
               })
             }
           </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div style={{ background: '#1f1f23', borderRadius: '20px', border: '0.5px solid rgba(255,255,255,0.06)', padding: '32px', animation: 'fadeIn 0.3s ease-out' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', marginBottom: '32px' }}>Multi-Project Financial Summary</h3>
           <div style={{ overflowX: 'auto' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                   <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', color: '#52525b', textTransform: 'uppercase' }}>Project Name</th>
                   <th style={{ padding: '16px', textAlign: 'right', fontSize: '11px', color: '#52525b', textTransform: 'uppercase' }}>Total Value</th>
                   <th style={{ padding: '16px', textAlign: 'right', fontSize: '11px', color: '#52525b', textTransform: 'uppercase' }}>Realization</th>
                   <th style={{ padding: '16px', textAlign: 'right', fontSize: '11px', color: '#52525b', textTransform: 'uppercase' }}>%</th>
                   <th style={{ padding: '16px', textAlign: 'right', fontSize: '11px', color: '#52525b', textTransform: 'uppercase' }}>Outstanding</th>
                 </tr>
               </thead>
               <tbody>
                 {activeProjects.map(p => {
                    const docs = (initialData.expenseDocuments || []).filter(d => d.projectId === p.id);
                    const rfps = (initialData.rfps || []).filter(r => r.projectId === p.id);
                    
                    const realization = docs.reduce((s, d) => s + (d.amount || 0), 0);
                    const paid = rfps.filter(r => r.status === "paid" || r.status === "settled").reduce((s, r) => s + (r.totalAmount || 0), 0);
                    const outstanding = realization - paid;
                    const budget = p.projectValue || 0;
                    const percent = budget > 0 ? Math.round((realization / budget) * 100) : 0;
                    
                    return (
                      <tr key={p.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>{p.projectName}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: '#a1a1aa' }}>{formatCurrencyIDR(budget)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: '#e4e4e7' }}>{formatCurrencyIDR(realization)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: '#EF9F27', fontWeight: 700 }}>{percent}%</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: outstanding > 0 ? '#EF9F27' : '#5DCAA5' }}>{formatCurrencyIDR(outstanding)}</td>
                      </tr>
                    );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        @media (max-width: 1024px) {
          .finance-header-actions {
             top: 12px !important;
          }
          .finance-nav-tabs {
            padding: 4px !important;
          }
          .finance-stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .finance-project-grid {
            grid-template-columns: 1fr !important;
          }
          .pipeline-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          .finance-table-header {
             grid-template-columns: 1fr 100px 100px !important;
          }
          .finance-table-header span:nth-child(2),
          .finance-table-header span:nth-child(3) {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .finance-stat-grid {
            grid-template-columns: 1fr !important;
          }
          .pipeline-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </WorkspaceShell>
  );
}

function StatCard({ label, value, trend, trendType, icon, color }: any) {
  return (
    <div style={{ background: '#1f1f23', borderRadius: '16px', border: '0.5px solid rgba(255,255,255,0.06)', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 500 }}>{label}</span>
        <div style={{ color: color || '#71717a' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: '#f4f4f5', marginBottom: '16px' }}>{value}</div>
      <div style={{ 
        display: 'inline-flex', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
        background: trendType === 'up' ? 'rgba(93,202,165,0.08)' : 'rgba(240,149,149,0.08)',
        color: trendType === 'up' ? '#5DCAA5' : '#F09595'
      }}>
        {trend}
      </div>
    </div>
  );
}

function ProjectDetailRow({ label, value, meta, icon, valueColor }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)', display: 'grid', placeItems: 'center', color: '#71717a' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>{label}</div>
          <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>{meta}</div>
        </div>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: valueColor || '#a1a1aa', background: valueColor ? `${valueColor}10` : 'transparent', padding: valueColor ? '4px 10px' : 0, borderRadius: '6px' }}>{value}</div>
    </div>
  );
}

function PipelineCard({ label, count, color, active }: any) {
  return (
    <div style={{ 
      background: '#111113', padding: '16px', borderRadius: '12px', border: active ? `1px solid ${color}` : '0.5px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1,
      boxShadow: active ? `0 0 20px ${color}15` : 'none',
      borderBottom: active ? `4px solid ${color}` : '0.5px solid rgba(255,255,255,0.06)'
    }}>
      <div style={{ fontSize: '24px', fontWeight: 800, color: active ? color : '#e4e4e7' }}>{count}</div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}

function TimelineItem({ label, date, status, statusType, active }: any) {
  const colors: any = {
    success: { bg: 'rgba(93,202,165,0.1)', text: '#5DCAA5' },
    warning: { bg: 'rgba(239,159,39,0.1)', text: '#EF9F27' },
    muted: { bg: 'rgba(255,255,255,0.05)', text: '#71717a' }
  };
  
  return (
    <div style={{ marginBottom: '32px', position: 'relative' }}>
      <div style={{ 
        position: 'absolute', left: '-32px', top: '2px', width: '16px', height: '16px', borderRadius: '50%', 
        background: active ? '#EF9F27' : (statusType === 'success' ? '#5DCAA5' : '#3f3f46'),
        border: '4px solid #1f1f23', zIndex: 2
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>{label}</div>
          <div style={{ fontSize: '12px', color: '#52525b', marginTop: '4px' }}>{date}</div>
        </div>
        <div style={{ 
          padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
          background: colors[statusType].bg, color: colors[statusType].text, textTransform: 'uppercase'
        }}>
          {status}
        </div>
      </div>
    </div>
  );
}
