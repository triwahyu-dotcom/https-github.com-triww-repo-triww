"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface WorkspaceShellProps {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function WorkspaceShell({
  children,
  title,
  eyebrow,
  actions,
}: WorkspaceShellProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Projects", href: "/projects", icon: "📊" },
    { label: "CRM", href: "/crm", icon: "🤝" },
    { label: "Vendors", href: "/vendors", icon: "⌘" },
  ];

  return (
    <div className="pm-app">
      <aside className="pm-sidebar">
        <div className="pm-logo">J</div>
        <div className="pm-sidebar-group">
          <p className="pm-sidebar-label">JUARA Workspace</p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`pm-sidebar-item ${pathname.startsWith(item.href) ? "active" : ""}`}
            >
              <span style={{ marginRight: "12px" }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      <section className="pm-main">
        <header className="pm-topbar">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
          </div>
          <div className="workspace-actions">
            {actions}
          </div>
        </header>
        
        <div className="pm-content">
          {children}
        </div>
      </section>
    </div>
  );
}
