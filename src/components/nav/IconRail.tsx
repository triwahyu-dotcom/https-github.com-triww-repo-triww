"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  Home,
  LayoutDashboard,
  Users,
  Building2,
  HardHat,
  Receipt,
  FolderSearch,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "workspace",  label: "Workspace Hub",   href: "/",                    icon: <Home size={20} /> },
  { key: "projects",   label: "Projects",         href: "/projects",            icon: <LayoutDashboard size={20} /> },
  { key: "crm",        label: "CRM",              href: "/crm",                 icon: <Users size={20} /> },
  { key: "vendors",    label: "Vendors",           href: "/vendors",             icon: <Building2 size={20} /> },
  { key: "manpower",   label: "Man Power",         href: "/manpower/freelancer", icon: <HardHat size={20} /> },
  { key: "finance",    label: "Finance & RFP",     href: "/finance",             icon: <Receipt size={20} /> },
  { key: "documents",  label: "Document Center",   href: "/docs",                icon: <FolderSearch size={20} /> },
  { key: "settings",   label: "System Settings",   href: "/settings",            icon: <Settings size={20} /> },
];

const ROLE_EMAIL_MAP: Record<string, string> = {
  admin: "admin@juara.local",
  director: "ekamarutha@juaraevent.id",
  finance: "finance@juaraevent.id",
  procurement: "procurement@juaraevent.id",
  pm: "ubaid@juaraevent.id",
  hcga: "hcga@juaraevent.id",
  member: "member@juaraevent.id",
  creative_head: "creativehead@juaraevent.id",
  creative_jr: "creativejr@juaraevent.id",
  designer: "designer@juaraevent.id",
};

function RailItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Tooltip content={item.label} side="right">
      <Link
        href={item.href}
        aria-label={item.label}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 10,
          margin: "2px auto",
          color: isActive ? "#E6863C" : "#8B949E",
          background: isActive ? "rgba(230,134,60,0.12)" : "transparent",
          border: isActive ? "1px solid rgba(230,134,60,0.25)" : "1px solid transparent",
          transition: "all 0.15s ease",
          textDecoration: "none",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            const el = e.currentTarget;
            el.style.background = "rgba(139,148,158,0.1)";
            el.style.color = "#C9D1D9";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            const el = e.currentTarget;
            el.style.background = "transparent";
            el.style.color = "#8B949E";
          }
        }}
      >
        {item.icon}
      </Link>
    </Tooltip>
  );
}

function UserAvatarButton({
  userRole,
  permissions,
}: {
  userRole: string;
  permissions: any;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target)) {
        const popoverEl = document.getElementById("user-avatar-popover");
        if (!popoverEl?.contains(target)) setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopoverCoords({
        top: rect.top,
        left: rect.right + 10,
      });
    }
    setPopoverOpen((p) => !p);
  };

  const handleLogout = async () => {
    document.cookie = "juara_user_role=; path=/; max-age=0";
    document.cookie = "juara_user_email=; path=/; max-age=0";
    router.push("/login");
  };

  const initials = userRole ? userRole.slice(0, 2).toUpperCase() : "??";

  return (
    <>
      <Tooltip content="Akun & Logout" side="right">
        <button
          ref={btnRef}
          onClick={handleOpen}
          aria-label="User menu"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: popoverOpen ? "#E6863C" : "rgba(230,134,60,0.2)",
            border: "2px solid rgba(230,134,60,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#E6863C",
            marginBottom: 8,
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
        >
          {popoverOpen ? (
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{initials}</span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700 }}>{initials}</span>
          )}
        </button>
      </Tooltip>

      {mounted && popoverOpen &&
        createPortal(
          <div
            id="user-avatar-popover"
            style={{
              position: "fixed",
              top: popoverCoords.top,
              left: popoverCoords.left,
              width: 220,
              background: "#161B22",
              border: "1px solid #30363D",
              borderRadius: 10,
              zIndex: 99999,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #30363D" }}>
              <div style={{ fontSize: 11, color: "#8B949E", marginBottom: 4 }}>Aktif sebagai</div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(88,166,255,0.1)",
                border: "1px solid rgba(88,166,255,0.25)",
                borderRadius: 4,
                padding: "2px 8px",
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#58A6FF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {userRole}
                </span>
              </div>
            </div>

            {/* Role override — admin only */}
            {userRole === "admin" && (
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #30363D" }}>
                <div style={{ fontSize: 10, color: "#8B949E", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  Simulasi Role
                </div>
                <select
                  onChange={(e) => {
                    document.cookie = `juara_user_role=${e.target.value}; path=/`;
                    document.cookie = `juara_user_email=${ROLE_EMAIL_MAP[e.target.value] || "member@juaraevent.id"}; path=/`;
                    window.location.reload();
                  }}
                  value={userRole}
                  style={{
                    width: "100%",
                    background: "#0D1117",
                    color: "#C9D1D9",
                    border: "1px solid #30363D",
                    borderRadius: 6,
                    padding: "5px 8px",
                    fontSize: 11,
                    outline: "none",
                    cursor: "pointer",
                  }}
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
              </div>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#F85149",
                fontSize: 12,
                fontWeight: 500,
                textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,81,73,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>,
          document.body
        )
      }
    </>
  );
}

export function IconRail({
  userRole,
  permissions,
}: {
  userRole: string;
  permissions: any;
}) {
  const pathname = usePathname();

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (!permissions) return true;
    if (item.key === "workspace") return true;
    if (item.key === "projects") return permissions.projects?.view !== false;
    if (item.key === "crm") return permissions.crm?.view !== false;
    if (item.key === "vendors") return permissions.vendors?.view !== false;
    if (item.key === "manpower") return permissions.manpower?.view !== false;
    if (item.key === "finance") return permissions.finance?.view !== false;
    if (item.key === "documents") return permissions.docs?.view !== false;
    if (item.key === "settings") {
      const cleanRole = (userRole || "").toLowerCase().trim();
      return cleanRole === "admin" || cleanRole === "director";
    }
    return true;
  });

  const isActive = (item: NavItem) => {
    if (item.key === "workspace") return pathname === "/";
    return pathname.startsWith(item.href);
  };

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: 48,
        flexShrink: 0,
        height: "100vh",
        background: "#161B22",
        borderRight: "1px solid #30363D",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 8,
        overflowY: "hidden",
        overflowX: "hidden",
        position: "relative",
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 32,
          height: 32,
          background: "linear-gradient(135deg, #E6863C 0%, #C4682A 100%)",
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 800,
          color: "white",
          marginBottom: 14,
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(230,134,60,0.4)",
          letterSpacing: "-0.5px",
        }}
      >
        J
      </div>

      {/* Divider */}
      <div style={{ width: 24, height: 1, background: "#30363D", marginBottom: 6, flexShrink: 0 }} />

      {/* Nav items */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          alignItems: "center",
          gap: 0,
          overflowY: "auto",
          scrollbarWidth: "none",
          paddingTop: 4,
        }}
      >
        {filteredNavItems.map((item) => (
          <RailItem key={item.key} item={item} isActive={isActive(item)} />
        ))}
      </div>

      {/* Bottom: user avatar */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 24, height: 1, background: "#30363D", marginBottom: 10 }} />
        <UserAvatarButton userRole={userRole} permissions={permissions} />
      </div>
    </nav>
  );
}
