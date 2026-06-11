"use client";

import React, { useState, useMemo, Fragment } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Activity,
  CheckCircle2,
  Clock,
  Search,
  Flag,
  ArrowUpRight
} from "lucide-react";
import { ProjectRecord, WorkflowStage } from "@/lib/project/types";
import {
  summarizeProject,
  summarizePortfolio,
  TeamMember
} from "@/lib/project/monitoring";

const STAGE_LABELS: Record<string, string> = {
  all: "Semua stage",
  lead: "Lead / Prospect",
  pitching: "Pitching / Prep",
  negotiation: "Negotiation",
  execution: "Execution",
  reporting: "Reporting",
  finance: "Finance / Billing",
  completed: "Completed",
  lost: "Lost",
  cancelled: "Cancelled",
};

const HEALTH_META = {
  complete: { label: "Selesai", color: "var(--green)", icon: CheckCircle2 },
  track: { label: "On track", color: "var(--green)", icon: CheckCircle2 },
  watch: { label: "Perlu dipantau", color: "var(--amber)", icon: Clock },
  overdue: { label: "Ada overdue", color: "var(--red)", icon: AlertTriangle },
  empty: { label: "Belum ada tugas", color: "var(--muted-soft)", icon: Clock },
};

export interface MonitoringDashboardProps {
  projects: ProjectRecord[];
  teamMembers: TeamMember[];
  onOpenProject: (projectId: string) => void;
}

const alpha = (colorVar: string, pct: number) => {
  if (colorVar.startsWith("var(")) {
    return `color-mix(in srgb, ${colorVar} ${pct}%, transparent)`;
  }
  return colorVar + Math.round((pct / 100) * 255).toString(16).padStart(2, "0");
};

const avatarColor = (name: string) => {
  const palette = ["#4C8DFF", "#A78BFA", "#34D399", "#F5A524", "#F472B6", "#2DD4BF", "#F2555A"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

function AvatarBubble({ name, size = 22 }: { name: string; size?: number }) {
  const col = avatarColor(name);
  return (
    <div title={name} style={{
      width: size, height: size, borderRadius: "50%",
      background: alpha(col, 14), border: `1px solid ${alpha(col, 33)}`,
      color: col, fontSize: size * 0.38, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      textTransform: "uppercase", flexShrink: 0,
    }}>
      {name.slice(0, 2)}
    </div>
  );
}

function AvatarStack({ names, size = 22, ring = "var(--panel-soft)" }: { names: string[]; size?: number; ring?: string }) {
  const list = names || [];
  if (list.length === 0) return null;
  const shown = list.slice(0, 3), extra = list.length - shown.length;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((name, i) => (
        <div key={name} style={{ marginLeft: i ? -7 : 0, borderRadius: "50%", boxShadow: `0 0 0 2px ${ring}` }}>
          <AvatarBubble name={name} size={size}/>
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          marginLeft: -7, width: size, height: size, borderRadius: "50%",
          background: "var(--panel)", border: "1px solid var(--line-strong)",
          boxShadow: `0 0 0 2px ${ring}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.34, color: "var(--muted)", fontWeight: 700,
        }}>+{extra}</div>
      )}
    </div>
  );
}

const idr = (n: number) => "Rp " + n.toLocaleString("id-ID");

const fmtDate = (d: string) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
};

export default function MonitoringDashboard({
  projects,
  teamMembers,
  onOpenProject
}: MonitoringDashboardProps) {
  const [stageFilter, setStageFilter] = useState("execution");
  const [attnOnly, setAttnOnly] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  // Get current local date
  const now = useMemo(() => new Date(), []);
  
  // Available stages from current project stages in dataset
  const stages = useMemo(() => {
    const stagesSet = new Set(projects.map((p) => p.currentStage).filter(Boolean));
    return ["all", ...Array.from(stagesSet)];
  }, [projects]);

  // Dynamic Portfolio Calculations
  const portfolio = useMemo(() => {
    return summarizePortfolio(projects, now, teamMembers);
  }, [projects, teamMembers, now]);

  // Project List sorting and filtering
  const rows = useMemo(() => {
    let r = projects.map(p => ({
      project: p,
      summary: summarizeProject(p, now)
    }));

    if (stageFilter !== "all") {
      r = r.filter((item) => item.project.currentStage === stageFilter);
    }
    if (attnOnly) {
      r = r.filter((item) => item.summary.health === "overdue" || item.summary.health === "watch");
    }
    if (q.trim()) {
      const query = q.toLowerCase();
      r = r.filter((item) =>
        (item.project.projectName || "").toLowerCase().includes(query) ||
        (item.project.client || "").toLowerCase().includes(query)
      );
    }

    const rank: Record<string, number> = { overdue: 0, watch: 1, empty: 2, track: 3, complete: 4 };
    return r.sort((a, b) => rank[a.summary.health] - rank[b.summary.health]);
  }, [projects, stageFilter, attnOnly, q, now]);

  // Workload list
  const workloadList = useMemo(() => {
    const w = portfolio.workloadByMember;
    const list = teamMembers.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role || "Staff",
      count: w[m.name] || 0
    }));
    list.sort((a, b) => b.count - a.count);
    const max = Math.max(1, ...list.map(item => item.count));
    return { list, max };
  }, [portfolio, teamMembers]);

  // Custom styling wrapper
  const wrapStyle: React.CSSProperties = {
    background: "var(--panel)",
    border: "1px solid var(--line)",
    color: "var(--text)",
    padding: "24px 26px",
    borderRadius: "16px",
    marginBottom: "24px"
  };

  const KpiCard = ({ icon: Icon, label, value, sub, color }: any) => (
    <div style={{ background: "var(--panel-soft)", border: `1px solid var(--line)`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>
        <Icon size={15} color={color} />
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8, color: color || "var(--text)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--muted-soft)", marginTop: 6 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={wrapStyle}>
      <style dangerouslySetInnerHTML={{__html: `
        .mon-row { transition: background .15s ease, border-color .15s ease; }
        .mon-row:hover { background: var(--panel-hover) !important; border-color: var(--line-strong) !important; }
        .mon-chip { transition: all .15s ease; }
        .mon-chip:hover { color: var(--text) !important; border-color: var(--line-strong) !important; }
        .mon-btn-icon:hover { background: var(--panel-hover) !important; color: var(--text) !important; }
        .mon-exp { animation: monExp .2s ease both; }
        @keyframes monExp { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
      `}} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#A78BFA", fontWeight: 700, marginBottom: 5 }}>MONITORING</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Pantauan Proyek</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
            Per {now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <div style={{ position: "relative", width: 240, maxWidth: "100%" }}>
          <Search size={14} color="var(--muted-soft)" style={{ position: "absolute", left: 11, top: 10 }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari proyek / klien…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--panel-soft)",
              border: `1px solid var(--line)`,
              borderRadius: 9,
              padding: "8px 11px 8px 32px",
              color: "var(--text)",
              fontSize: 13,
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard icon={Activity} label="Proyek aktif" value={portfolio.activeCount} sub={`${projects.length} total proyek`} />
        <KpiCard icon={CheckCircle2} label="Rata-rata progress" value={portfolio.avgProgress + "%"} sub="proyek aktif bertugas" color="var(--blue)" />
        <KpiCard icon={AlertTriangle} label="Tugas overdue" value={portfolio.totalOverdue} sub="butuh tindakan segera" color={portfolio.totalOverdue ? "var(--red)" : "var(--green)"} />
        <KpiCard icon={Clock} label="Jatuh tempo ≤7 hari" value={portfolio.totalDueSoon} sub="jatuh tempo minggu ini" color={portfolio.totalDueSoon ? "var(--amber)" : "var(--green)"} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {stages.map((s) => {
            const active = stageFilter === s;
            const label = STAGE_LABELS[s] || s;
            return (
              <button
                key={s}
                className="mon-chip"
                onClick={() => setStageFilter(s)}
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "6px 13px",
                  borderRadius: 9,
                  cursor: "pointer",
                  border: `1px solid ${active ? "var(--blue)" : "var(--line)"}`,
                  background: active ? alpha("var(--blue)", 12) : "transparent",
                  color: active ? "var(--blue)" : "var(--muted)",
                  outline: "none"
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setAttnOnly((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12.5,
            fontWeight: 600,
            padding: "6px 13px",
            borderRadius: 9,
            cursor: "pointer",
            border: `1px solid ${attnOnly ? "var(--red)" : "var(--line)"}`,
            background: attnOnly ? alpha("var(--red)", 10) : "transparent",
            color: attnOnly ? "var(--red)" : "var(--muted)",
            outline: "none"
          }}
        >
          <AlertTriangle size={14} />
          Perlu perhatian
        </button>
      </div>

      {/* Project List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {rows.map(({ project, summary }) => {
          const meta = HEALTH_META[summary.health];
          const isOpen = open === project.id;
          const hasAttention = summary.attention.length > 0;
          return (
            <Fragment key={project.id}>
              <div
                className="mon-row"
                onClick={() => hasAttention && setOpen(isOpen ? null : project.id)}
                style={{
                  background: "var(--panel-soft)",
                  border: `1px solid ${isOpen ? "var(--line-strong)" : "var(--line)"}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  cursor: hasAttention ? "pointer" : "default"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {project.projectName}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, marginLeft: 18, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{project.client}</span>
                      <span style={{ color: "var(--line-strong)" }}>·</span>
                      <span style={{ color: "var(--muted-soft)" }}>{STAGE_LABELS[project.currentStage] || project.currentStage}</span>
                      <span style={{ color: "var(--line-strong)" }}>·</span>
                      <span>{idr(project.projectValue || 0)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ flex: "1 1 180px", minWidth: 150 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)", marginBottom: 5 }}>
                      <span>{summary.total === 0 ? "Belum ada tugas" : `${summary.done}/${summary.total} tugas`}</span>
                      <span style={{ fontWeight: 700, color: "var(--text)" }}>{summary.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: summary.pct + "%", height: "100%", background: summary.pct === 100 ? "var(--green)" : "var(--blue)", transition: "width .4s ease" }} />
                    </div>
                  </div>

                  {/* Badges for Overdue / Due Soon */}
                  <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                    {summary.overdue > 0 && (
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, color: "var(--red)",
                        background: alpha("var(--red)", 10), border: `1px solid ${alpha("var(--red)", 25)}`,
                        borderRadius: 7, padding: "3px 9px", display: "inline-flex", alignItems: "center", gap: 4
                      }}>
                        <AlertTriangle size={11} />{summary.overdue} overdue
                      </span>
                    )}
                    {summary.dueSoon > 0 && (
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, color: "var(--amber)",
                        background: alpha("var(--amber)", 10), border: `1px solid ${alpha("var(--amber)", 25)}`,
                        borderRadius: 7, padding: "3px 9px", display: "inline-flex", alignItems: "center", gap: 4
                      }}>
                        <Clock size={11} />{summary.dueSoon} ≤7h
                      </span>
                    )}
                  </div>

                  {/* Avatar stack of PICs */}
                  <div style={{ display: "flex", flexShrink: 0 }}>
                    <AvatarStack names={summary.pics} />
                  </div>

                  {/* Health status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: meta.color, minWidth: 110, justifyContent: "flex-end" }}>
                    <meta.icon size={14} />
                    {meta.label}
                  </div>

                  {/* Drill-down & Chevron */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button
                      title="Buka detail tugas"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProject(project.id);
                      }}
                      className="mon-btn-icon"
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 6,
                        borderRadius: 6,
                        color: "var(--muted-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        outline: "none"
                      }}
                    >
                      <ArrowUpRight size={15} />
                    </button>
                    {hasAttention && (
                      <ChevronDown
                        size={15}
                        color="var(--muted-soft)"
                        style={{
                          transform: isOpen ? "none" : "rotate(-90deg)",
                          transition: "transform .2s ease"
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Row Expansion */}
              {isOpen && (
                <div className="mon-exp" style={{ background: "var(--panel)", border: `1px solid var(--line)`, borderRadius: 11, margin: "-2px 0 2px", padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted-soft)", fontWeight: 700, marginBottom: 9 }}>
                    Tugas yang perlu perhatian
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {summary.attention.map((a, i) => {
                      const od = a.state === "overdue";
                      const col = od ? "var(--red)" : "var(--amber)";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
                            <Flag size={11} color={col} />
                            {a.title}
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: col, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {od ? <AlertTriangle size={11} /> : <Calendar size={11} />}
                            {fmtDate(a.due)}
                            {od ? " · lewat" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
        {rows.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--muted-soft)", textAlign: "center", padding: "24px 0", background: "var(--panel-soft)", borderRadius: 12 }}>
            Tidak ada proyek yang cocok.
          </div>
        )}
      </div>

      {/* Analytics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginTop: 22 }}>
        {/* Team Workload */}
        <div style={{ background: "var(--panel-soft)", border: `1px solid var(--line)`, borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            Beban kerja tim <span style={{ color: "var(--muted-soft)", fontWeight: 400 }}>· tugas terbuka</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {workloadList.list.map((m) => {
              const barWidth = Math.round((m.count / workloadList.max) * 100);
              const mCol = avatarColor(m.name);
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <AvatarBubble name={m.name} size={26} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>
                        {m.name} <span style={{ color: "var(--muted-soft)", fontWeight: 400, fontSize: 10.5 }}>{m.role}</span>
                      </span>
                      <span style={{ color: "var(--muted)" }}>{m.count}</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: barWidth + "%", height: "100%", background: mCol, transition: "width .4s ease" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Status Distribution */}
        <div style={{ background: "var(--panel-soft)", border: `1px solid var(--line)`, borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            Distribusi status tugas <span style={{ color: "var(--muted-soft)", fontWeight: 400 }}>· semua proyek</span>
          </div>
          <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ width: (portfolio.statusDistribution.todo / portfolio.statusDistribution.total * 100) + "%", background: "var(--muted-soft)" }} title="To do" />
            <div style={{ width: (portfolio.statusDistribution.inProgress / portfolio.statusDistribution.total * 100) + "%", background: "var(--amber)" }} title="In progress" />
            <div style={{ width: (portfolio.statusDistribution.done / portfolio.statusDistribution.total * 100) + "%", background: "var(--green)" }} title="Done" />
          </div>
          {[
            ["To do", portfolio.statusDistribution.todo, "var(--muted-soft)"],
            ["In progress", portfolio.statusDistribution.inProgress, "var(--amber)"],
            ["Done", portfolio.statusDistribution.done, "var(--green)"]
          ].map(([label, value, color]) => {
            const count = Number(value);
            const pct = Math.round(count / portfolio.statusDistribution.total * 100);
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
                  {label}
                </span>
                <span style={{ fontWeight: 700 }}>
                  {count} <span style={{ color: "var(--muted-soft)", fontWeight: 400 }}>({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
