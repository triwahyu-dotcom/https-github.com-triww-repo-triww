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
  Home,
  Menu,
  X,
  Grid,
  Settings
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
  const [userRole, setUserRole] = useState<string>("member");
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedTheme = "dark"; // Default to dark
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Get role from cookie
    const cookies = document.cookie.split(';');
    const roleCookie = cookies.find(c => c.trim().startsWith('juara_user_role='));
    if (roleCookie) {
      setUserRole(roleCookie.split('=')[1]);
    } else {
      // Fallback to localStorage if cookie not found
      setUserRole(localStorage.getItem("pm-role") || "member");
    }
  }, []);

  const [permissions, setPermissions] = useState<any>(null);

  useEffect(() => {
    // Fetch user permissions on mount
    fetch("/api/settings/my-permissions")
      .then(res => res.json())
      .then(data => {
        if (data.permissions) {
          setPermissions(data.permissions);
        }
      })
      .catch(err => console.error("Error fetching permissions:", err));
  }, []);

  const navItems = [
    { label: "Workspace Hub", href: "/", icon: <Home size={18} /> },
    { label: "Projects", href: "/projects", icon: <LayoutDashboard size={18} /> },
    { label: "CRM", href: "/crm", icon: <Users size={18} /> },
    { label: "Vendors", href: "/vendors", icon: <Building2 size={18} /> },
    { label: "Man Power", href: "/manpower/freelancer", icon: <HardHat size={18} /> },
    { label: "Finance & RFP", href: "/finance", icon: <Receipt size={18} /> },
    { label: "Document Center", href: "/docs", icon: <FolderSearch size={18} /> },
    { label: "System Settings", href: "/settings", icon: <Settings size={18} /> },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!permissions) return true; // Show all until loaded
    
    if (item.href === "/") return true;
    if (item.href === "/projects") return permissions.projects?.view !== false;
    if (item.href === "/crm") return permissions.crm?.view !== false;
    if (item.href === "/vendors") return permissions.vendors?.view !== false;
    if (item.href === "/manpower/freelancer") return permissions.manpower?.view !== false;
    if (item.href === "/finance") return permissions.finance?.view !== false;
    if (item.href === "/docs") return permissions.docs?.view !== false;
    
    if (item.href === "/settings") {
      const cleanRole = userRole.toLowerCase().trim();
      return cleanRole === "admin" || cleanRole === "director";
    }
    
    return true;
  });

  return (
    <div className="pm-app">
      {/* Mobile Sidebar Overlay/Scrim */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 190,
            animation: 'fadeIn 0.2s ease-out'
          }}
        />
      )}

      <aside className={`pm-sidebar ${isCollapsed ? "collapsed" : ""} ${isSidebarOpen ? "mobile-open" : ""}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div className="pm-logo">J</div>
          {isMobile && (
            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', padding: '8px' }}>
              <X size={20} />
            </button>
          )}
        </div>
        
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
 
         <div className="pm-sidebar-group">
           <p className="pm-sidebar-label">JUARA Workspace</p>
           {filteredNavItems.map((item) => (
             <Link
               key={item.href}
               href={item.href}
               className={`pm-sidebar-item ${pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "active" : ""}`}
               onClick={() => isMobile && setIsSidebarOpen(false)}
             >
               <span style={{ marginRight: "12px", minWidth: "18px", transition: 'margin-right 0.2s' }}>
                 {item.icon}
               </span>
               <span className="label" suppressHydrationWarning>{item.label}</span>
             </Link>
           ))}
         </div>

        <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: "1px solid var(--line)", display: (isCollapsed && !isMobile) ? "none" : "flex", gap: "8px", flexDirection: "column" }}>
          <p className="pm-sidebar-label" style={{ marginBottom: "4px" }}>Active Identity</p>
          <div style={{ padding: '8px', background: 'rgba(55, 138, 221, 0.1)', border: '1px solid rgba(55, 138, 221, 0.2)', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#378ADD', textTransform: 'capitalize' }}>{userRole}</div>
            <div style={{ fontSize: '10px', color: '#378ADD', marginTop: '2px', fontWeight: 700 }}>RBAC ACTIVE</div>
          </div>

          {userRole === "admin" && (
            <select 
              className="chip" 
              style={{ width: '100%', background: 'var(--panel-soft)', color: 'var(--text)', border: '1px solid var(--line)', padding: '6px', fontSize: '10px', outline: 'none', marginTop: '8px' }}
              onChange={(e) => {
                document.cookie = `juara_user_role=${e.target.value}; path=/`;
                const roleEmailMap: Record<string, string> = {
                  admin: "admin@juara.local",
                  director: "ekamarutha@juaraevent.id",
                  finance: "finance@juaraevent.id",
                  procurement: "procurement@juaraevent.id",
                  pm: "ubaid@juaraevent.id",
                  hcga: "hcga@juaraevent.id",
                  member: "member@juaraevent.id",
                  creative_head: "creativehead@juaraevent.id",
                  creative_jr: "creativejr@juaraevent.id",
                  designer: "designer@juaraevent.id"
                };
                document.cookie = `juara_user_email=${roleEmailMap[e.target.value] || "member@juaraevent.id"}; path=/`;
                window.location.reload();
              }}
              value={userRole}
            >
              <option value="admin">Super Admin</option>
              <option value="procurement">Procurement Division</option>
              <option value="hcga">HCGA (Human Capital)</option>
              <option value="pm">Project Manager</option>
              <option value="finance">Finance Admin</option>
              <option value="director">Director (C-Level)</option>
              <option value="creative_head">Head of Creative</option>
              <option value="creative_jr">Junior Creative</option>
              <option value="designer">Designer</option>
              <option value="member">General Member</option>
            </select>
          )}
        </div>
      </aside>

      <section className="pm-main">
        <header className="pm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                style={{ background: 'var(--panel-soft)', border: '1px solid var(--line)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}
              >
                <Menu size={20} />
              </button>
            )}
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h1>{title}</h1>
            </div>
          </div>
          <div className="workspace-actions">
            {actions}
          </div>
        </header>
        
        <div className="pm-content">
          {children}
        </div>
      </section>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="pm-bottom-nav">
          <Link href="/projects" className={`nav-item ${pathname.startsWith('/projects') ? 'active' : ''}`}>
            <Grid size={20} />
            <span>Projects</span>
          </Link>
          <Link href="/crm" className={`nav-item ${pathname.startsWith('/crm') ? 'active' : ''}`}>
            <Users size={20} />
            <span>CRM</span>
          </Link>
          <Link href="/vendors" className={`nav-item ${pathname.startsWith('/vendors') ? 'active' : ''}`}>
            <Building2 size={20} />
            <span>Vendors</span>
          </Link>
          <Link href="/finance" className={`nav-item ${pathname.startsWith('/finance') ? 'active' : ''}`}>
            <Receipt size={20} />
            <span>Finance</span>
          </Link>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 1024px) {
          .pm-app {
            flex-direction: column;
          }

          .pm-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px !important;
            z-index: 200;
            background: var(--bg) !important;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-right: 1px solid var(--line);
          }

          .pm-sidebar.mobile-open {
            transform: translateX(0);
          }

          .pm-sidebar-toggle {
            display: none !important;
          }

          .pm-main {
            margin-left: 0 !important;
            width: 100% !important;
            padding-bottom: 80px !important;
          }

          .pm-topbar {
            padding: 12px 16px !important;
          }

          .pm-topbar h1 {
            font-size: 18px !important;
          }

          .workspace-actions {
            display: none !important;
          }

          .pm-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: var(--bg);
            border-top: 1px solid var(--line);
            display: flex;
            justify-content: space-around;
            align-items: center;
            z-index: 150;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .pm-bottom-nav .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: var(--text-dim);
            text-decoration: none;
            font-size: 10px;
            font-weight: 500;
            flex: 1;
          }

          .pm-bottom-nav .nav-item.active {
            color: var(--primary);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>

  );
}
