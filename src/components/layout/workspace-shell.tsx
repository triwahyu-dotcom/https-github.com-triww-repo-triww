"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  HardHat, 
  Receipt,
  ChevronLeft,
  ChevronRight,
  FolderSearch,
  Home
} from "lucide-react";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = "dark"; // Default to dark
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const navItems = [
    { label: "Workspace Hub", href: "/", icon: <Home size={18} /> },
    { label: "Projects", href: "/projects", icon: <LayoutDashboard size={18} /> },
    { label: "CRM", href: "/crm", icon: <Users size={18} /> },
    { label: "Vendors", href: "/vendors", icon: <Building2 size={18} /> },
    { label: "Man Power", href: "/manpower/freelancer", icon: <HardHat size={18} /> },
    { label: "Finance & RFP", href: "/finance", icon: <Receipt size={18} /> },
    { label: "Document Center", href: "/docs", icon: <FolderSearch size={18} /> },
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
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
