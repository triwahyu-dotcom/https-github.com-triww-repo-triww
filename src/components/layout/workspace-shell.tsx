"use client";

import React, { useState, useEffect } from "react";
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("pm-theme") || "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("pm-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const navItems = [
    { label: "Projects", href: "/projects", icon: "📊" },
    { label: "CRM", href: "/crm", icon: "🤝" },
    { label: "Vendors", href: "/vendors", icon: "⌘" },
  ];

  return (
    <div className="pm-app">
      <aside className={`pm-sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <button 
          className="pm-sidebar-toggle" 
          onClick={(e) => {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <span style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>
            ←
          </span>
        </button>
        <div className="pm-logo">J</div>
        <div className="pm-sidebar-group">
          <p className="pm-sidebar-label">JUARA Workspace</p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`pm-sidebar-item ${pathname.startsWith(item.href) ? "active" : ""}`}
            >
              <span style={{ marginRight: "12px", minWidth: "18px", transition: 'margin-right 0.2s' }}>
                {item.icon}
              </span>
              <span className="label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: "1px solid var(--line)", display: isCollapsed ? "none" : "flex", gap: "8px", flexDirection: "column" }}>
          <p className="pm-sidebar-label" style={{ marginBottom: "4px" }}>Theme</p>
          <div style={{ display: "flex", gap: "4px" }}>
            <button 
              onClick={() => handleThemeChange("dark")}
              className={`chip ${theme === "dark" ? "active" : ""}`}
              style={{ padding: "4px 8px", fontSize: "11px", minHeight: "24px", flex: 1 }}
            >
              Dark
            </button>
            <button 
              onClick={() => handleThemeChange("monday")}
              className={`chip ${theme === "monday" ? "active" : ""}`}
              style={{ padding: "4px 8px", fontSize: "11px", minHeight: "24px", flex: 1 }}
            >
              Monday
            </button>
          </div>
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
