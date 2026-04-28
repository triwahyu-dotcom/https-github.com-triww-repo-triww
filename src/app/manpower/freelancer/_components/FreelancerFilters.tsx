"use client";

import React from "react";
import { Search } from "lucide-react";

interface FreelancerFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedPosisi: string[];
  onPosisiChange: (pos: string) => void;
  selectedKota: string;
  onKotaChange: (kota: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  bankFilter: string;
  onBankChange: (bank: string) => void;
  completenessFilter: string;
  onCompletenessChange: (val: string) => void;
  onReset: () => void;
  cities: string[];
  activeFilterCount: number;
}

const POSISI_GROUPS = [
  {
    label: "Management",
    positions: ["Project Manager", "Project Officer", "Production Head"]
  },
  {
    label: "Production",
    positions: ["Production", "Produksi"]
  },
  {
    label: "Logistic",
    positions: ["Logistic Head", "Logistik Team", "Logistik"]
  },
  {
    label: "Field",
    positions: ["Aksi & Runner", "Stage Man", "Floor Crew", "Crowd Control", "Parkir"]
  }
];

export const FreelancerFilters: React.FC<FreelancerFiltersProps> = ({
  search,
  onSearchChange,
  selectedPosisi,
  onPosisiChange,
  selectedKota,
  onKotaChange,
  selectedStatus,
  onStatusChange,
  bankFilter,
  onBankChange,
  completenessFilter,
  onCompletenessChange,
  onReset,
  cities,
  activeFilterCount
}) => {
  return (
    <aside className="freelancer-sidebar-filter">
      <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '16px' }}>FILTER</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Search Nama */}
        <div>
          <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '6px', fontWeight: 600 }}>CARI NAMA</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#52525b' }} />
            <input 
              className="filter-input-premium"
              placeholder="Ketik nama..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ width: '100%', background: '#1f1f23', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#d4d4d8', fontSize: '13px', padding: '8px 12px 8px 34px', outline: 'none' }}
            />
          </div>
        </div>

        {/* Posisi */}
        <div>
          <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '8px', fontWeight: 600 }}>POSISI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {POSISI_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.06em', margin: '10px 0 4px', fontWeight: 600 }}>{group.label.toUpperCase()}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.positions.map(pos => (
                    <label key={pos} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        className="custom-checkbox" 
                        checked={selectedPosisi.includes(pos)}
                        onChange={() => onPosisiChange(pos)}
                      />
                      <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{pos}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kota Domisili */}
        <div>
          <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '6px', fontWeight: 600 }}>KOTA DOMISILI</div>
          <select 
            value={selectedKota}
            onChange={(e) => onKotaChange(e.target.value)}
            style={{ width: '100%', background: '#1f1f23', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#d4d4d8', fontSize: '13px', padding: '8px 12px', outline: 'none', appearance: 'none' }}
          >
            {cities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '8px', fontWeight: 600 }}>STATUS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {["Semua", "Pendaftar Baru", "Aktif", "Tidak Aktif", "Blacklist", "On Event"].map(status => (
              <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  className="custom-radio" 
                  name="status"
                  checked={selectedStatus === status}
                  onChange={() => onStatusChange(status)}
                />
                <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{status}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Rekening Bank */}
        <div>
          <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '8px', fontWeight: 600 }}>REKENING BANK</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {["Semua", "Sudah ada rekening", "Belum ada rekening"].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  className="custom-radio" 
                  name="bank"
                  checked={bankFilter === opt}
                  onChange={() => onBankChange(opt)}
                />
                <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Kelengkapan Profil */}
        <div>
          <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '8px', fontWeight: 600 }}>KELENGKAPAN PROFIL</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {["Semua", "Profil lengkap (no ⚠)", "Profil belum lengkap (ada ⚠)"].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  className="custom-radio" 
                  name="completeness"
                  checked={completenessFilter === opt}
                  onChange={() => onCompletenessChange(opt)}
                />
                <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeFilterCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <span style={{ background: 'rgba(55, 138, 221, 0.15)', color: '#85B7EB', borderRadius: '20px', padding: '3px 12px', fontSize: '11px' }}>
                {activeFilterCount} filter aktif
              </span>
            </div>
          )}
          <button 
            onClick={onReset}
            style={{ width: '100%', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#71717a', fontSize: '12px', padding: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            Reset semua filter
          </button>
        </div>
      </div>
    </aside>
  );
};
