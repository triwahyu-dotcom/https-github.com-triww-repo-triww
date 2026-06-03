"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectRecord, ProjectTask } from "@/lib/project/types";
import { TeamMember } from "@/lib/project/monitoring";
import MonitoringDashboard from "./MonitoringDashboard";
import PersonalDashboard from "./PersonalDashboard";

interface WorkspaceHubClientProps {
  projects: ProjectRecord[];
  teamMembers: TeamMember[];
}

// ─── WhatsApp Recap Logic ────────────────────────────────────────────────────

interface TaskWithContext extends ProjectTask {
  projectName: string;
  projectId: string;
}

const PRIORITY_EMOJI: Record<string, string> = {
  urgent: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

const STATUS_EMOJI: Record<string, string> = {
  in_progress: "🔄",
  todo: "⬜",
  pending: "⬜",
  done: "✅",
};

function normalizeName(name: string): string {
  if (!name) return "";
  const n = name.trim();
  if (n.toLowerCase() === "ubaidullah" || n.toLowerCase() === "ubaid") return "Ubaid";
  return n;
}

function formatDueDate(dueDate?: string): string {
  if (!dueDate || dueDate === "-" || dueDate === "TBD") return "TBD";
  try {
    const d = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    if (diff < 0) return `⚠️ ${formatted} (Terlambat!)`;
    if (diff === 0) return `🔥 Hari ini!`;
    if (diff === 1) return `${formatted} (Besok)`;
    return formatted;
  } catch {
    return dueDate;
  }
}

function generateWhatsAppText(projects: ProjectRecord[]): string {
  // Collect all tasks (active = todo/in_progress, done = done)
  const activeTasks: TaskWithContext[] = [];
  const doneTasks: TaskWithContext[] = [];

  for (const proj of projects) {
    if (!proj.tasks || proj.tasks.length === 0) continue;
    for (const task of proj.tasks) {
      const ctx: TaskWithContext = {
        ...task,
        projectName: proj.projectName || proj.client || "Tanpa Nama",
        projectId: proj.id,
        // normalise legacy single-assignee
        assignees: task.assignees && task.assignees.length > 0
          ? task.assignees
          : task.assignee
          ? [task.assignee]
          : [],
      };
      const st = task.status ?? "pending";
      if (st === "done") {
        doneTasks.push(ctx);
      } else {
        activeTasks.push(ctx);
      }
    }
  }

  // Group active tasks by assignee
  const byPerson: Record<string, TaskWithContext[]> = {};
  const unassigned: TaskWithContext[] = [];

  for (const task of activeTasks) {
    const assignees = (task.assignees ?? []).map(normalizeName).filter(Boolean);
    if (assignees.length === 0) {
      unassigned.push(task);
    } else {
      for (const name of assignees) {
        if (!byPerson[name]) byPerson[name] = [];
        byPerson[name].push(task);
      }
    }
  }

  // Group done tasks by assignee
  const doneByPerson: Record<string, TaskWithContext[]> = {};
  for (const task of doneTasks) {
    const assignees = (task.assignees ?? []).map(normalizeName).filter(Boolean);
    if (assignees.length === 0) continue;
    for (const name of assignees) {
      if (!doneByPerson[name]) doneByPerson[name] = [];
      doneByPerson[name].push(task);
    }
  }

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const lines: string[] = [];

  lines.push(`🟡 *REKAP KOORDINASI TUGAS — JUARA EVENT SERVICES* 🟡`);
  lines.push(`_📅 ${today}_`);
  lines.push(``);
  lines.push(`Halo Tim! Berikut rekap tugas aktif yang perlu difokuskan:`);
  lines.push(``);

  // ── Per-person active tasks ──
  const sortedNames = Object.keys(byPerson).sort();

  if (sortedNames.length === 0 && unassigned.length === 0) {
    lines.push(`✅ Tidak ada tugas aktif saat ini. Semua beres!`);
  } else {
    for (const name of sortedNames) {
      lines.push(`------------------------------------------`);
      lines.push(`👤 *${name.toUpperCase()}*`);

      // Group tasks by project for this person
      const byProject: Record<string, TaskWithContext[]> = {};
      for (const t of byPerson[name]) {
        const pn = t.projectName;
        if (!byProject[pn]) byProject[pn] = [];
        byProject[pn].push(t);
      }

      for (const [projName, tasks] of Object.entries(byProject)) {
        lines.push(`  *• [${projName}]*`);
        for (const t of tasks) {
          const prio = PRIORITY_EMOJI[t.priority ?? ""] ?? "⚪";
          const stat = STATUS_EMOJI[t.status ?? "pending"] ?? "⬜";
          const due = formatDueDate(t.dueDate);
          lines.push(`    ${stat} ${prio} _${t.title}_ | 📅 ${due}`);
        }
      }
      lines.push(``);
    }

    // ── Unassigned tasks ──
    if (unassigned.length > 0) {
      lines.push(`------------------------------------------`);
      lines.push(`❗ *BELUM ADA PENUGASAN (UNASSIGNED)*`);
      const byProject: Record<string, TaskWithContext[]> = {};
      for (const t of unassigned) {
        if (!byProject[t.projectName]) byProject[t.projectName] = [];
        byProject[t.projectName].push(t);
      }
      for (const [projName, tasks] of Object.entries(byProject)) {
        lines.push(`  *• [${projName}]*`);
        for (const t of tasks) {
          const prio = PRIORITY_EMOJI[t.priority ?? ""] ?? "⚪";
          const due = formatDueDate(t.dueDate);
          lines.push(`    ⬜ ${prio} _${t.title}_ | 📅 ${due}`);
        }
      }
      lines.push(``);
    }
  }

  // ── Done tasks / achievements ──
  const doneNames = Object.keys(doneByPerson).sort();
  if (doneNames.length > 0) {
    lines.push(`------------------------------------------`);
    lines.push(`✅ *PENCAPAIAN TIM (SUDAH SELESAI)* 🎉`);
    for (const name of doneNames) {
      for (const t of doneByPerson[name]) {
        lines.push(`  👏 *${name}*: _${t.title}_ (${t.projectName})`);
      }
    }
    lines.push(``);
  }

  lines.push(`------------------------------------------`);
  lines.push(`_Semangat koordinasi! Update status tugas di dashboard jika ada perkembangan._ 💪`);

  return lines.join("\n");
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkspaceHubClient({
  projects,
  teamMembers,
}: WorkspaceHubClientProps) {
  const router = useRouter();
  const [showRecap, setShowRecap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userRole, setUserRole] = useState<string>("member");

  React.useEffect(() => {
    const cookies = document.cookie.split(';');
    const roleCookie = cookies.find(c => c.trim().startsWith('juara_user_role='));
    if (roleCookie) {
      setUserRole(roleCookie.split('=')[1].toLowerCase().trim());
    } else {
      setUserRole((localStorage.getItem("pm-role") || "member").toLowerCase().trim());
    }
  }, []);

  const recapText = showRecap ? generateWhatsAppText(projects) : "";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(recapText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for browsers that block clipboard
      const ta = document.createElement("textarea");
      ta.value = recapText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [recapText]);

  const handleOpenProject = (projectId: string) => {
    router.push(`/projects?projectId=${projectId}&tab=tasks`);
  };

  return (
    <main className="hub-shell" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <section className="hub-hero">
        <p className="hub-kicker">JUARA Workspace</p>
        <h1>Projects and vendors in one workspace</h1>
        <p>
          Manage event pipeline, vendor onboarding, and vendor assignment from one app. Choose the
          module you want to open.
        </p>

        {/* WhatsApp Recap CTA */}
        <button
          id="wa-recap-btn"
          onClick={() => { setCopied(false); setShowRecap(true); }}
          style={{
            marginTop: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 22px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(37,211,102,0.3)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 28px rgba(37,211,102,0.45)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(37,211,102,0.3)";
          }}
        >
          <span style={{ fontSize: 20 }}>📋</span>
          Generate Rekap WhatsApp
        </button>
      </section>

      {/* Personal Dashboard Section */}
      <section>
        <PersonalDashboard projects={projects} />
      </section>

      {/* Monitoring Dashboard Section */}
      <section>
        <MonitoringDashboard
          projects={projects}
          teamMembers={teamMembers}
          onOpenProject={handleOpenProject}
        />
      </section>

      {/* Workspace Modules Section */}
      <section>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".14em",
            color: "var(--muted)",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Workspace Modules
        </h2>
        <div className="hub-grid">
          <Link className="hub-card" href="/crm">
            <span style={{ color: "var(--blue)" }}>Customers</span>
            <strong>CRM Dashboard</strong>
            <p>Manage client relationships, portfolio value, and key contacts.</p>
          </Link>
          <Link className="hub-card" href="/projects">
            <span style={{ color: "var(--green)" }}>Projects</span>
            <strong>Project Tracker</strong>
            <p>Track event pipelines, document centralization, and stages.</p>
          </Link>
          <Link className="hub-card" href="/vendors">
            <span style={{ color: "var(--slate)" }}>Procurement</span>
            <strong>Vendor Database</strong>
            <p>Review vendor submissions, social links, and assignment history.</p>
          </Link>
          <Link className="hub-card" href="/finance">
            <span style={{ color: "var(--amber)" }}>Finance</span>
            <strong>Finance Operations</strong>
            <p>Generate POs with custom numbering, track payments, and reporting.</p>
          </Link>
          <Link className="hub-card" href="/manpower/freelancer">
            <span style={{ color: "#A78BFA" }}>Talent</span>
            <strong>Man Power</strong>
            <p>Database of 90+ verified freelancers, technicians, and crew members.</p>
          </Link>
          <Link className="hub-card" href="/docs">
            <span style={{ color: "var(--blue)" }}>AI Tools</span>
            <strong>Document Center</strong>
            <p>Extract data from Budget (Excel), Invoices, and RFP automatically.</p>
          </Link>
          {(userRole === "admin" || userRole === "director") && (
            <Link 
              className="hub-card" 
              href="/settings" 
              style={{ 
                border: "1px solid rgba(55, 138, 221, 0.25)", 
                background: "rgba(55, 138, 221, 0.03)",
                boxShadow: "0 4px 20px rgba(55, 138, 221, 0.05)"
              }}
            >
              <span style={{ color: "#378ADD" }}>Admin Only</span>
              <strong>System Settings</strong>
              <p>Manage team members, plain-text passwords, and custom permissions matrix.</p>
            </Link>
          )}
          <Link className="hub-card" href="/vendor/register">
            <span>Portal</span>
            <strong>Vendor Self Registration</strong>
            <p>Public intake form for vendors to submit profiles independently.</p>
          </Link>
          <Link className="hub-card" href="/vendor/status">
            <span>Status</span>
            <strong>Vendor Submission Status</strong>
            <p>Check registration progress and review missing documents.</p>
          </Link>
        </div>
      </section>

      {/* ── WhatsApp Recap Modal ─────────────────────────────── */}
      {showRecap && (
        <div
          id="wa-recap-modal-overlay"
          onClick={() => setShowRecap(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(6px)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            id="wa-recap-modal"
            onClick={e => e.stopPropagation()}
            style={{
              background: "#111113",
              border: "0.5px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "0.5px solid rgba(255,255,255,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>📋</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>
                    Rekap Koordinasi Tugas
                  </div>
                  <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>
                    Salin dan kirim ke grup WhatsApp tim Anda
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowRecap(false)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#a1a1aa",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Recap Text Area */}
            <div style={{ padding: "16px 24px", flex: 1, overflow: "auto" }}>
              <textarea
                id="wa-recap-textarea"
                readOnly
                value={recapText}
                style={{
                  width: "100%",
                  height: 380,
                  background: "#0a0a0b",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  color: "#d4d4d8",
                  fontFamily: "monospace",
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  padding: 16,
                  resize: "none",
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 11, color: "#52525b", marginTop: 8 }}>
                💡 Teks di atas sudah diformat dengan markdown WhatsApp (*tebal*, _miring_, emoji). Salin dan paste langsung ke chat.
              </p>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "0.5px solid rgba(255,255,255,0.07)",
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setShowRecap(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  color: "#a1a1aa",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Tutup
              </button>
              <button
                id="wa-copy-btn"
                onClick={handleCopy}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: copied
                    ? "linear-gradient(135deg,#22c55e,#16a34a)"
                    : "linear-gradient(135deg,#25D366,#128C7E)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background 0.3s",
                  boxShadow: copied
                    ? "0 4px 16px rgba(34,197,94,0.4)"
                    : "0 4px 16px rgba(37,211,102,0.3)",
                }}
              >
                {copied ? (
                  <>✅ Tersalin!</>
                ) : (
                  <><span style={{ fontSize: 16 }}>📲</span> Salin untuk WhatsApp</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
