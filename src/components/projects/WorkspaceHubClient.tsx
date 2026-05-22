"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectRecord } from "@/lib/project/types";
import { TeamMember } from "@/lib/project/monitoring";
import MonitoringDashboard from "./MonitoringDashboard";

interface WorkspaceHubClientProps {
  projects: ProjectRecord[];
  teamMembers: TeamMember[];
}

export default function WorkspaceHubClient({
  projects,
  teamMembers
}: WorkspaceHubClientProps) {
  const router = useRouter();

  const handleOpenProject = (projectId: string) => {
    router.push(`/projects?projectId=${projectId}&tab=tasks`);
  };

  return (
    <main className="hub-shell" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <section className="hub-hero">
        <p className="hub-kicker">JUARA Workspace</p>
        <h1>Projects and vendors in one workspace</h1>
        <p>
          Manage event pipeline, vendor onboarding, and vendor assignment from one app. Choose the module
          you want to open.
        </p>
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
        <h2 style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".14em",
          color: "var(--muted)",
          textTransform: "uppercase",
          marginBottom: 16
        }}>
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
    </main>
  );
}
