import React from "react";
import { 
  X, 
  MapPin, 
  AlertTriangle, 
  Star, 
  ExternalLink,
  UserPlus,
  Clipboard,
  Check,
  Copy
} from "lucide-react";
import { Freelancer } from "../_types/freelancer";
import { PosisiBadge } from "./PosisiBadge";
import { StatusBadge } from "./StatusBadge";
import { formatHP, formatRupiah } from "../_utils/helpers";

interface FreelancerDetailPanelProps {
  freelancer: Freelancer | null;
  onClose: () => void;
  onEdit: (freelancer: Freelancer) => void;
  onAssign: (freelancer: Freelancer) => void;
}

export const FreelancerDetailPanel: React.FC<FreelancerDetailPanelProps> = ({
  freelancer,
  onClose,
  onEdit,
  onAssign
}) => {
  if (!freelancer) return null;

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-content">
          <button className="close-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}><X size={20} /></button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'var(--accent-purple)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              {freelancer.nama.charAt(0)}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{freelancer.nama}</h2>
              <div style={{ marginTop: '4px' }}>
                <StatusBadge status={freelancer.status} />
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
              {freelancer.posisi_utama.map((p, i) => <PosisiBadge key={i} posisi={p} />)}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} /> {freelancer.kota_domisili}
            </p>
          </div>

          <div className="divider" style={{ borderTop: '1px solid var(--border)' }} />

          <section>
            <h3 className="filter-label" style={{ marginBottom: '12px' }}>Info Kontak</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>No. HP</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {formatHP(freelancer.no_hp)} 
                <button className="reset-btn" style={{ padding: '2px 6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => navigator.clipboard.writeText(freelancer.no_hp)}>
                  <Copy size={10} /> Copy
                </button>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>KTP</span>
              <span>{freelancer.nomor_ktp || <span style={{ color: 'var(--text-muted)' }}>Belum diisi</span>}</span>
            </div>
          </section>

          <section>
            <h3 className="filter-label" style={{ marginBottom: '12px' }}>Rekening Bank</h3>
            {freelancer.rekening_bank ? (
              <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>{freelancer.rekening_bank.nama_bank}</p>
                <p style={{ margin: '4px 0', fontSize: '1rem', color: 'var(--accent-blue)', letterSpacing: '0.05em' }}>
                  {freelancer.rekening_bank.no_rekening}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>a.n. {freelancer.rekening_bank.nama_pemilik}</p>
              </div>
            ) : (
              <div className="warning-banner" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: '600' }}>Rekening belum diisi</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', opacity: 0.8 }}>Wajib diisi sebelum PO dibuat.</p>
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="filter-label" style={{ marginBottom: '12px' }}>Rate Per Posisi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(freelancer.rate_estimate).map(([pos, rate]) => (
                <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{pos}</span>
                  <span style={{ fontWeight: '600' }}>{formatRupiah(rate as number)}</span>
                </div>
              ))}
              {Object.keys(freelancer.rate_estimate).length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Belum ada rate estimasi.</p>
              )}
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-card)', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem' }}>TOTAL EVENT</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: '700' }}>{freelancer.total_event}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem' }}>AVG RATING</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: '700', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <Star size={12} /> {freelancer.rating_avg || "—"}
              </p>
            </div>
          </div>

          <section>
            <h3 className="filter-label" style={{ marginBottom: '12px' }}>History Event</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {freelancer.assignment_history.length > 0 ? (
                [...freelancer.assignment_history].sort((a,b) => new Date(b.tanggal_mulai).getTime() - new Date(a.tanggal_mulai).getTime()).map((h) => (
                  <div key={h.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{h.nama_event}</span>
                      <PosisiBadge posisi={h.posisi_di_event} />
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {h.tanggal_mulai} – {h.tanggal_selesai}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.8rem' }}>{h.rate_aktual ? formatRupiah(h.rate_aktual) : "—"}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {h.rating_pm ? <><Star size={10} /> {h.rating_pm}</> : "Belum dirating"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Belum ada riwayat event.</p>
              )}
            </div>
          </section>

          <div style={{ 
            marginTop: 'auto', 
            padding: '24px', 
            background: 'var(--bg-secondary)', 
            borderTop: '1px solid var(--border)', 
            display: 'flex', 
            gap: '12px',
            position: 'sticky',
            bottom: 0,
            margin: '0 -24px -24px -24px'
          }}>
            <button className="primary-btn" style={{ flex: 1 }} onClick={() => onEdit(freelancer)}>Edit Profil</button>
            <button className="reset-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => onAssign(freelancer)}>
              Assign ke Project <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
