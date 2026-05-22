// src/lib/project/defaultTasks.ts
// Template tugas default JUARA, diturunkan dari "Flow - Working System" (SOP).
// Stage values WAJIB cocok dengan union WorkflowStage di types.ts:
//   "lead" | "pitching" | "negotiation" | "execution" | "reporting" | "finance"
//
// Mapping dari label SOP ke WorkflowStage key:
//   "Brief"              → "lead"
//   "Pitching"           → "pitching"
//   "Negotiation"        → "negotiation"
//   "Execution"          → "execution"
//   "Reporting"          → "reporting"
//   "Finance / Billing"  → "finance"

import type { ProjectTask, WorkflowStage, TaskPriority } from "./types";

interface TaskTemplate {
  key: string;
  stage: WorkflowStage;
  title: string;
  required: boolean;
  priority?: TaskPriority;
  docLink?: string;
  tags?: string[];
  subtasks?: string[];
}

export const DEFAULT_TASK_TEMPLATE: TaskTemplate[] = [
  // ---- PHASE SALES (lead) ----
  { key: "document-a", stage: "lead", title: "Document A", required: true, priority: "high",
    docLink: "(FORMAT) Document A.xlsx",
    subtasks: ["Kumpulkan info dari Project Brief", "Lengkapi & rangkum Document A", "Lapor C-Level untuk cek kelengkapan"] },
  { key: "brainstorm-meeting", stage: "lead", title: "Brainstorm Meeting", required: true, priority: "medium",
    subtasks: ["Review Document A", "Project Risk Analysis"] },
  { key: "po-external", stage: "lead", title: "PO External Support", required: false, priority: "low",
    docLink: "PO.xlsx", tags: ["External"] },

  { key: "survey-lokasi", stage: "pitching", title: "Survey Lokasi & Report Survey", required: false, priority: "low",
    docLink: "(FORMAT) Survey — Nama Venue", tags: ["Survey"] },
  { key: "proposal-p", stage: "pitching", title: "Proposal (P)", required: true, priority: "high",
    docLink: "(FORMAT) Proposal (P)", tags: ["Creative"],
    subtasks: ["Draft outline Doc P", "Creative Asset List", "Beautify (Key Visual)", "Review bersama C-Level"] },
  { key: "quotation-q", stage: "pitching", title: "Quotation (Q)", required: true, priority: "high",
    docLink: "Checklist C.1 + Quotation", tags: ["Finance"],
    subtasks: ["Checklist kebutuhan (C.1)", "Cost Estimation", "Tambah margin + PPN + PPH", "Link ke Project Tracker"] },

  { key: "review-pq", stage: "negotiation", title: "Review Proposal & Quotation", required: true, priority: "medium",
    subtasks: ["Review bersama C-Level", "Cek Doc final", "Submit ke klien"] },
  { key: "dealing", stage: "negotiation", title: "Dealing Project — PO/SPK/Kontrak", required: true, priority: "urgent",
    docLink: "PO / SPK / Kontrak (dari klien)", tags: ["Kontrak"] },

  // ---- PHASE PROJECT (execution) ----
  { key: "ce-ac-top", stage: "execution", title: "CE & AC + TOP Vendor", required: true, priority: "high",
    docLink: "(FORMAT) CE & AC", tags: ["Vendor", "Budget"],
    subtasks: ["Isi Actual Cost", "Set Term of Payment Vendor", "Approval CE&AC — C-Level"] },
  { key: "po-vendor", stage: "execution", title: "PO Vendor", required: true, priority: "high",
    docLink: "PO to Vendor.xlsx", tags: ["Vendor"],
    subtasks: ["Buat PO Vendor", "Approval PO — C-Level", "Kirim PO ke Vendor"] },
  { key: "dp-vendor-rfp", stage: "execution", title: "Pengajuan DP Vendor & RFP", required: true, priority: "high",
    docLink: "JBBS - Request For Payment (RFP).pdf", tags: ["Vendor", "RFP"],
    subtasks: ["Request For Payment + Report PO", "Cek Doc — Finance", "Approval RFP — C-Level", "Payment"] },
  { key: "manual-book", stage: "execution", title: "Manual Book", required: true, priority: "medium",
    docLink: "Manual Book", subtasks: ["Susun Manual Book", "Approval Manual Book — C-Level"] },
  { key: "team-briefing", stage: "execution", title: "Team Briefing", required: true, priority: "medium" },
  { key: "production-setup", stage: "execution", title: "Event Production & Set-Up", required: true, priority: "high",
    tags: ["Show Day"], subtasks: ["Vendor coordinator & venue loading", "Rehearsal", "Final check concept & production"] },
  { key: "event-day-run", stage: "execution", title: "Event Day Run", required: true, priority: "urgent", tags: ["Show Day"] },
  { key: "doc-monitoring", stage: "execution", title: "Document Monitoring & Controlling", required: true, priority: "medium",
    docLink: "FORMAT Doc Monitoring", subtasks: ["Document Absensi", "Serah Terima Barang", "Medical Report (jika ada)"] },

  { key: "penyelesaian-advance", stage: "reporting", title: "Penyelesaian Advance", required: true, priority: "high",
    docLink: "EXI - Penyelesaian Advance.xlsx", tags: ["RFP", "Advance"],
    subtasks: ["Form Penyelesaian Advance + Nota", "Cek Doc — Finance", "Approval RFP — C-Level", "Payment / Transfer Request"] },
  { key: "report-doc", stage: "reporting", title: "Report & Documentation", required: true, priority: "medium",
    docLink: "(FORMAT) Report — Nama Event", tags: ["Report"],
    subtasks: ["Kumpulkan dokumentasi foto/video", "Susun narasi report", "Approval Report — C-Level"] },

  { key: "request-invoice", stage: "finance", title: "Request Invoice & Invoicing ke Klien", required: true, priority: "urgent",
    docLink: "BAST + Invoice Pajak + Kuitansi", tags: ["Pelunasan", "Pajak"],
    subtasks: ["Siapkan BAST + Faktur Pajak", "Buat Invoice & Kuitansi", "Approval Invoicing — C-Level", "Kirim ke klien"] },
  { key: "payment-pelunasan", stage: "finance", title: "Payment Pelunasan + Bukti Bayar", required: true, priority: "urgent", tags: ["Pelunasan"] },
  { key: "pnl-project", stage: "finance", title: "Document P&L Project", required: true, priority: "medium",
    docLink: "Format Jurnal PnL.xlsx", tags: ["Finance"] },
  { key: "final-report", stage: "finance", title: "Final Project Report (Internal)", required: true, priority: "low",
    subtasks: ["Kumpulkan P&L + bukti payment", "Review bersama C-Level", "Tutup buku"] },
];

let _seq = 0;
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(_seq++).toString(36)}`;

/** Generate fresh task list (status pending, no assignees) for a new project. */
export function seedTasksForProject(): ProjectTask[] {
  return DEFAULT_TASK_TEMPLATE.map((t) => {
    const base = uid(t.key);
    return {
      id: base,
      title: t.title,
      stage: t.stage,
      status: "pending",
      required: t.required,
      priority: t.priority ?? "medium",
      assignees: [],
      tags: t.tags ?? [],
      docLink: t.docLink,
      dueDate: undefined,
      description: undefined,
      subtasks: (t.subtasks ?? []).map((title, i) => ({
        id: `${base}-s${i}`,
        title,
        done: false,
      })),
      comments: [],
    } as ProjectTask;
  });
}
