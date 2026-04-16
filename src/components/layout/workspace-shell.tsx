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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("pm-theme") || "dark";
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
    { label: "Finance & RFP", href: "/finance", icon: "💳" },
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
               className={`pm-sidebar-item ${pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "active" : ""}`}
             >
               <span style={{ marginRight: "12px", minWidth: "18px", transition: 'margin-right 0.2s' }}>
                 {item.icon}
               </span>
               <span className="label" suppressHydrationWarning>{item.label}</span>
             </Link>
           ))}
         </div>

        <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: "1px solid var(--line)", display: isCollapsed ? "none" : "flex", gap: "8px", flexDirection: "column" }}>
          <p className="pm-sidebar-label" style={{ marginBottom: "4px" }}>Active Identity</p>
          <select 
            className="chip" 
            style={{ width: '100%', background: 'var(--panel-soft)', color: 'var(--text)', border: '1px solid var(--line)', padding: '6px', fontSize: '11px', outline: 'none' }}
            onChange={(e) => {
              localStorage.setItem("pm-role", e.target.value);
              window.location.reload();
            }}
            defaultValue={typeof window !== 'undefined' ? localStorage.getItem("pm-role") || "pm" : "pm"}
          >
            <option value="procurement">Procurement Division (PO Maker)</option>
            <option value="pm">Project Manager (Viewer)</option>
            <option value="finance">Finance Admin</option>
            <option value="director">Director (C-Level)</option>
          </select>

          <p className="pm-sidebar-label" style={{ marginBottom: "4px", marginTop: "12px" }}>Theme</p>
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
