"use client";

import React, { useState } from "react";
import { Freelancer } from "../_types/freelancer";
import { Edit, UserPlus, Copy, AlertTriangle, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getRateTertinggi } from "../_utils/helpers";

interface FreelancerTableProps {
  data: Freelancer[];
  onRowClick: (f: Freelancer) => void;
  onEdit: (f: Freelancer) => void;
  onAssign: (f: Freelancer) => void;
  sortField: string;
  sortOrder: "asc" | "desc";
  onSort: (field: any) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  filteredCount: number;
  itemsPerPage: number;
  selectedIds: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
}

export const FreelancerTable: React.FC<FreelancerTableProps> = ({
  data,
  onRowClick,
  onEdit,
  onAssign,
  sortField,
  sortOrder,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  filteredCount,
  itemsPerPage,
  selectedIds,
  onSelectToggle,
  onSelectAll
}) => {
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };

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

  const renderRating = (rating: number | null) => {
    if (rating === null) return <span style={{ color: '#3f3f46' }}>–</span>;
    
    let color = "#EF9F27";
    if (rating >= 4.5) color = "#97C459";
    else if (rating >= 3.5) color = "#85B7EB";

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '3px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="star-dot" style={{ background: i <= rating ? color : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
        <span style={{ fontSize: '11px', color }}>{rating.toFixed(1)}</span>
      </div>
    );
  };

  const isAllSelected = data.length > 0 && data.every(f => selectedIds.includes(f.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.08em', fontWeight: 600 }}>DAFTAR FREELANCER</div>
      
      <div className="table-container-premium">
        <table className="freelancer-table-premium">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox" 
                  className="custom-checkbox" 
                  checked={isAllSelected}
                  onChange={() => onSelectAll(isAllSelected ? [] : data.map(f => f.id))}
                />
              </th>
              <th style={{ width: '40px' }}>#</th>
              <th style={{ width: '160px', cursor: 'pointer' }} onClick={() => onSort('nama')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  NAMA {sortField === 'nama' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                </div>
              </th>
              <th style={{ width: '130px' }}>POSISI</th>
              <th style={{ width: '100px' }}>KOTA</th>
              <th style={{ width: '140px' }}>NO. HP</th>
              <th style={{ width: '120px', textAlign: 'right', cursor: 'pointer' }} onClick={() => onSort('rate_tertinggi')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  RATE TERTINGGI {sortField === 'rate_tertinggi' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                </div>
              </th>
              <th style={{ width: '160px' }}>EVENT TERAKHIR</th>
              <th style={{ width: '90px' }}>STATUS</th>
              <th style={{ width: '100px', cursor: 'pointer' }} onClick={() => onSort('rating_avg')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  RATING {sortField === 'rating_avg' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                </div>
              </th>
              <th style={{ width: '80px' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {data.map((f, idx) => {
              const posStyles = getPosisiStyles(f.posisi_utama[0]);
              const statStyles = getStatusStyles(f.status);
              const rate = getRateTertinggi(f.rate_estimate);
              const isIncomplete = !f.no_hp || !f.rekening_bank || !f.foto_url;
              const lastEvent = f.assignment_history.length > 0 ? f.assignment_history[0] : null;

              return (
                <tr key={f.id} onClick={() => onRowClick(f)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="custom-checkbox" 
                      checked={selectedIds.includes(f.id)}
                      onChange={() => onSelectToggle(f.id)}
                    />
                  </td>
                  <td style={{ color: '#52525b', fontSize: '12px' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isIncomplete && (
                        <div style={{ position: 'relative' }} className="group">
                          <AlertTriangle size={12} color="#EF9F27" />
                          <div className="tooltip-premium">Profil belum lengkap</div>
                        </div>
                      )}
                      <span style={{ fontWeight: 500, color: '#e4e4e7' }}>{f.nama}</span>
                    </div>
                  </td>
                  <td>
                    <span className="posisi-pill" style={{ background: posStyles.bg, color: posStyles.color }}>
                      {f.posisi_utama[0]}
                    </span>
                  </td>
                  <td style={{ color: f.kota_domisili === "—" ? "#3f3f46" : "#a1a1aa", fontSize: '12px' }}>{f.kota_domisili}</td>
                  <td style={{ position: 'relative' }}>
                    <div className="phone-cell">
                      <span style={{ color: !f.no_hp ? "#3f3f46" : "#a1a1aa", fontFamily: 'monospace', fontSize: '12px' }}>
                        {f.no_hp || "–"}
                      </span>
                      {f.no_hp && (
                        <button 
                          className="copy-btn" 
                          onClick={(e) => handleCopy(e, f.no_hp, f.id)}
                          style={{ position: 'relative' }}
                        >
                          <Copy size={12} />
                          {copyingId === f.id && <div className="copy-tooltip">Tersalin!</div>}
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', color: !rate ? "#3f3f46" : "#e4e4e7" }}>
                    {rate ? `Rp ${rate.toLocaleString()}` : "–"}
                  </td>
                  <td>
                    {lastEvent ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '12px' }}>{lastEvent.nama_event}</span>
                        <span style={{ color: '#52525b', fontSize: '11px' }}>{new Date(lastEvent.tanggal_mulai).getFullYear()}</span>
                      </div>
                    ) : "–"}
                  </td>
                  <td>
                    <span className="status-badge-pill" style={{ background: statStyles.bg, color: statStyles.color }}>
                      {statStyles.label}
                    </span>
                  </td>
                  <td>{renderRating(f.rating_avg)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        className="action-btn-premium group" 
                        onClick={(e) => { e.stopPropagation(); onEdit(f); }}
                        style={{ position: 'relative' }}
                      >
                        <Edit size={14} />
                        <div className="tooltip-premium">Edit profil</div>
                      </button>
                      <button 
                        className="action-btn-premium group" 
                        onClick={(e) => { e.stopPropagation(); onAssign(f); }}
                        style={{ position: 'relative' }}
                      >
                        <UserPlus size={14} />
                        <div className="tooltip-premium">Assign ke project</div>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div style={{ fontSize: '12px', color: '#71717a' }}>
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCount)} of {filteredCount} entries
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="back-btn-premium" 
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const p = i + 1; // Simplistic pagination for demo
              return (
                <button 
                  key={p} 
                  onClick={() => onPageChange(p)}
                  style={{ 
                    width: '32px', height: '32px', borderRadius: '6px', border: 'none',
                    background: currentPage === p ? '#378ADD' : 'transparent',
                    color: currentPage === p ? 'white' : '#71717a',
                    cursor: 'pointer'
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <button 
            className="back-btn-premium" 
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .group:hover .tooltip-premium {
          opacity: 1;
          visibility: visible;
          transform: translateY(-4px);
        }
        .tooltip-premium {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(0);
          background: #1f1f23;
          border: 0.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          color: #a1a1aa;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s;
          z-index: 100;
          pointer-events: none;
        }
        .phone-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .copy-btn {
          background: transparent;
          border: none;
          color: #52525b;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }
        tr:hover .copy-btn {
          opacity: 1;
        }
        .copy-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #378ADD;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};
