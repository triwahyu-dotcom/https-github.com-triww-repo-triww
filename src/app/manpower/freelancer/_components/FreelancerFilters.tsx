import React from "react";
import { Star } from "lucide-react";
import { Posisi, POSISI_LIST } from "../_data/posisiList";

interface FreelancerFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedPosisi: Posisi[];
  onPosisiChange: (posisi: Posisi) => void;
  selectedKota: string;
  onKotaChange: (kota: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  bankFilter: string;
  onBankChange: (val: string) => void;
  onReset: () => void;
  cities: string[];
  stats: {
    total: number;
    filtered: number;
    withBank: number;
    avgRating: number | null;
    statusBreakdown: Record<string, number>;
  };
}

export const FreelancerFilters: React.FC<FreelancerFiltersProps> = ({
  search, onSearchChange,
  selectedPosisi, onPosisiChange,
  selectedKota, onKotaChange,
  selectedStatus, onStatusChange,
  bankFilter, onBankChange,
  onReset,
  cities,
  stats
}) => {
  return (
    <div className="filter-section">
      <div className="filter-card">
        <div className="filter-group">
          <label className="filter-label">Cari Nama</label>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Ketik nama..." 
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Posisi</label>
          <div className="posisi-checklist">
            {POSISI_LIST.map((p) => (
              <label key={p} className="posisi-item">
                <input 
                  type="checkbox" 
                  checked={selectedPosisi.includes(p)}
                  onChange={() => onPosisiChange(p)}
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Kota Domisili</label>
          <select 
            className="dropdown-select"
            value={selectedKota}
            onChange={(e) => onKotaChange(e.target.value)}
          >
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Status</label>
          <div className="radio-group">
            {["Semua", "Aktif", "Tidak Aktif", "Blacklist", "On Event"].map((s) => (
              <label key={s} className="radio-item">
                <input 
                  type="radio" 
                  name="status"
                  checked={selectedStatus === s}
                  onChange={() => onStatusChange(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Rekening Bank</label>
          <div className="radio-group">
            {["Semua", "Sudah ada", "Belum ada"].map((b) => (
              <label key={b} className="radio-item">
                <input 
                  type="radio" 
                  name="bank"
                  checked={bankFilter === b}
                  onChange={() => onBankChange(b)}
                />
                {b}
              </label>
            ))}
          </div>
        </div>

        <button className="reset-btn" onClick={onReset}>
          Reset Semua Filter
        </button>

        <div className="divider" style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />

        <div className="stats-card">
          <label className="filter-label">Statistik Ringkas</label>
          <div className="stat-item">
            <span>Total Filtered</span>
            <span className="stat-value">{stats.filtered} / {stats.total}</span>
          </div>
          <div className="stat-item">
            <span>Rekening Bank</span>
            <span className="stat-value">{stats.total > 0 ? Math.round((stats.withBank / stats.total) * 100) : 0}%</span>
          </div>
          <div className="stat-item">
            <span>Avg Rating</span>
            <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} /> {stats.avgRating || "—"}</span>
          </div>
          
          <div style={{ marginTop: '8px' }}>
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <div key={status} className="stat-item" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: 
                      status === 'aktif' ? 'var(--success)' : 
                      status === 'blacklist' ? 'var(--danger)' : 
                      status === 'on_event' ? 'var(--info)' : 'var(--text-muted)'
                  }} />
                  {status.replace('_', ' ').toUpperCase()}
                </span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
