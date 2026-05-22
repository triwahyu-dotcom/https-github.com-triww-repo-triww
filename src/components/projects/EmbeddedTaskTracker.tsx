"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Check, ChevronDown, ChevronLeft, Plus, X, Calendar, AlertTriangle,
  User, Trash2, Flag, MessageSquare, Paperclip, List, LayoutGrid, Tag,
  Maximize2
} from "lucide-react";
import type {
  ProjectRecord, ProjectTask, TaskDetailedStatus,
  SubTask, TaskComment, TaskPriority,
} from "@/lib/project/types";
import { seedTasksForProject } from "@/lib/project/defaultTasks";

// ─── types ───────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface EmbeddedTaskTrackerProps {
  project: ProjectRecord;
  teamMembers: TeamMember[];
  onUpdateProject: (updated: ProjectRecord) => Promise<void>;
  isReadOnly?: boolean;
}

// ─── constants ────────────────────────────────────────────────────────────────

const STAGE_CONFIG: { key: string; label: string }[] = [
  { key: "lead",        label: "Brief" },
  { key: "pitching",    label: "Pitching" },
  { key: "negotiation", label: "Negotiation" },
  { key: "execution",   label: "Execution" },
  { key: "reporting",   label: "Reporting" },
  { key: "finance",     label: "Finance / Billing" },
];
const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STAGE_CONFIG.map((s) => [s.key, s.label])
);

const STATUS_ORDER: TaskDetailedStatus[] = ["pending", "in_progress", "done"];
const STATUS_META: Record<TaskDetailedStatus, { label: string; color: string }> = {
  pending:     { label: "To do",       color: "#62626E" },
  in_progress: { label: "In progress", color: "#F5A524" },
  done:        { label: "Done",        color: "#34D399" },
};

const PRIORITY_META: Record<TaskPriority, { label: string; grad: string }> = {
  urgent: { label: "Urgent", grad: "linear-gradient(135deg,#7f1d1d,#f2555a)" },
  high:   { label: "High",   grad: "linear-gradient(135deg,#9a3412,#fb923c)" },
  medium: { label: "Medium", grad: "linear-gradient(135deg,#1e3a8a,#4c8dff)" },
  low:    { label: "Low",    grad: "linear-gradient(135deg,#374151,#6b7280)" },
};

const TAG_PALETTE = [
  "#4C8DFF","#A78BFA","#2DD4BF","#F472B6","#F5A524",
  "#34D399","#F2555A","#94A3B8",
];
const tagColor = (t: string) => {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
};

const avatarColor = (name: string) => {
  const palette = ["#4C8DFF","#A78BFA","#34D399","#F5A524","#F472B6","#2DD4BF","#F2555A"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "";
const fmtStamp = (d: string) =>
  new Date(d).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
const isOverdue = (t: ProjectTask) =>
  !!t.dueDate && t.status !== "done" && new Date(t.dueDate) < new Date();

/** Normalize a task loaded from the DB (backward compat). */
function normalizeTask(t: ProjectTask): ProjectTask {
  return {
    ...t,
    status: (["pending","in_progress","done"].includes(t.status as string)
      ? t.status
      : "pending") as TaskDetailedStatus,
    assignees: t.assignees ?? (t.assignee ? [t.assignee] : []),
    tags:      t.tags      ?? [],
    subtasks:  t.subtasks  ?? [],
    comments:  t.comments  ?? [],
    priority:  t.priority  ?? "medium",
  };
}

// ─── small shared UI ──────────────────────────────────────────────────────────

function Ring({ pct, size = 60, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={pct === 100 ? "#34D399" : "#4C8DFF"}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (pct/100)*c}
        style={{ transition: "stroke-dashoffset .5s ease" }}/>
    </svg>
  );
}

function StatusToggle({ status, onClick, disabled }: { status: TaskDetailedStatus; onClick: () => void; disabled?: boolean }) {
  const m = STATUS_META[status];
  return (
    <button
      onClick={onClick} disabled={disabled}
      title={`Status: ${m.label}${disabled ? "" : " (klik untuk ganti)"}`}
      className="ett-status-toggle"
      style={{
        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
        cursor: disabled ? "default" : "pointer", padding: 0,
        border: `2px solid ${m.color}`,
        background: status === "done" ? "#34D399" : status === "in_progress" ? "transparent" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: status === "in_progress" ? `inset 0 0 0 4px #F5A524` : "none",
        transition: "all .18s ease",
      }}
    >
      {status === "done" && <Check size={12} color="#0B0B11" strokeWidth={3.5}/>}
    </button>
  );
}

function AvatarBubble({ name, size = 22 }: { name: string; size?: number }) {
  const col = avatarColor(name);
  return (
    <div title={name} style={{
      width: size, height: size, borderRadius: "50%",
      background: col + "22", border: `1px solid ${col}55`,
      color: col, fontSize: size * 0.38, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      textTransform: "uppercase", flexShrink: 0,
    }}>
      {name.slice(0, 2)}
    </div>
  );
}

function AvatarStack({ names, size = 22 }: { names: string[]; size?: number }) {
  const list = names || [];
  if (list.length === 0) return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: "1px dashed rgba(255,255,255,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <User size={11} color="#62626E"/>
    </div>
  );
  const shown = list.slice(0, 3), extra = list.length - shown.length;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((name, i) => (
        <div key={name} style={{ marginLeft: i ? -7 : 0, borderRadius: "50%", boxShadow: "0 0 0 2px #181820" }}>
          <AvatarBubble name={name} size={size}/>
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          marginLeft: -7, width: size, height: size, borderRadius: "50%",
          background: "#131319", border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 0 0 2px #181820",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.34, color: "#9A9AA6", fontWeight: 700,
        }}>+{extra}</div>
      )}
    </div>
  );
}

function PriorityPill({ p }: { p?: TaskPriority }) {
  if (!p || !PRIORITY_META[p]) return null;
  const meta = PRIORITY_META[p];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
      padding: "2px 8px", borderRadius: 999,
      background: meta.grad, color: "#fff",
      display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap",
    }}>
      <Flag size={9}/>{meta.label}
    </span>
  );
}

function TagPill({ tag, small, onRemove }: { tag: string; small?: boolean; onRemove?: () => void }) {
  const col = tagColor(tag);
  return (
    <span style={{
      fontSize: small ? 10 : 11, fontWeight: 600, color: col,
      background: col + "18", border: `1px solid ${col}38`,
      borderRadius: 6, padding: small ? "1px 6px" : "3px 8px",
      whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      {tag}
      {onRemove && (
        <X size={10} style={{ cursor: "pointer", opacity: 0.8 }}
           onClick={(e) => { e.stopPropagation(); onRemove(); }}/>
      )}
    </span>
  );
}

function DocChip({ text }: { text: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10.5, fontWeight: 600, color: "#4C8DFF",
      background: "#4C8DFF14", border: "1px solid #4C8DFF33",
      borderRadius: 6, padding: "2px 7px", maxWidth: 160,
      overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
    }}>
      <Paperclip size={9} style={{ flexShrink: 0 }}/>{text}
    </span>
  );
}

function LocalLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontSize: 10.5,
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "#62626E",
      fontWeight: 700,
      display: "block",
      marginBottom: 6,
      ...style
    }}>
      {children}
    </span>
  );
}

function StatusSeg({
  value, onChange, disabled
}: {
  value: TaskDetailedStatus;
  onChange: (v: TaskDetailedStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {STATUS_ORDER.map((st) => {
        const m = STATUS_META[st];
        const on = value === st;
        return (
          <button
            key={st}
            type="button"
            disabled={disabled}
            onClick={() => onChange(st)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 8,
              cursor: disabled ? "default" : "pointer",
              fontSize: 12,
              fontWeight: 600,
              border: `1px solid ${on ? m.color : "rgba(255,255,255,0.08)"}`,
              background: on ? m.color + "22" : "transparent",
              color: on ? "#E9E9EE" : "#9A9AA6",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function PriorityPicker({
  value, onChange, disabled
}: {
  value: TaskPriority;
  onChange: (v: TaskPriority) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {(["urgent", "high", "medium", "low"] as TaskPriority[]).map((p) => {
        const meta = PRIORITY_META[p];
        const on = value === p;
        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: ".04em",
              padding: "4px 10px",
              borderRadius: 999,
              cursor: disabled ? "default" : "pointer",
              border: on ? "none" : "1px solid rgba(255,255,255,0.08)",
              background: on ? meta.grad : "transparent",
              color: on ? "#fff" : "#9A9AA6",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Flag size={10} />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function EmbeddedTaskTracker({
  project, teamMembers, onUpdateProject, isReadOnly = false,
}: EmbeddedTaskTrackerProps) {

  // Normalize tasks from DB
  const rawTasks = useMemo(
    () => (project.tasks || []).map(normalizeTask),
    [project.tasks]
  );

  const [localTasks, setLocalTasks] = useState<ProjectTask[]>(rawTasks);
  const [view, setView]             = useState<"list" | "board">("list");
  const [filter, setFilter]         = useState<"all" | TaskDetailedStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openStages, setOpenStages] = useState<Record<string, boolean>>(
    () => Object.fromEntries(STAGE_CONFIG.map((s) => [s.key, true]))
  );
  const [addingStage, setAddingStage] = useState<string | null>(null);
  const [newTitle, setNewTitle]       = useState("");
  const [subInput, setSubInput]       = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [tagInput, setTagInput]       = useState("");
  const [dragId, setDragId]           = useState<string | null>(null);
  const [overCol, setOverCol]         = useState<TaskDetailedStatus | null>(null);

  // Debounce ref for text inputs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when project changes externally
  useEffect(() => {
    setLocalTasks((project.tasks || []).map(normalizeTask));
  }, [project.id]); // only re-sync on project change, not every render

  // ── persist helpers ──────────────────────────────────────────────────────

  const persist = useCallback(async (tasks: ProjectTask[]) => {
    await onUpdateProject({ ...project, tasks });
  }, [project, onUpdateProject]);

  const persistDebounced = useCallback((tasks: ProjectTask[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(tasks), 550);
  }, [persist]);

  const applyUpdate = useCallback((
    id: string, patch: Partial<ProjectTask>, immediate = false
  ) => {
    setLocalTasks((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, ...patch } : t);
      if (immediate) persist(next);
      else persistDebounced(next);
      return next;
    });
  }, [persist, persistDebounced]);

  // ── computed ──────────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => filter === "all" ? localTasks : localTasks.filter((t) => t.status === filter),
    [localTasks, filter]
  );
  const sel = selectedId ? localTasks.find((t) => t.id === selectedId) ?? null : null;

  const overall = useMemo(() => {
    const done = localTasks.filter((t) => t.status === "done").length;
    const total = localTasks.length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [localTasks]);

  const cycleStatus = (t: ProjectTask) => {
    if (isReadOnly) return;
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(t.status) + 1) % 3];
    applyUpdate(t.id, { status: next }, true);
  };

  // ── add task ──────────────────────────────────────────────────────────────

  const addTask = (stage: string) => {
    if (!newTitle.trim() || isReadOnly) return;
    const id = `cust-${Date.now().toString(36)}`;
    const newTask: ProjectTask = {
      id, title: newTitle.trim(), stage: stage as any,
      status: "pending", required: false, priority: "medium",
      assignees: [], tags: [], subtasks: [], comments: [],
    };
    setLocalTasks((prev) => {
      const next = [...prev, newTask];
      persist(next);
      return next;
    });
    setNewTitle(""); setAddingStage(null);
  };

  // ── subtask helpers ───────────────────────────────────────────────────────

  const addSubFor = (t: ProjectTask, subTitle: string) => {
    if (!subTitle.trim() || isReadOnly) return;
    const sub: SubTask = { id: `s-${Date.now().toString(36)}`, title: subTitle.trim(), done: false };
    applyUpdate(t.id, { subtasks: [...(t.subtasks ?? []), sub] }, true);
  };

  const toggleSubFor = (t: ProjectTask, sid: string) => {
    if (isReadOnly) return;
    applyUpdate(t.id, {
      subtasks: t.subtasks?.map((s) => s.id === sid ? { ...s, done: !s.done } : s),
    }, true);
  };

  const delSubFor = (t: ProjectTask, sid: string) => {
    if (isReadOnly) return;
    applyUpdate(t.id, { subtasks: t.subtasks?.filter((s) => s.id !== sid) }, true);
  };

  const addSub = () => {
    if (!sel) return;
    addSubFor(sel, subInput);
    setSubInput("");
  };
  const toggleSub = (sid: string) => {
    if (!sel) return;
    toggleSubFor(sel, sid);
  };
  const delSub = (sid: string) => {
    if (!sel) return;
    delSubFor(sel, sid);
  };

  // ── comment helpers ──────────────────────────────────────────────────────

  const addComment = () => {
    if (!sel || !commentInput.trim() || isReadOnly) return;
    const comment: TaskComment = {
      id: `cm-${Date.now().toString(36)}`,
      userId: "Saya",
      text: commentInput.trim(),
      timestamp: new Date().toISOString(),
    };
    applyUpdate(sel.id, { comments: [...(sel.comments ?? []), comment] }, true);
    setCommentInput("");
  };

  // ── assignee / tag helpers ────────────────────────────────────────────────

  const toggleAssigneeFor = (t: ProjectTask, name: string) => {
    if (isReadOnly) return;
    const cur = t.assignees ?? [];
    applyUpdate(t.id, {
      assignees: cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name],
    }, true);
  };

  const toggleAssignee = (name: string) => {
    if (!sel) return;
    toggleAssigneeFor(sel, name);
  };

  const addTagTo = (t: ProjectTask, tagStr: string) => {
    const v = tagStr.trim();
    if (!v || isReadOnly) return;
    const cur = t.tags ?? [];
    if (!cur.includes(v)) applyUpdate(t.id, { tags: [...cur, v] }, true);
  };

  const addTag = () => {
    if (!sel) return;
    addTagTo(sel, tagInput);
    setTagInput("");
  };

  const delTagFrom = (t: ProjectTask, tg: string) => {
    if (isReadOnly) return;
    applyUpdate(t.id, { tags: t.tags?.filter((x) => x !== tg) }, true);
  };

  const delTag = (tg: string) => {
    if (!sel) return;
    delTagFrom(sel, tg);
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  EMPTY STATE VIEW (For projects created before tasks update)
  // ────────────────────────────────────────────────────────────────────────────
  if (localTasks.length === 0) {
    return (
      <div className="ett-wrap ett-in">
        {/* Project name + ring header */}
        <div className="ett-header-row" style={{ marginBottom: 28 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: "#E9E9EE" }}>
              {project.projectName || project.client}
            </div>
            <div style={{ fontSize: 12, color: "#9A9AA6", marginTop: 3 }}>
              {STAGE_LABELS[project.currentStage] ?? project.currentStage}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 60, height: 60 }}>
              <Ring pct={0}/>
              <div className="ett-ring-label">0%</div>
            </div>
            <div style={{ fontSize: 12, color: "#9A9AA6", lineHeight: 1.4 }}>
              <div style={{ color: "#E9E9EE", fontWeight: 600 }}>0/0</div>
              <div>completed</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#131319", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, textAlign: "center" }}>
          <div style={{ background: "rgba(245, 165, 36, 0.1)", border: "1px solid rgba(245, 165, 36, 0.2)", color: "#F5A524", borderRadius: "50%", width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <AlertTriangle size={22} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px 0", color: "#E9E9EE" }}>Belum Ada Tugas untuk Proyek Ini</h3>
          <p style={{ fontSize: 12.5, color: "#9A9AA6", maxWidth: 440, margin: "0 0 20px 0", lineHeight: 1.5 }}>
            Proyek lama ini belum memiliki data task. Pilih untuk menginisialisasi 22 tugas SOP standar JUARA otomatis, atau buat tugas kustom pertama Anda secara manual.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {!isReadOnly ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const newTasks = seedTasksForProject();
                    setLocalTasks(newTasks);
                    persist(newTasks);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #1e3a8a, #4c8dff)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 16px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 3px 8px rgba(76, 141, 255, 0.2)"
                  }}
                >
                  <Check size={14} strokeWidth={2.5} />
                  Inisialisasi Tugas SOP (Rekomendasi)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = `cust-${Date.now().toString(36)}`;
                    const newTask: ProjectTask = {
                      id,
                      title: "Brief Awal Proyek",
                      stage: "lead",
                      status: "pending",
                      required: true,
                      priority: "high",
                      assignees: [],
                      tags: [],
                      subtasks: [],
                      comments: [],
                    };
                    const newTasks = [newTask];
                    setLocalTasks(newTasks);
                    persist(newTasks);
                  }}
                  style={{
                    background: "transparent",
                    color: "#9A9AA6",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: "9px 16px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all .15s ease"
                  }}
                  className="ett-btn-ghost"
                >
                  <Plus size={14} />
                  Tugas Kustom Baru
                </button>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "#62626E" }}>Tugas kosong (Hanya Baca)</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  DETAIL VIEW
  // ────────────────────────────────────────────────────────────────────────────
  if (sel) {
    const subs = sel.subtasks ?? [], comments = sel.comments ?? [];
    const asn  = sel.assignees ?? [], tg = sel.tags ?? [];
    const subDone = subs.filter((s) => s.done).length;

    return (
      <div className="ett-wrap ett-in">
        {/* Back button */}
        <button
          onClick={() => setSelectedId(null)}
          className="ett-back-btn"
        >
          <ChevronLeft size={16}/> Kembali ke daftar tugas
        </button>

        <div>
          {/* Stage + optional badge */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <span className="ett-stage-badge">{STAGE_LABELS[sel.stage] ?? sel.stage}</span>
            {!sel.required && <span className="ett-optional-badge">opsional</span>}
          </div>

          {/* Title + status toggle */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ marginTop: 4 }}>
              <StatusToggle status={sel.status} onClick={() => cycleStatus(sel)} disabled={isReadOnly}/>
            </div>
            <input
              value={sel.title}
              onChange={(e) => applyUpdate(sel.id, { title: e.target.value })}
              disabled={isReadOnly}
              className="ett-title-input"
              style={{ textDecoration: sel.status === "done" ? "line-through" : "none" }}
            />
          </div>

          {/* Overdue banner */}
          {isOverdue(sel) && (
            <div className="ett-overdue-banner">
              <AlertTriangle size={13}/> Lewat tenggat — jatuh tempo {fmtDate(sel.dueDate)}
            </div>
          )}

          {/* Fields grid: Status / Priority / Due date */}
          <div className="ett-fields-grid">
            <div>
              <div className="ett-field-label">Status</div>
              <select
                value={sel.status}
                onChange={(e) => applyUpdate(sel.id, { status: e.target.value as TaskDetailedStatus }, true)}
                disabled={isReadOnly} className="ett-select"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s} style={{ background: "#131319" }}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="ett-field-label">Priority</div>
              <select
                value={sel.priority ?? "medium"}
                onChange={(e) => applyUpdate(sel.id, { priority: e.target.value as TaskPriority }, true)}
                disabled={isReadOnly} className="ett-select"
              >
                {(["urgent","high","medium","low"] as TaskPriority[]).map((p) => (
                  <option key={p} value={p} style={{ background: "#131319" }}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="ett-field-label">Due date</div>
              <input
                type="date" value={sel.dueDate ?? ""}
                onChange={(e) => applyUpdate(sel.id, { dueDate: e.target.value || undefined }, true)}
                disabled={isReadOnly} className="ett-input"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Assignees */}
          <div className="ett-section-label" style={{ marginTop: 22 }}>Assignees</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {teamMembers.length > 0 ? teamMembers.map((m) => {
              const on = asn.includes(m.name);
              const col = avatarColor(m.name);
              return (
                <button key={m.id} onClick={() => toggleAssignee(m.name)} disabled={isReadOnly}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "5px 11px 5px 6px", borderRadius: 999, cursor: isReadOnly ? "default" : "pointer",
                    border: `1px solid ${on ? col + "88" : "rgba(255,255,255,0.08)"}`,
                    background: on ? col + "1f" : "transparent",
                    color: on ? "#E9E9EE" : "#9A9AA6", fontSize: 12.5, fontWeight: 600,
                  }}
                >
                  <AvatarBubble name={m.name} size={20}/>
                  {m.name}
                  <span style={{ fontSize: 9.5, color: "#62626E" }}>{m.role}</span>
                  {on && <Check size={12} color={col}/>}
                </button>
              );
            }) : (
              <span style={{ fontSize: 12, color: "#62626E" }}>
                Tidak ada anggota tim. Tambahkan via Supabase team_members.
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="ett-section-label" style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 6 }}>
            <Tag size={11}/> Tags
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", marginTop: 8 }}>
            {tg.map((x) => <TagPill key={x} tag={x} onRemove={isReadOnly ? undefined : () => delTag(x)}/>)}
            {!isReadOnly && (
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="+ tag" className="ett-input" style={{ width: 100, padding: "5px 9px" }}
              />
            )}
          </div>

          {/* Doc link */}
          <div className="ett-section-label" style={{ marginTop: 22 }}>Dokumen terkait</div>
          <input
            value={sel.docLink ?? ""}
            onChange={(e) => applyUpdate(sel.id, { docLink: e.target.value || undefined })}
            disabled={isReadOnly} placeholder="Tempel link / nama dokumen (Document A, RFP, PO Vendor…)"
            className="ett-input" style={{ width: "100%", marginTop: 6 }}
          />

          {/* Description */}
          <div className="ett-section-label" style={{ marginTop: 22 }}>Description</div>
          <textarea
            value={sel.description ?? ""}
            onChange={(e) => applyUpdate(sel.id, { description: e.target.value || undefined })}
            disabled={isReadOnly} placeholder="Catatan / detail tugas…" rows={3}
            className="ett-input" style={{ marginTop: 6, resize: "vertical", width: "100%", lineHeight: 1.55 }}
          />

          {/* Subtasks + Comments (2-column) */}
          <div className="ett-two-col" style={{ marginTop: 24 }}>

            {/* Subtasks */}
            <div>
              <div className="ett-section-label" style={{ marginBottom: 9 }}>
                Subtasks {subs.length > 0 && <span style={{ color: "#62626E" }}>· {subDone}/{subs.length}</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {subs.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                    <button
                      onClick={() => toggleSub(s.id)} disabled={isReadOnly}
                      style={{
                        width: 17, height: 17, borderRadius: 4, flexShrink: 0, cursor: isReadOnly ? "default" : "pointer",
                        border: `2px solid ${s.done ? "#34D399" : "#62626E"}`,
                        background: s.done ? "#34D399" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {s.done && <Check size={10} color="#0B0B11" strokeWidth={3.5}/>}
                    </button>
                    <span style={{ flex: 1, color: s.done ? "#62626E" : "#E9E9EE", textDecoration: s.done ? "line-through" : "none" }}>
                      {s.title}
                    </span>
                    {!isReadOnly && (
                      <button onClick={() => delSub(s.id)} style={{ background: "transparent", border: "none", color: "#62626E", cursor: "pointer" }}>
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </div>
                ))}
                {!isReadOnly && (
                  <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
                    <input
                      value={subInput} onChange={(e) => setSubInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSub()}
                      placeholder="+ Tambah subtask" className="ett-input" style={{ flex: 1 }}
                    />
                    <button onClick={addSub} className="ett-btn-icon">
                      <Plus size={14}/>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Comments */}
            <div>
              <div className="ett-section-label" style={{ marginBottom: 9, display: "flex", alignItems: "center", gap: 6 }}>
                <MessageSquare size={12}/> Komentar
                {comments.length > 0 && <span style={{ color: "#62626E" }}>· {comments.length}</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {comments.length === 0 && (
                  <div style={{ fontSize: 12, color: "#62626E" }}>Belum ada komentar.</div>
                )}
                {comments.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 9 }}>
                    <AvatarBubble name={c.userId} size={26}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{c.userId}</span>{" "}
                        <span style={{ color: "#62626E", fontSize: 11 }}>· {fmtStamp(c.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#9A9AA6", marginTop: 2, lineHeight: 1.5 }}>{c.text}</div>
                    </div>
                  </div>
                ))}
                {!isReadOnly && (
                  <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
                    <input
                      value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addComment()}
                      placeholder="Tulis komentar…" className="ett-input" style={{ flex: 1 }}
                    />
                    <button onClick={addComment} className="ett-btn-primary">Kirim</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  SHARED HEADER
  // ────────────────────────────────────────────────────────────────────────────
  const FILTERS: [string, string][] = [
    ["all","All"],["pending","To do"],["in_progress","In progress"],["done","Done"],
  ];
  const Header = (
    <>
      {/* Project name + ring */}
      <div className="ett-header-row">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: "#E9E9EE" }}>
            {project.projectName || project.client}
          </div>
          <div style={{ fontSize: 12, color: "#9A9AA6", marginTop: 3 }}>
            {STAGE_LABELS[project.currentStage] ?? project.currentStage}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 60, height: 60 }}>
            <Ring pct={overall.pct}/>
            <div className="ett-ring-label">{overall.pct}%</div>
          </div>
          <div style={{ fontSize: 12, color: "#9A9AA6", lineHeight: 1.4 }}>
            <div style={{ color: "#E9E9EE", fontWeight: 600 }}>{overall.done}/{overall.total}</div>
            <div>completed</div>
          </div>
        </div>
      </div>

      {/* Filter + view toggle */}
      <div className="ett-toolbar">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k as any)}
              className={`ett-filter-btn ${filter === k ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ett-view-toggle">
          {([["list", List, "List"], ["board", LayoutGrid, "Board"]] as any[]).map(([k, Icon, label]) => (
            <button key={k} onClick={() => setView(k)}
              className={`ett-view-btn ${view === k ? "active" : ""}`}
            >
              <Icon size={13}/>{label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  // ────────────────────────────────────────────────────────────────────────────
  //  BOARD VIEW
  // ────────────────────────────────────────────────────────────────────────────
  if (view === "board") {
    return (
      <div className="ett-wrap">
        {Header}
        <div className="ett-board">
          {STATUS_ORDER.map((st) => {
            const meta = STATUS_META[st];
            const colTasks = filtered.filter((t) => t.status === st);
            const isOver = overCol === st;
            return (
              <div key={st}
                onDragOver={(e) => { e.preventDefault(); setOverCol(st); }}
                onDragLeave={() => setOverCol((c) => c === st ? null : c)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) applyUpdate(dragId, { status: st }, true);
                  setDragId(null); setOverCol(null);
                }}
                className={`ett-board-col ${isOver ? "over" : ""}`}
                style={{ borderColor: isOver ? meta.color : undefined }}
              >
                <div className="ett-board-col-header">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }}/>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{meta.label}</span>
                  <span style={{ fontSize: 11, color: "#62626E" }}>{colTasks.length}</span>
                </div>
                {colTasks.map((t) => (
                  <div key={t.id}
                    draggable={!isReadOnly}
                    onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setSelectedId(t.id)}
                    className="ett-card"
                    style={{ opacity: dragId === t.id ? 0.4 : 1 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                      <span className="ett-card-stage">{STAGE_LABELS[t.stage] ?? t.stage}</span>
                      <PriorityPill p={t.priority}/>
                    </div>
                    <div className="ett-card-title" style={{
                      color: t.status === "done" ? "#62626E" : "#E9E9EE",
                      textDecoration: t.status === "done" ? "line-through" : "none",
                    }}>
                      {t.title}{t.required && <span style={{ color: "#F2555A", marginLeft: 4 }}>*</span>}
                    </div>
                    {t.tags && t.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                        {t.tags.slice(0, 3).map((x) => <TagPill key={x} tag={x} small/>)}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: isOverdue(t) ? "#F2555A" : "#9A9AA6" }}>
                        {t.dueDate && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            {isOverdue(t) ? <AlertTriangle size={10}/> : <Calendar size={10}/>}
                            {fmtDate(t.dueDate)}
                          </span>
                        )}
                        {t.subtasks && t.subtasks.length > 0 && (
                          <span>✓ {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}</span>
                        )}
                      </div>
                      <AvatarStack names={t.assignees ?? []} size={20}/>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div style={{ fontSize: 11.5, color: "#62626E", textAlign: "center", padding: "16px 0" }}>
                    Tarik tugas ke sini
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "#62626E", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <LayoutGrid size={11}/> Seret kartu antar kolom untuk mengubah status.
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  LIST VIEW
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="ett-wrap">
      {Header}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {STAGE_CONFIG.map(({ key: stageKey, label: stageLabel }) => {
          const rows = filtered.filter((t) => t.stage === stageKey);
          const allInStage = localTasks.filter((t) => t.stage === stageKey);
          const done = allInStage.filter((t) => t.status === "done").length;
          const total = allInStage.length;
          if (total === 0) return null;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const isOpen = openStages[stageKey];

          return (
            <div key={stageKey} className="ett-stage-group">
              <button
                onClick={() => setOpenStages((p) => ({ ...p, [stageKey]: !p[stageKey] }))}
                className="ett-stage-header"
              >
                <ChevronDown size={15} color="#9A9AA6"
                  style={{ transform: isOpen ? "none" : "rotate(-90deg)", transition: "transform .2s ease", flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#E9E9EE" }}>{stageLabel}</span>
                <span style={{ fontSize: 11, color: "#62626E" }}>{done}/{total}</span>
                <div className="ett-stage-bar">
                  <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? "#34D399" : "#4C8DFF", transition: "width .4s ease" }}/>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: "0 10px 10px" }}>
                  {rows.map((t) => {
                    const overdue = isOverdue(t);
                    const subs = t.subtasks ?? [], sd = subs.filter((s) => s.done).length;
                    const tg = t.tags ?? [];
                    return (
                      <React.Fragment key={t.id}>
                        <div
                          className="ett-row"
                          onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                          style={{
                            border: expandedId === t.id ? "1px solid rgba(255,255,255,0.12)" : undefined
                          }}
                        >
                          <div onClick={(e) => { e.stopPropagation(); cycleStatus(t); }}>
                            <StatusToggle status={t.status} onClick={() => {}} disabled={isReadOnly}/>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 500,
                              color: t.status === "done" ? "#62626E" : "#E9E9EE",
                              textDecoration: t.status === "done" ? "line-through" : "none",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {t.title}
                              {t.required
                                ? <span style={{ color: "#F2555A", marginLeft: 5 }}>*</span>
                                : <span style={{ color: "#62626E", marginLeft: 6, fontSize: 10 }}>opsional</span>}
                            </div>
                            <div style={{ fontSize: 10.5, color: "#62626E", marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              {subs.length > 0 && <span>✓ {sd}/{subs.length}</span>}
                              {t.comments && t.comments.length > 0 && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                  <MessageSquare size={9}/>{t.comments.length}
                                </span>
                              )}
                              {tg.slice(0, 2).map((x) => <TagPill key={x} tag={x} small/>)}
                              {tg.length > 2 && <span>+{tg.length - 2}</span>}
                              {t.docLink && <DocChip text={t.docLink}/>}
                            </div>
                          </div>
                          {t.dueDate && (
                            <span style={{ fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, color: overdue ? "#F2555A" : "#9A9AA6", whiteSpace: "nowrap" }}>
                              {overdue ? <AlertTriangle size={11}/> : <Calendar size={11}/>}
                              {fmtDate(t.dueDate)}
                            </span>
                          )}
                          <PriorityPill p={t.priority}/>
                          <AvatarStack names={t.assignees ?? []}/>
                          <ChevronDown
                            size={15}
                            color="#9A9AA6"
                            style={{
                              transform: expandedId === t.id ? "none" : "rotate(-90deg)",
                              transition: "transform .2s ease",
                              flexShrink: 0
                            }}
                          />
                        </div>

                        {expandedId === t.id && (
                          <div
                            className="ett-exp"
                            style={{
                              background: "#131319",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 10,
                              margin: "8px 0 0",
                              padding: 14,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
                              <div>
                                <LocalLabel>Status</LocalLabel>
                                <StatusSeg
                                  value={t.status}
                                  onChange={(v) => applyUpdate(t.id, { status: v }, true)}
                                  disabled={isReadOnly}
                                />
                              </div>
                              <div>
                                <LocalLabel>Priority</LocalLabel>
                                <PriorityPicker
                                  value={t.priority || "medium"}
                                  onChange={(v) => applyUpdate(t.id, { priority: v }, true)}
                                  disabled={isReadOnly}
                                />
                              </div>
                              <div>
                                <LocalLabel>Due date</LocalLabel>
                                <input
                                  type="date"
                                  value={t.dueDate || ""}
                                  onChange={(e) => applyUpdate(t.id, { dueDate: e.target.value || undefined }, true)}
                                  disabled={isReadOnly}
                                  className="ett-input"
                                  style={{ width: "100%" }}
                                />
                              </div>
                            </div>

                            <LocalLabel style={{ marginTop: 14, marginBottom: 8 }}>Assignees</LocalLabel>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                              {teamMembers.length > 0 ? teamMembers.map((m) => {
                                const on = (t.assignees || []).includes(m.name);
                                const col = avatarColor(m.name);
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => toggleAssigneeFor(t, m.name)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "4px 9px 4px 5px",
                                      borderRadius: 999,
                                      cursor: isReadOnly ? "default" : "pointer",
                                      border: `1px solid ${on ? col + "88" : "rgba(255,255,255,0.08)"}`,
                                      background: on ? col + "1f" : "transparent",
                                      color: on ? "#E9E9EE" : "#9A9AA6",
                                      fontSize: 12,
                                      fontWeight: 600,
                                    }}
                                  >
                                    <AvatarBubble name={m.name} size={18} />
                                    {m.name}
                                    {on && <Check size={12} color={col} />}
                                  </button>
                                );
                              }) : (
                                <span style={{ fontSize: 11.5, color: "#62626E" }}>
                                  Tidak ada anggota tim.
                                </span>
                              )}
                            </div>

                            <LocalLabel style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, marginBottom: 8 }}>
                              <Tag size={12} /> Tags
                            </LocalLabel>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                              {(t.tags || []).map((x) => (
                                <TagPill
                                  key={x}
                                  tag={x}
                                  onRemove={isReadOnly ? undefined : () => delTagFrom(t, x)}
                                />
                              ))}
                              {!isReadOnly && (
                                <input
                                  value={tagInput}
                                  onChange={(e) => setTagInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      addTagTo(t, tagInput);
                                      setTagInput("");
                                    }
                                  }}
                                  placeholder="+ tag"
                                  className="ett-input"
                                  style={{ width: 100, padding: "4px 9px" }}
                                />
                              )}
                            </div>

                            <LocalLabel style={{ marginTop: 14, marginBottom: 8 }}>
                              Subtasks {subs.length > 0 && <span style={{ color: "#62626E" }}>· {sd}/{subs.length}</span>}
                            </LocalLabel>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {subs.map((s) => (
                                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                                  <button
                                    type="button"
                                    disabled={isReadOnly}
                                    onClick={() => toggleSubFor(t, s.id)}
                                    style={{
                                      width: 17,
                                      height: 17,
                                      borderRadius: 4,
                                      flexShrink: 0,
                                      cursor: isReadOnly ? "default" : "pointer",
                                      border: `2px solid ${s.done ? "#34D399" : "#62626E"}`,
                                      background: s.done ? "#34D399" : "transparent",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    {s.done && <Check size={10} color="#0B0B11" strokeWidth={3.5} />}
                                  </button>
                                  <span style={{
                                    flex: 1,
                                    color: s.done ? "#62626E" : "#E9E9EE",
                                    textDecoration: s.done ? "line-through" : "none"
                                  }}>
                                    {s.title}
                                  </span>
                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => delSubFor(t, s.id)}
                                      style={{ background: "transparent", border: "none", color: "#62626E", cursor: "pointer" }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {!isReadOnly && (
                                <input
                                  value={subInput}
                                  onChange={(e) => setSubInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      addSubFor(t, subInput);
                                      setSubInput("");
                                    }
                                  }}
                                  placeholder="+ Tambah subtask"
                                  className="ett-input"
                                  style={{ marginTop: 2 }}
                                />
                              )}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(t.id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 7,
                                  background: "rgba(76,141,255,0.12)",
                                  color: "#4C8DFF",
                                  border: "1px solid rgba(76,141,255,0.35)",
                                  borderRadius: 9,
                                  padding: "8px 14px",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                <Maximize2 size={14} /> Buka penuh
                              </button>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Add custom task */}
                  {!isReadOnly && (
                    addingStage === stageKey ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <input
                          autoFocus value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTask(stageKey)}
                          placeholder="Judul tugas baru…"
                          className="ett-input ett-add-input"
                        />
                        <button onClick={() => addTask(stageKey)} className="ett-btn-primary">Add</button>
                        <button onClick={() => { setAddingStage(null); setNewTitle(""); }} className="ett-btn-ghost">
                          <X size={13}/>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingStage(stageKey)} className="ett-add-btn">
                        <Plus size={13}/> Add Custom Task
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
