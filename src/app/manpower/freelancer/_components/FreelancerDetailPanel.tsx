"use client";

import React from "react";
import { Freelancer } from "../_types/freelancer";
import { X, Phone, Mail, AlertTriangle, ExternalLink, Edit2, UserPlus } from "lucide-react";
import { getRateTertinggi } from "../_utils/helpers";

interface FreelancerDetailPanelProps {
  freelancer: Freelancer | null;
  onClose: () => void;
  onEdit: (f: Freelancer) => void;
  onAssign: (f: Freelancer) => void;
}

export const FreelancerDetailPanel: React.FC<FreelancerDetailPanelProps> = ({
  freelancer,
  onClose,
  onEdit,
  onAssign
}) => {
  if (!freelancer) return null;

  const isIncomplete = !freelancer.no_hp || !freelancer.rekening_bank || !freelancer.foto_url;
  const rate = getRateTertinggi(freelancer.rate_estimate);

  const getPosisiStyles = (posisi: string) => {
    switch (posisi) {
      case "Project Manager": return { bg: "rgba(83,74,183,0.2)", color: "#AFA9EC" };
      case "Project Officer": return { bg: "rgba(83,74,183,0.15)", color: "#AFA9EC" };
      case "Production Head": return { bg: "rgba(15,110,86,0.2)", color: "#5DCAA5" };
      case "Production": case "Produksi": return { bg: "rgba(15,110,86,0.15)", color: "#5DCAA5" };
      case "Logistic Head": return { bg: "rgba(180,115,23,0.2)", color: "#EF9F27" };
      case "Logistik Team": case "Logistik": return { bg: "rgba(180,115,23,0.15)", color: "#EF9F27" };
      case "Aksi & Runner": return { bg: "rgba(55,138,221,0.2)", color: "#85B7EB" };
      case "Stage Man": return { bg: "rgba(55,138,221,0.15)", color: "#85B7EB" };
      case "Floor Crew": case "Crowd Control": return { bg: "rgba(212,83,126,0.15)", color: "#ED93B1" };
      case "Parkir": return { bg: "rgba(136,135,128,0.15)", color: "#B4B2A9" };
      default: return { bg: "rgba(255,255,255,0.05)", color: "#71717a" };
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "aktif": return { bg: "rgba(99,153,34,0.15)", color: "#97C459", label: "Aktif" };
      case "new": return { bg: "rgba(55,138,221,0.15)", color: "#85B7EB", label: "Pendaftar Baru" };
      case "tidak_aktif": return { bg: "rgba(255,255,255,0.06)", color: "#71717a", label: "Tidak Aktif" };
      case "blacklist": return { bg: "rgba(226,75,74,0.15)", color: "#F09595", label: "Blacklist" };
      case "on_event": return { bg: "rgba(239,159,39,0.15)", color: "#EF9F27", label: "On Event" };
      default: return { bg: "rgba(255,255,255,0.05)", color: "#71717a", label: status };
    }
  };

  const posStyles = getPosisiStyles(freelancer.posisi_utama[0]);
  const statStyles = getStatusStyles(freelancer.status);

  return (
    <aside className="detail-panel-premium">
      <div style={{ padding: '20px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, letterSpacing: '0.08em' }}>DETAIL FREELANCER</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}><X size={18} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#f4f4f5', margin: '0 0 10px 0' }}>{freelancer.nama || (freelancer as any).name || "Tanpa Nama"}</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="posisi-pill" style={{ background: posStyles.bg, color: posStyles.color }}>
              {freelancer.posisi_utama[0]}
            </span>
            <span className="status-badge-pill" style={{ background: statStyles.bg, color: statStyles.color }}>
              {statStyles.label}
            </span>
          </div>
        </div>

        {isIncomplete && (
          <div className="warning-legend-bar" style={{ marginBottom: '24px', marginInline: 0 }}>
            <AlertTriangle size={14} color="#EF9F27" />
            <span style={{ fontSize: '11px', color: '#EF9F27' }}>Profil belum lengkap (no HP / bank / foto)</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>KOTA DOMISILI</div>
            <div style={{ fontSize: '13px', color: freelancer.kota_domisili === "—" ? "#3f3f46" : "#e4e4e7" }}>{freelancer.kota_domisili}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>NO. HP</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '13px', color: !freelancer.no_hp ? "#3f3f46" : "#e4e4e7", fontFamily: 'monospace' }}>{freelancer.no_hp || "–"}</div>
              {freelancer.no_hp && <button className="action-btn-premium"><Phone size={12} /></button>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>REKENING BANK</div>
            <div style={{ fontSize: '13px', color: !freelancer.rekening_bank ? "#3f3f46" : "#e4e4e7" }}>
              {freelancer.rekening_bank ? `${freelancer.rekening_bank.nama_bank} - ${freelancer.rekening_bank.no_rekening}` : "Belum ada"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>RATE TERTINGGI</div>
            <div style={{ fontSize: '13px', color: !rate ? "#3f3f46" : "#e4e4e7" }}>
              {rate ? `Rp ${rate.toLocaleString()}` : "Belum diisi"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '4px' }}>RATING</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {freelancer.rating_avg ? (
                <>
                  <div style={{ fontSize: '13px', color: '#97C459' }}>{freelancer.rating_avg.toFixed(1)}</div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="star-dot" style={{ background: i <= (freelancer.rating_avg || 0) ? '#97C459' : 'rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                </>
              ) : "Belum dinilai"}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, letterSpacing: '0.06em', marginBottom: '16px' }}>EVENT HISTORY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {freelancer.assignment_history.length > 0 ? (
              freelancer.assignment_history.map(event => (
                <div key={event.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#e4e4e7', fontWeight: 500 }}>{event.nama_event}</span>
                    <span style={{ fontSize: '11px', color: '#52525b' }}>{event.tanggal_mulai.split('-')[0] || "2025"}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#52525b' }}>{event.posisi_di_event}</div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '12px', color: '#3f3f46', fontStyle: 'italic' }}>Belum ada riwayat event</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={() => onAssign(freelancer)}
          style={{ width: '100%', background: '#378ADD', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <UserPlus size={16} /> Assign ke Project
        </button>
        <button 
          onClick={() => onEdit(freelancer)}
          className="back-btn-premium"
          style={{ width: '100%', justifyContent: 'center', padding: '10px', background: 'transparent' }}
        >
          <Edit2 size={16} /> Edit Profile
        </button>
      </div>
    </aside>
  );
};
