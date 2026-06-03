"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Settings, 
  Trash2, 
  Edit3, 
  Lock, 
  Unlock, 
  Shield, 
  Check, 
  X, 
  Eye, 
  Database,
  Building,
  Briefcase,
  FileText,
  DollarSign
} from "lucide-react";
import { UserPermissionMatrix, DEFAULT_ROLE_PERMISSIONS } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  password?: string;
  is_active: boolean;
  permissions: UserPermissionMatrix;
  created_at?: string;
}

export default function SettingsClient() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  
  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("member");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPermissions, setFormPermissions] = useState<UserPermissionMatrix>(
    DEFAULT_ROLE_PERMISSIONS.member
  );

  // Active identity details
  const [myEmail, setMyEmail] = useState("");

  useEffect(() => {
    // Get logged in user's email from cookie
    const cookies = document.cookie.split(';');
    const emailCookie = cookies.find(c => c.trim().startsWith('juara_user_email='));
    if (emailCookie) {
      setMyEmail(emailCookie.split('=')[1].toLowerCase().trim());
    }

    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/settings/team");
      if (!res.ok) {
        throw new Error("Gagal mengambil data tim.");
      }
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("member");
    setFormIsActive(true);
    setFormPermissions(JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS.member)));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPassword(member.password || "");
    setFormRole(member.role);
    setFormIsActive(member.is_active);
    setFormPermissions(JSON.parse(JSON.stringify(member.permissions)));
    setIsModalOpen(true);
  };

  const handleRoleChange = (role: string) => {
    setFormRole(role);
    const defaults = DEFAULT_ROLE_PERMISSIONS[role.toLowerCase()] || DEFAULT_ROLE_PERMISSIONS.member;
    setFormPermissions(JSON.parse(JSON.stringify(defaults)));
  };

  const handleTogglePermission = (
    module: keyof UserPermissionMatrix,
    action: string,
    value: any
  ) => {
    setFormPermissions((prev) => {
      const updated = { ...prev };
      if (module === "finance") {
        if (action === "role") {
          updated.finance = { ...updated.finance, role: value as any };
        } else {
          updated.finance = { ...updated.finance, [action]: value };
        }
      } else if (module === "projects") {
        updated.projects = { ...updated.projects, [action]: value };
      } else if (module === "crm") {
        updated.crm = { ...updated.crm, [action]: value };
      } else if (module === "vendors") {
        updated.vendors = { ...updated.vendors, [action]: value };
      } else if (module === "manpower") {
        updated.manpower = { ...updated.manpower, [action]: value };
      } else if (module === "docs") {
        updated.docs = { ...updated.docs, [action]: value };
      }
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      alert("Nama dan Email wajib diisi.");
      return;
    }

    try {
      const isEdit = !!editingMember;
      const url = "/api/settings/team";
      const method = isEdit ? "PUT" : "POST";
      
      const payload = {
        id: isEdit ? editingMember.id : undefined,
        name: formName,
        email: formEmail,
        password: formPassword || undefined,
        role: formRole,
        is_active: formIsActive,
        permissions: formPermissions
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gagal menyimpan perubahan.");
      }

      setIsModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan.");
    }
  };

  const handleDelete = async (member: TeamMember) => {
    if (member.email.toLowerCase().trim() === myEmail) {
      alert("Anda tidak bisa menghapus akun Anda sendiri.");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus "${member.name}" dari tim?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/settings/team?id=${member.id}`, {
        method: "DELETE"
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gagal menghapus anggota tim.");
      }

      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan.");
    }
  };

  const handleToggleActiveStatus = async (member: TeamMember) => {
    if (member.email.toLowerCase().trim() === myEmail) {
      alert("Anda tidak bisa menonaktifkan akun Anda sendiri.");
      return;
    }

    try {
      const res = await fetch("/api/settings/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          is_active: !member.is_active,
          permissions: member.permissions
        })
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Gagal memperbarui status.");
      }

      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan.");
    }
  };

  // Helper labels
  const roleLabels: Record<string, string> = {
    admin: "Super Admin",
    director: "Director (C-Level)",
    finance: "Finance Admin",
    procurement: "Procurement Division",
    pm: "Project Manager",
    ae: "Account Executive",
    hcga: "HCGA (HR/GA)",
    member: "General Member",
    creative_head: "Head of Creative",
    creative_jr: "Junior Creative",
    designer: "Designer"
  };

  return (
    <div style={{ padding: "8px 0" }}>
      <PageHeader 
        title="System Settings" 
        actions={
          <button 
            className="primary-button" 
            onClick={handleOpenAddModal}
            style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", padding: "10px 16px", background: "var(--accent-primary)", border: "none", color: "white" }}
          >
            <UserPlus size={16} />
            Tambah Anggota
          </button>
        }
      />

      {/* Hero Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <MetricCard 
          label="Total Anggota Tim" 
          value={members.length} 
          icon={<Users size={16} />} 
        />
        <MetricCard 
          label="Akun Aktif" 
          value={members.filter(m => m.is_active).length} 
          icon={<Unlock size={16} />} 
          valueColor="var(--accent-success)"
        />
        <MetricCard 
          label="Akun Dinonaktifkan" 
          value={members.filter(m => !m.is_active).length} 
          icon={<Lock size={16} />} 
          valueColor="var(--accent-danger)"
        />
      </div>

      {/* Main Panel */}
      <div className="panel" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
        {/* Table Header Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.01)" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={18} style={{ color: "#378ADD" }} />
              Daftar Akses Anggota Tim
            </h2>
            <p style={{ fontSize: "11px", color: "var(--text-dim)", margin: "2px 0 0 0" }}>
              Kelola kredensial dan hak akses modular tim internal.
            </p>
          </div>
        </div>

        {/* Loading / Error Callouts */}
        {loading && (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            Memuat data tim dari database...
          </div>
        )}

        {error && (
          <div style={{ padding: "20px", margin: "20px", background: "rgba(235,94,40,0.1)", border: "1px solid rgba(235,94,40,0.2)", borderRadius: "8px", color: "#eb5e28", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* Members Table */}
        {!loading && !error && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--line)", color: "var(--text-dim)", textTransform: "uppercase", fontSize: "10px", fontWeight: 700, letterSpacing: "1px" }}>
                  <th style={{ padding: "12px 20px", textAlign: "left" }}>Nama &amp; Email</th>
                  <th style={{ padding: "12px 20px", textAlign: "left" }}>Role Utama</th>
                  <th style={{ padding: "12px 20px", textAlign: "left" }}>Akses Modul</th>
                  <th style={{ padding: "12px 20px", textAlign: "left" }}>Finance Role</th>
                  <th style={{ padding: "12px 20px", textAlign: "center", width: "100px" }}>Status</th>
                  <th style={{ padding: "12px 20px", textAlign: "center", width: "120px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
                      Belum ada anggota tim terdaftar.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const isSelf = member.email.toLowerCase().trim() === myEmail;
                    
                    return (
                      <tr 
                        key={member.id} 
                        style={{ borderBottom: "1px solid var(--line)", transition: "background 0.2s" }}
                        className="table-row-hover"
                      >
                        {/* Name & Email */}
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
                            {member.name}
                            {isSelf && (
                              <span style={{ fontSize: "9px", background: "rgba(55,138,221,0.15)", color: "#378ADD", border: "1px solid rgba(55,138,221,0.25)", padding: "2px 6px", borderRadius: "10px", fontWeight: 700 }}>
                                ANDA
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "2px" }}>
                            {member.email}
                          </div>
                        </td>

                        {/* Primary Role */}
                        <td style={{ padding: "16px 20px" }}>
                          <span style={{ fontSize: "11px", background: "var(--bg)", border: "1px solid var(--line)", padding: "4px 8px", borderRadius: "6px", fontWeight: 600, color: "var(--text-dim)" }}>
                            {roleLabels[member.role] || member.role}
                          </span>
                        </td>

                        {/* Modul Access Pills */}
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {member.permissions.projects?.view && <span className="badge-pill green">PROJ</span>}
                            {member.permissions.crm?.view && <span className="badge-pill blue">CRM</span>}
                            {member.permissions.vendors?.view && <span className="badge-pill cyan">VEND</span>}
                            {member.permissions.manpower?.view && <span className="badge-pill yellow">MAN</span>}
                            {member.permissions.docs?.view && <span className="badge-pill purple">DOCS</span>}
                            {member.permissions.finance?.view && <span className="badge-pill red">FIN</span>}
                          </div>
                        </td>

                        {/* Finance Role */}
                        <td style={{ padding: "16px 20px" }}>
                          {member.permissions.finance?.view ? (
                            <span style={{ textTransform: "uppercase", fontSize: "10px", fontWeight: 700, color: "#378ADD" }}>
                              {member.permissions.finance?.role || "pm"}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>Terkunci</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td style={{ padding: "16px 20px", textAlign: "center" }}>
                          <button
                            onClick={() => handleToggleActiveStatus(member)}
                            disabled={isSelf}
                            title={isSelf ? "Tidak bisa menonaktifkan diri sendiri" : "Klik untuk toggle status"}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: isSelf ? "not-allowed" : "pointer",
                              padding: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              color: member.is_active ? "var(--green)" : "rgba(255,255,255,0.15)",
                              transition: "color 0.2s"
                            }}
                          >
                            {member.is_active ? (
                              <Unlock size={18} style={{ color: "var(--green)" }} />
                            ) : (
                              <Lock size={18} style={{ color: "#eb5e28" }} />
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "16px 20px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => handleOpenEditModal(member)}
                              style={{ 
                                padding: "6px", 
                                background: "none", 
                                border: "none", 
                                color: "var(--text-muted)", 
                                cursor: "pointer", 
                                borderRadius: "var(--radius-sm)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "color 0.15s"
                              }}
                              className="action-btn-edit-unified"
                              title="Edit Detail &amp; Hak Akses"
                            >
                              <i className="ti ti-edit" style={{ fontSize: "15px" }} />
                            </button>
                            <button
                              onClick={() => handleDelete(member)}
                              disabled={isSelf}
                              style={{ 
                                padding: "6px", 
                                background: "none", 
                                border: "none", 
                                color: "var(--text-muted)", 
                                cursor: isSelf ? "not-allowed" : "pointer", 
                                opacity: isSelf ? 0.35 : 1,
                                borderRadius: "var(--radius-sm)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "color 0.15s"
                              }}
                              className="action-btn-delete-unified"
                              title={isSelf ? "Tidak bisa menghapus diri sendiri" : "Hapus Anggota"}
                            >
                              <i className="ti ti-trash" style={{ fontSize: "15px" }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Member Overlay Modal */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px", overflowY: "auto" }}>
          <div className="panel" style={{ width: "100%", maxWidth: "720px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", animation: "modalOpen 0.2s ease-out" }}>
            
            {/* Modal Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Settings size={18} style={{ color: "#378ADD" }} />
                {editingMember ? "Edit Anggota Tim &amp; Hak Akses" : "Tambah Anggota Tim Baru"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Section 1: User Credentials */}
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#378ADD", textTransform: "uppercase", letterSpacing: "1.5px", margin: "0 0 12px 0" }}>
                    Kredensial Pengguna
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600 }}>
                      Nama Lengkap
                      <input 
                        value={formName} 
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Masukkan nama lengkap"
                        required
                        style={{ padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", outline: "none" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600 }}>
                      Email
                      <input 
                        type="email"
                        value={formEmail} 
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="nama@juaraevent.id"
                        required
                        disabled={!!editingMember}
                        style={{ padding: "8px 12px", background: editingMember ? "rgba(255,255,255,0.02)" : "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px", color: editingMember ? "var(--text-dim)" : "var(--text)", cursor: editingMember ? "not-allowed" : "text", outline: "none" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600 }}>
                      Password {editingMember && <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(kosongkan jika tidak diganti)</span>}
                      <input 
                        type="text"
                        value={formPassword} 
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder={editingMember ? "••••••••" : "Masukkan password plain-text"}
                        required={!editingMember}
                        style={{ padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", outline: "none" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600 }}>
                      Role Utama (Template)
                      <select 
                        value={formRole} 
                        onChange={(e) => handleRoleChange(e.target.value)}
                        style={{ padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--text)", outline: "none", cursor: "pointer" }}
                      >
                        <option value="admin">Super Admin</option>
                        <option value="director">Director (C-Level)</option>
                        <option value="finance">Finance Admin</option>
                        <option value="procurement">Procurement Division</option>
                        <option value="pm">Project Manager</option>
                        <option value="ae">Account Executive</option>
                        <option value="hcga">HCGA (HR/GA)</option>
                        <option value="creative_head">Head of Creative</option>
                        <option value="creative_jr">Junior Creative</option>
                        <option value="designer">Designer</option>
                        <option value="member">General Member</option>
                      </select>
                    </label>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "4px 0" }} />

                {/* Section 2: Custom Permissions Matrix */}
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#378ADD", textTransform: "uppercase", letterSpacing: "1.5px", margin: "0 0 4px 0" }}>
                    Matriks Akses Kustom (Per-User)
                  </h4>
                  <p style={{ fontSize: "11px", color: "var(--text-dim)", margin: "0 0 16px 0" }}>
                    Atur hak akses granular per modul. Mengubah ini akan mengesampingkan setelan role default.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Projects module */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Database size={16} style={{ color: "var(--green)" }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "12px" }}>Modul Projects &amp; Tasks</div>
                          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>Kelola pipeline proyek dan tugas lapangan</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "16px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={formPermissions.projects.view} 
                            onChange={(e) => handleTogglePermission("projects", "view", e.target.checked)}
                          />
                          View
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.projects.view ? 1 : 0.4 }}>
                          <input 
                            type="checkbox" 
                            disabled={!formPermissions.projects.view}
                            checked={formPermissions.projects.create} 
                            onChange={(e) => handleTogglePermission("projects", "create", e.target.checked)}
                          />
                          Create
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.projects.view ? 1 : 0.4 }}>
                          <input 
                            type="checkbox" 
                            disabled={!formPermissions.projects.view}
                            checked={formPermissions.projects.edit} 
                            onChange={(e) => handleTogglePermission("projects", "edit", e.target.checked)}
                          />
                          Edit
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.projects.view ? 1 : 0.4 }}>
                          <input 
                            type="checkbox" 
                            disabled={!formPermissions.projects.view}
                            checked={formPermissions.projects.delete} 
                            onChange={(e) => handleTogglePermission("projects", "delete", e.target.checked)}
                          />
                          Delete
                        </label>
                      </div>
                    </div>

                    {/* CRM module */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Users size={16} style={{ color: "#378ADD" }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "12px" }}>Modul CRM (Klien)</div>
                          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>Kelola portofolio klien dan kontak</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "16px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={formPermissions.crm.view} 
                            onChange={(e) => handleTogglePermission("crm", "view", e.target.checked)}
                          />
                          View
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.crm.view ? 1 : 0.4 }}>
                          <input 
                            type="checkbox" 
                            disabled={!formPermissions.crm.view}
                            checked={formPermissions.crm.edit} 
                            onChange={(e) => handleTogglePermission("crm", "edit", e.target.checked)}
                          />
                          Edit
                        </label>
                      </div>
                    </div>

                    {/* Vendors module */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Building size={16} style={{ color: "#00b4d8" }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "12px" }}>Modul Vendors (VMS)</div>
                          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>Database vendor terdaftar dan rekapitulasi nilai</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "16px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={formPermissions.vendors.view} 
                            onChange={(e) => handleTogglePermission("vendors", "view", e.target.checked)}
                          />
                          View
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.vendors.view ? 1 : 0.4 }}>
                          <input 
                            type="checkbox" 
                            disabled={!formPermissions.vendors.view}
                            checked={formPermissions.vendors.edit} 
                            onChange={(e) => handleTogglePermission("vendors", "edit", e.target.checked)}
                          />
                          Edit
                        </label>
                      </div>
                    </div>

                    {/* Manpower module */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Briefcase size={16} style={{ color: "#ffd166" }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "12px" }}>Modul Man Power (Freelancer)</div>
                          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>Database kru lapangan dan kualifikasi talent</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "16px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={formPermissions.manpower.view} 
                            onChange={(e) => handleTogglePermission("manpower", "view", e.target.checked)}
                          />
                          View
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.manpower.view ? 1 : 0.4 }}>
                          <input 
                            type="checkbox" 
                            disabled={!formPermissions.manpower.view}
                            checked={formPermissions.manpower.edit} 
                            onChange={(e) => handleTogglePermission("manpower", "edit", e.target.checked)}
                          />
                          Edit
                        </label>
                      </div>
                    </div>

                    {/* Document Center module */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FileText size={16} style={{ color: "#7209b7" }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "12px" }}>Modul Document Center</div>
                          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>Akses file, SPK, PO, dan pembaca AI parser</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "16px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={formPermissions.docs.view} 
                            onChange={(e) => handleTogglePermission("docs", "view", e.target.checked)}
                          />
                          View
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.docs.view ? 1 : 0.4 }}>
                          <input 
                            type="checkbox" 
                            disabled={!formPermissions.docs.view}
                            checked={formPermissions.docs.edit} 
                            onChange={(e) => handleTogglePermission("docs", "edit", e.target.checked)}
                          />
                          Edit
                        </label>
                      </div>
                    </div>

                    {/* Finance module */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <DollarSign size={16} style={{ color: "#f72585" }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "12px" }}>Modul Finance &amp; RFP</div>
                            <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>Kelola rekap anggaran rincian proyek</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "16px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer" }}>
                            <input 
                              type="checkbox" 
                              checked={formPermissions.finance.view} 
                              onChange={(e) => handleTogglePermission("finance", "view", e.target.checked)}
                            />
                            View
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.finance.view ? 1 : 0.4 }}>
                            <input 
                              type="checkbox" 
                              disabled={!formPermissions.finance.view}
                              checked={formPermissions.finance.create} 
                              onChange={(e) => handleTogglePermission("finance", "create", e.target.checked)}
                            />
                            Create
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.finance.view ? 1 : 0.4 }}>
                            <input 
                              type="checkbox" 
                              disabled={!formPermissions.finance.view}
                              checked={formPermissions.finance.approve} 
                              onChange={(e) => handleTogglePermission("finance", "approve", e.target.checked)}
                            />
                            Approve
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", cursor: "pointer", opacity: formPermissions.finance.view ? 1 : 0.4 }}>
                            <input 
                              type="checkbox" 
                              disabled={!formPermissions.finance.view}
                              checked={formPermissions.finance.delete} 
                              onChange={(e) => handleTogglePermission("finance", "delete", e.target.checked)}
                            />
                            Delete
                          </label>
                        </div>
                      </div>

                      {formPermissions.finance.view && (
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "8px", marginTop: "4px" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 600 }}>
                            Finance App Sub-Role:
                          </span>
                          <select
                            value={formPermissions.finance.role || "pm"}
                            onChange={(e) => handleTogglePermission("finance", "role", e.target.value)}
                            style={{ padding: "4px 8px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "6px", color: "var(--text)", fontSize: "11px", outline: "none", cursor: "pointer" }}
                          >
                            <option value="pm">Project Manager Dashboard (PM)</option>
                            <option value="finance">Finance Admin (Ops)</option>
                            <option value="procurement">Procurement (Vendor SPK)</option>
                            <option value="director">Director Approvals (C-Level)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Status Toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "10px", marginTop: "4px" }}>
                  <input 
                    type="checkbox" 
                    id="formIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="formIsActive" style={{ fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", gap: "2px" }}>
                    Status Akun Aktif
                    <span style={{ fontWeight: 400, fontSize: "10px", color: "var(--text-dim)" }}>
                      Nonaktifkan jika Anda ingin menangguhkan akses masuk pengguna ke JUARA Workspace.
                    </span>
                  </label>
                </div>

              </div>

              {/* Modal Actions */}
              <div style={{ padding: "16px 20px", borderTop: "1px solid var(--line)", background: "rgba(255,255,255,0.01)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="secondary-button"
                  style={{ fontSize: "12px", padding: "10px 16px" }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="primary-button"
                  style={{ fontSize: "12px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Check size={16} />
                  Simpan Perubahan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Styled JSX */}
      <style jsx global>{`
        .badge-pill {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.5px;
          border: 1px solid transparent;
        }
        .badge-pill.green {
          background: rgba(93, 202, 165, 0.1);
          color: var(--green);
          border-color: rgba(93, 202, 165, 0.15);
        }
        .badge-pill.blue {
          background: rgba(55, 138, 221, 0.1);
          color: #378ADD;
          border-color: rgba(55, 138, 221, 0.15);
        }
        .badge-pill.cyan {
          background: rgba(0, 180, 216, 0.1);
          color: #00b4d8;
          border-color: rgba(0, 180, 216, 0.15);
        }
        .badge-pill.yellow {
          background: rgba(255, 209, 102, 0.1);
          color: #ffd166;
          border-color: rgba(255, 209, 102, 0.15);
        }
        .badge-pill.purple {
          background: rgba(114, 9, 183, 0.1);
          color: #b5179e;
          border-color: rgba(114, 9, 183, 0.15);
        }
        .badge-pill.red {
          background: rgba(247, 37, 133, 0.1);
          color: #f72585;
          border-color: rgba(247, 37, 133, 0.15);
        }

        .table-row-hover:hover {
          background: rgba(255, 255, 255, 0.015) !important;
        }

        .action-btn-hover:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          color: var(--text) !important;
        }

        .action-btn-hover-delete:hover {
          background: rgba(235, 94, 40, 0.1) !important;
          color: #ff4d4d !important;
        }

        @keyframes modalOpen {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
