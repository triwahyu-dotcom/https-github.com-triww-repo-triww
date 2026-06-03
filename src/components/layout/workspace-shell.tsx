"use client";

import React, { useState, useEffect } from "react";
import { CommandPaletteProvider } from "@/hooks/useCommandPalette";
import { IconRail } from "@/components/nav/IconRail";
import { TopMicroBar } from "@/components/nav/TopMicroBar";
import { CommandPalette } from "@/components/nav/CommandPalette";

interface WorkspaceShellProps {
  children: React.ReactNode;
  title?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

function WorkspaceShellInner({
  children,
  title,
  eyebrow,
  actions,
}: WorkspaceShellProps) {
  const [userRole, setUserRole] = useState<string>("member");
  const [permissions, setPermissions] = useState<any>(null);
  const [canOverride, setCanOverride] = useState<boolean>(false);
  const [adminViewRole, setAdminViewRole] = useState<string>("finance");

  useEffect(() => {
    // Set dark theme
    document.documentElement.setAttribute("data-theme", "dark");

    // Get role from cookie
    const cookies = document.cookie.split(";");
    const roleCookie = cookies.find((c) => c.trim().startsWith("juara_user_role="));
    if (roleCookie) {
      setUserRole(roleCookie.split("=")[1].trim());
    } else {
      setUserRole(localStorage.getItem("pm-role") || "member");
    }

    // Restore finance override role
    const savedAdminRole = localStorage.getItem("juara_finance_admin_role");
    if (savedAdminRole) setAdminViewRole(savedAdminRole);

    // Fetch permissions
    fetch("/api/settings/my-permissions")
      .then((res) => res.json())
      .then((data) => {
        if (data.permissions) {
          setPermissions(data.permissions);
          const primaryRole = (data.role || "").toLowerCase().trim();
          const overrideAllowed =
            data.permissions.finance?.approve === true ||
            primaryRole === "admin" ||
            primaryRole === "director";
          setCanOverride(overrideAllowed);
        }
      })
      .catch((err) => console.error("Error fetching permissions:", err));
  }, []);

  const handleAdminViewRoleChange = (role: string) => {
    setAdminViewRole(role);
    localStorage.setItem("juara_finance_admin_role", role);
    // Dispatch a custom event so finance portal-router can listen
    window.dispatchEvent(
      new CustomEvent("juara_finance_role_change", { detail: { role } })
    );
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* 48px Icon Rail */}
      <IconRail userRole={userRole} permissions={permissions} />

      {/* Main area: top micro-bar + page content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <TopMicroBar
          userRole={userRole}
          canOverride={canOverride}
          adminViewRole={adminViewRole}
          onAdminViewRoleChange={handleAdminViewRoleChange}
        />

        {/* Page header (title/eyebrow/actions) — only if provided */}
        {(title || eyebrow || actions) && (
          <div
            className="pm-topbar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 28px",
              borderBottom: "1px solid var(--line)",
              flexShrink: 0,
              flexWrap: "wrap",
              gap: "12px 16px",
            }}
          >
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              {title && <h1 style={{ margin: 0 }}>{title}</h1>}
            </div>
            {actions && <div className="workspace-actions">{actions}</div>}
          </div>
        )}

        {/* Page content */}
        <main
          className="pm-content"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
          }}
        >
          {children}
        </main>
      </div>

      {/* Command palette — portal rendered */}
      <CommandPalette />
    </div>
  );
}

export function WorkspaceShell(props: WorkspaceShellProps) {
  return (
    <CommandPaletteProvider>
      <WorkspaceShellInner {...props} />
    </CommandPaletteProvider>
  );
}
