import { ProjectRecord, ProjectTask, TaskDetailedStatus } from "./types";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ProjectSummary {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  dueSoon: number;
  pct: number;
  health: "empty" | "complete" | "overdue" | "watch" | "track";
  pics: string[];
  attention: Array<{
    title: string;
    due: string;
    state: "overdue" | "soon";
  }>;
}

export interface PortfolioSummary {
  activeCount: number;
  avgProgress: number;
  totalOverdue: number;
  totalDueSoon: number;
  workloadByMember: Record<string, number>;
  statusDistribution: {
    todo: number;
    inProgress: number;
    done: number;
    total: number;
  };
}

export function isOverdue(task: ProjectTask, now: Date): boolean {
  if (!task.dueDate || task.status === "done") return false;
  const due = new Date(task.dueDate);
  return !isNaN(due.getTime()) && due < now;
}

export function isDueSoon(task: ProjectTask, now: Date, days: number = 7): boolean {
  if (!task.dueDate || task.status === "done") return false;
  const due = new Date(task.dueDate);
  if (isNaN(due.getTime())) return false;
  
  // Overdue is NOT due soon
  if (due < now) return false;
  
  const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return due <= limit;
}

export function summarizeProject(project: ProjectRecord, now: Date): ProjectSummary {
  const tasks = project.tasks || [];
  
  // Normalize tasks using backward compat rules
  const normalizedTasks = tasks.map(t => ({
    ...t,
    status: (["pending", "in_progress", "done"].includes(t.status as string)
      ? t.status
      : "pending") as TaskDetailedStatus,
    assignees: t.assignees ?? (t.assignee ? [t.assignee] : []),
  }));

  const total = normalizedTasks.length;
  const done = normalizedTasks.filter(t => t.status === "done").length;
  const inProgress = normalizedTasks.filter(t => t.status === "in_progress").length;
  
  const overdueTasks = normalizedTasks.filter(t => isOverdue(t, now));
  const dueSoonTasks = normalizedTasks.filter(t => isDueSoon(t, now));
  
  const overdue = overdueTasks.length;
  const dueSoon = dueSoonTasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  
  let health: "empty" | "complete" | "overdue" | "watch" | "track";
  if (total === 0) {
    health = "empty";
  } else if (done === total) {
    health = "complete";
  } else if (overdue > 0) {
    health = "overdue";
  } else if (dueSoon > 0) {
    health = "watch";
  } else {
    health = "track";
  }
  
  const pics = project.owners || [];
  
  const attention: ProjectSummary["attention"] = [];
  overdueTasks.forEach(t => {
    attention.push({
      title: t.title,
      due: t.dueDate || "",
      state: "overdue"
    });
  });
  dueSoonTasks.forEach(t => {
    attention.push({
      title: t.title,
      due: t.dueDate || "",
      state: "soon"
    });
  });
  
  return {
    total,
    done,
    inProgress,
    overdue,
    dueSoon,
    pct,
    health,
    pics,
    attention
  };
}

export function summarizePortfolio(projects: ProjectRecord[], now: Date, teamMembers: TeamMember[]): PortfolioSummary {
  // Active: not completed and not lost
  const activeProjects = projects.filter(p => p.currentStage !== "completed" && p.currentStage !== "lost");
  const activeCount = activeProjects.length;
  
  const activeProjectsWithTasks = activeProjects.map(p => summarizeProject(p, now)).filter(s => s.total > 0);
  const avgProgress = activeProjectsWithTasks.length
    ? Math.round(activeProjectsWithTasks.reduce((sum, s) => sum + s.pct, 0) / activeProjectsWithTasks.length)
    : 0;
    
  let totalOverdue = 0;
  let totalDueSoon = 0;
  
  const workloadByMember: Record<string, number> = {};
  teamMembers.forEach(m => {
    workloadByMember[m.name] = 0;
  });
  
  let todo = 0;
  let inProgress = 0;
  let done = 0;
  
  projects.forEach(project => {
    const summary = summarizeProject(project, now);
    totalOverdue += summary.overdue;
    totalDueSoon += summary.dueSoon;
    
    const tasks = project.tasks || [];
    tasks.forEach(t => {
      const status = (["pending", "in_progress", "done"].includes(t.status as string)
        ? t.status
        : "pending") as TaskDetailedStatus;
        
      if (status === "done") {
        done += 1;
      } else {
        if (status === "in_progress") {
          inProgress += 1;
        } else {
          todo += 1;
        }
        
        // Workload is count of open tasks (pending or in_progress)
        const assignees = t.assignees ?? (t.assignee ? [t.assignee] : []);
        assignees.forEach(name => {
          if (name) {
            workloadByMember[name] = (workloadByMember[name] || 0) + 1;
          }
        });
      }
    });
  });
  
  const total = todo + inProgress + done;
  
  return {
    activeCount,
    avgProgress,
    totalOverdue,
    totalDueSoon,
    workloadByMember,
    statusDistribution: {
      todo,
      inProgress,
      done,
      total: total || 1
    }
  };
}
