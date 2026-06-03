"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProjectRecord, ProjectTask, TaskPriority, TaskDetailedStatus } from "@/lib/project/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MyTask {
  task: ProjectTask;
  projectId: string;
  projectName: string;
  client: string;
}

interface MyProject {
  project: ProjectRecord;
  myTaskCount: number;
  myDoneCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  if (!s) return "";
  return s.trim().toLowerCase();
}

function getUserName(): string {
  if (typeof document === "undefined") return "";
  const c = document.cookie.split(";").find((x) => x.trim().startsWith("juara_user_name="));
  return c ? decodeURIComponent(c.split("=")[1]).trim() : "";
}

function getUserEmail(): string {
  if (typeof document === "undefined") return "";
  const c = document.cookie.split(";").find((x) => x.trim().startsWith("juara_user_email="));
  return c ? decodeURIComponent(c.split("=")[1]).trim() : "";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Selamat pagi";
  if (h < 17) return "Selamat siang";
  if (h < 20) return "Selamat sore";
  return "Selamat malam";
}

function parseDueDate(d?: string): Date | null {
  if (!d || d === "-" || d === "TBD") return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function dueDateLabel(dueDate?: string): { label: string; color: string } {
  const d = parseDueDate(dueDate);
  if (!d) return { label: "No deadline", color: "#52525b" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  const formatted = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  if (diff < 0) return { label: `${formatted} — Overdue`, color: "#f87171" };
  if (diff === 0) return { label: "Hari ini", color: "#fbbf24" };
  if (diff === 1) return { label: "Besok", color: "#fb923c" };
  if (diff <= 7) return { label: `${formatted} (${diff}d)`, color: "#a3e635" };
  return { label: formatted, color: "#71717a" };
}

const PRIORITY_CONFIG: Record<TaskPriority | string, { dot: string; label: string }> = {
  urgent: { dot: "#ef4444", label: "Urgent" },
  high:   { dot: "#f97316", label: "High" },
  medium: { dot: "#eab308", label: "Medium" },
  low:    { dot: "#22c55e", label: "Low" },
};

const STATUS_CONFIG: Record<TaskDetailedStatus | string, { label: string; bg: string; color: string }> = {
  done:        { label: "Done",        bg: "rgba(34,197,94,0.12)",  color: "#4ade80" },
  in_progress: { label: "In Progress", bg: "rgba(96,165,250,0.12)", color: "#60a5fa" },
  pending:     { label: "To Do",       bg: "rgba(161,161,170,0.1)", color: "#a1a1aa" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PersonalDashboard({ projects }: { projects: ProjectRecord[] }) {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [, setUserEmail] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "done">("all");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setUserName(getUserName());
    setUserEmail(getUserEmail());
  }, []);

  // ── Derive data ──────────────────────────────────────────────────────────
  const { myTasks, myProjects, stats } = useMemo(() => {
    if (!userName) return { myTasks: [], myProjects: [], stats: { total: 0, overdue: 0, dueWeek: 0, projects: 0, done: 0 } };

    const me = normalizeName(userName);
    const myTasks: MyTask[] = [];
    const projectMap: Map<string, MyProject> = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekLater = new Date(today.getTime() + 7 * 86400000);

    for (const proj of projects) {
      let myTaskCount = 0;
      let myDoneCount = 0;

      for (const task of proj.tasks ?? []) {
        const assignees = (task.assignees && task.assignees.length > 0
          ? task.assignees
          : task.assignee ? [task.assignee] : []
        ).map(normalizeName);

        if (!assignees.includes(me)) continue;

        myTasks.push({
          task,
          projectId: proj.id,
          projectName: proj.projectName || proj.client,
          client: proj.client,
        });
        myTaskCount++;
        if (task.status === "done") myDoneCount++;
      }

      if (myTaskCount > 0) {
        projectMap.set(proj.id, { project: proj, myTaskCount, myDoneCount });
      }
    }

    // Sort tasks: not done first, then by priority weight, then by due date
    const PRIO_WEIGHT: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    myTasks.sort((a, b) => {
      const aDone = a.task.status === "done" ? 1 : 0;
      const bDone = b.task.status === "done" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const pw = (PRIO_WEIGHT[b.task.priority ?? ""] ?? 0) - (PRIO_WEIGHT[a.task.priority ?? ""] ?? 0);
      if (pw !== 0) return pw;
      const ad = parseDueDate(a.task.dueDate)?.getTime() ?? Infinity;
      const bd = parseDueDate(b.task.dueDate)?.getTime() ?? Infinity;
      return ad - bd;
    });

    // Stats
    const activeTasks = myTasks.filter((t) => t.task.status !== "done");
    let overdue = 0;
    let dueWeek = 0;
    for (const { task } of activeTasks) {
      const d = parseDueDate(task.dueDate);
      if (!d) continue;
      if (d < today) overdue++;
      else if (d <= weekLater) dueWeek++;
    }

    return {
      myTasks,
      myProjects: Array.from(projectMap.values()),
      stats: {
        total: activeTasks.length,
        done: myTasks.filter((t) => t.task.status === "done").length,
        overdue,
        dueWeek,
        projects: projectMap.size,
      },
    };
  }, [userName, projects]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return myTasks;
    if (filter === "pending") return myTasks.filter((t) => t.task.status === "pending" || t.task.status === undefined);
    return myTasks.filter((t) => t.task.status === filter);
  }, [myTasks, filter]);

  if (!userName) return null;

  const firstName = userName.split(" ")[0];

  return (
    <section
      style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.04) 50%, rgba(34,211,238,0.04) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: "28px 28px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div style={{
        position: "absolute",
        top: -80, right: -80,
        width: 320, height: 320,
        background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "#fff",
            boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            flexShrink: 0,
          }}>
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
              My Workspace
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e4e4e7", margin: 0 }}>
              {getGreeting()}, {firstName}! 👋
            </h2>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "#71717a",
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s",
          }}
        >
          {collapsed ? "↓ Show" : "↑ Collapse"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Stats Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}>
            {[
              { label: "Active Tasks",    value: stats.total,    icon: "📋", color: "#6366f1", glow: "rgba(99,102,241,0.2)" },
              { label: "Overdue",         value: stats.overdue,  icon: "🚨", color: "#f87171", glow: "rgba(248,113,113,0.2)" },
              { label: "Due This Week",   value: stats.dueWeek,  icon: "📅", color: "#fbbf24", glow: "rgba(251,191,36,0.2)"  },
              { label: "Completed",       value: stats.done,     icon: "✅", color: "#4ade80", glow: "rgba(74,222,128,0.2)"  },
              { label: "My Projects",     value: stats.projects, icon: "🗂️", color: "#60a5fa", glow: "rgba(96,165,250,0.2)"  },
            ].map((s) => (
              <div key={s.label} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
                transition: "transform 0.15s, box-shadow 0.15s",
                cursor: "default",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${s.glow}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: "#52525b", marginTop: 3, fontWeight: 500 }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tasks Section */}
          {myTasks.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "32px 16px",
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: 14,
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <p style={{ color: "#52525b", fontSize: 14 }}>Tidak ada task yang ditugaskan ke kamu.</p>
            </div>
          ) : (
            <>
              {/* Filter Tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#52525b", alignSelf: "center", marginRight: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  My Tasks
                </p>
                {(["all", "pending", "in_progress", "done"] as const).map((f) => {
                  const labels: Record<string, string> = { all: "All", pending: "To Do", in_progress: "In Progress", done: "Done" };
                  const active = filter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        border: active ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.07)",
                        background: active ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.03)",
                        color: active ? "#a5b4fc" : "#71717a",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>

              {/* Task List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredTasks.slice(0, 12).map(({ task, projectId, projectName }) => {
                  const due = dueDateLabel(task.dueDate);
                  const prio = PRIORITY_CONFIG[task.priority ?? ""] ?? { dot: "#3f3f46", label: "" };
                  const statusCfg = STATUS_CONFIG[task.status ?? "pending"];
                  const isDone = task.status === "done";

                  return (
                    <div
                      key={`${projectId}-${task.id}`}
                      onClick={() => router.push(`/projects?projectId=${projectId}&tab=tasks`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        background: isDone ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        cursor: "pointer",
                        opacity: isDone ? 0.55 : 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => {
                        if (!isDone) {
                          (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.08)";
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.25)";
                          (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = isDone ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                        (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                      }}
                    >
                      {/* Priority dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: prio.dot, flexShrink: 0,
                        boxShadow: `0 0 6px ${prio.dot}88`,
                      }} />

                      {/* Task info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: isDone ? "#52525b" : "#d4d4d8",
                          textDecoration: isDone ? "line-through" : "none",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#52525b", marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ color: "#3f3f46" }}>📁</span>
                          <span style={{
                            maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {projectName}
                          </span>
                          {task.tags?.slice(0, 2).map(tag => (
                            <span key={tag} style={{
                              background: "rgba(99,102,241,0.1)", color: "#818cf8",
                              padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Due date */}
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: due.color,
                        flexShrink: 0, textAlign: "right", minWidth: 80,
                      }}>
                        {due.label}
                      </div>

                      {/* Status badge */}
                      <div style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11, fontWeight: 700,
                        background: statusCfg.bg, color: statusCfg.color,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}>
                        {statusCfg.label}
                      </div>

                      {/* Arrow */}
                      {!isDone && (
                        <span style={{ color: "#3f3f46", fontSize: 14, flexShrink: 0 }}>›</span>
                      )}
                    </div>
                  );
                })}

                {filteredTasks.length > 12 && (
                  <button
                    onClick={() => router.push("/projects")}
                    style={{
                      padding: "10px",
                      background: "rgba(99,102,241,0.06)",
                      border: "1px solid rgba(99,102,241,0.2)",
                      borderRadius: 10,
                      color: "#818cf8",
                      fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    +{filteredTasks.length - 12} more tasks — View All Projects
                  </button>
                )}
              </div>

              {/* My Projects Strip */}
              {myProjects.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#52525b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                    My Projects
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {myProjects.map(({ project, myTaskCount, myDoneCount }) => {
                      const pct = myTaskCount > 0 ? Math.round((myDoneCount / myTaskCount) * 100) : 0;
                      const HEALTH_COLOR: Record<string, string> = {
                        on_track: "#4ade80", watch: "#fbbf24", stuck: "#f97316", urgent: "#f87171", critical: "#ef4444", low_priority: "#71717a",
                      };
                      const hc = HEALTH_COLOR[project.health] ?? "#71717a";

                      return (
                        <div
                          key={project.id}
                          onClick={() => router.push(`/projects?projectId=${project.id}`)}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 12,
                            padding: "12px 16px",
                            minWidth: 200,
                            maxWidth: 260,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            flex: "1 1 200px",
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = `${hc}44`;
                            (e.currentTarget as HTMLElement).style.background = `${hc}08`;
                            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: "50%",
                              background: hc, display: "inline-block",
                              boxShadow: `0 0 6px ${hc}88`,
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 11, color: "#52525b", fontWeight: 600 }}>
                              {myTaskCount} tasks
                            </span>
                          </div>
                          <div style={{
                            fontSize: 12, fontWeight: 700, color: "#d4d4d8",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            marginBottom: 4,
                          }}>
                            {project.projectName || project.client}
                          </div>
                          <div style={{ fontSize: 10, color: "#52525b", marginBottom: 8 }}>
                            {project.client} · {project.currentStageLabel || project.currentStage}
                          </div>

                          {/* Progress bar */}
                          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 4, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: `linear-gradient(90deg, ${hc}99, ${hc})`,
                              borderRadius: 4,
                              transition: "width 0.6s ease",
                            }} />
                          </div>
                          <div style={{ fontSize: 10, color: "#52525b", marginTop: 4, textAlign: "right" }}>
                            {myDoneCount}/{myTaskCount} done · {pct}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
