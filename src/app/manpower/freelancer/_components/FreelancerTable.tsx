import React from "react";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle, 
  Star, 
  Edit, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from "lucide-react";
import { Freelancer } from "../_types/freelancer";
import { PosisiBadge } from "./PosisiBadge";
import { StatusBadge } from "./StatusBadge";
import { formatHP, formatRupiah, getRateTertinggi, getEventTerakhir } from "../_utils/helpers";
import { SortField, SortOrder } from "../_hooks/useFreelancerFilter";

interface FreelancerTableProps {
  data: Freelancer[];
  onRowClick: (freelancer: Freelancer) => void;
  onEdit: (freelancer: Freelancer) => void;
  onAssign: (freelancer: Freelancer) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  filteredCount: number;
  itemsPerPage: number;
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
  itemsPerPage
}) => {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.3 }} />;
    return sortOrder === "asc" ? <ArrowUp size={12} style={{ marginLeft: '4px' }} /> : <ArrowDown size={12} style={{ marginLeft: '4px' }} />;
  };

  const renderPosisi = (posisiList: string[]) => {
    if (posisiList.length <= 2) {
      return posisiList.map((p, i) => <PosisiBadge key={i} posisi={p as any} />);
    }
    return (
      <>
        <PosisiBadge posisi={posisiList[0] as any} />
        <PosisiBadge posisi={posisiList[1] as any} />
        <span className="count-badge" style={{ verticalAlign: 'middle' }}>+{posisiList.length - 2} lagi</span>
      </>
    );
  };

  return (
    <div className="table-section">
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th onClick={() => onSort("nama")} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Nama {getSortIcon("nama")}</div>
              </th>
              <th>Posisi</th>
              <th>Kota</th>
              <th>No. HP</th>
              <th onClick={() => onSort("rate_tertinggi")} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Rate Tertinggi {getSortIcon("rate_tertinggi")}</div>
              </th>
              <th>Event Terakhir</th>
              <th>Status</th>
              <th onClick={() => onSort("rating_avg")} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Rating {getSortIcon("rating_avg")}</div>
              </th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((f, idx) => (
                <tr key={f.id} onClick={() => onRowClick(f)} style={{ cursor: 'pointer' }}>
                  <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {f.nama}
                      {!f.rekening_bank && (
                        <span title="Rekening belum diisi" style={{ color: 'var(--warning)', cursor: 'help', display: 'flex', alignItems: 'center' }}><AlertTriangle size={14} /></span>
                      )}
                    </div>
                  </td>
                  <td>{renderPosisi(f.posisi_utama)}</td>
                  <td>{f.kota_domisili}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatHP(f.no_hp)}</td>
                  <td>{getRateTertinggi(f.rate_estimate) ? formatRupiah(getRateTertinggi(f.rate_estimate)!) : "—"}</td>
                  <td>{getEventTerakhir(f.assignment_history)}</td>
                  <td><StatusBadge status={f.status} /></td>
                  <td>
                    {f.rating_avg ? (
                      <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} /> {f.rating_avg} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({f.total_event}x)</span></span>
                    ) : "—"}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button className="reset-btn" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }} onClick={() => onEdit(f)} title="Edit"><Edit size={14} /></button>
                      <button className="reset-btn" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }} onClick={() => onAssign(f)} title="Assign to Project"><UserPlus size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Tidak ada data freelancer ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div className="pagination">
            <div className="page-info">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} – {Math.min(currentPage * itemsPerPage, filteredCount)} dari {filteredCount}
            </div>
            <div className="page-controls">
              <button 
                className="page-btn" 
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              
              {(() => {
                const pages = [];
                const maxVisible = 5;
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, start + maxVisible - 1);
                
                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1);
                }

                if (start > 1) {
                  pages.push(<button key={1} className="page-btn" onClick={() => onPageChange(1)}>1</button>);
                  if (start > 2) pages.push(<span key="s-sep" style={{ padding: '0 8px', color: 'var(--text-muted)' }}>...</span>);
                }

                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button 
                      key={i} 
                      className={`page-btn ${currentPage === i ? 'active' : ''}`}
                      onClick={() => onPageChange(i)}
                    >
                      {i}
                    </button>
                  );
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push(<span key="e-sep" style={{ padding: '0 8px', color: 'var(--text-muted)' }}>...</span>);
                  pages.push(<button key={totalPages} className="page-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button>);
                }

                return pages;
              })()}

              <button 
                className="page-btn" 
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
