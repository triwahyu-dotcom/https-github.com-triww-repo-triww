"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  ChevronUp, 
  ChevronDown
} from "lucide-react";
import { Freelancer } from "../_types/freelancer";
import { POSISI_LIST, Posisi } from "../_data/posisiList";

interface FreelancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (freelancer: Partial<Freelancer>) => void;
  editingFreelancer: Freelancer | null;
  existingPhones: string[];
}

export const FreelancerModal: React.FC<FreelancerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingFreelancer,
  existingPhones
}) => {
  const [activeSection, setActiveSection] = useState<"A" | "B" | "C">("A");
  
  // Form States
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [kota, setKota] = useState("");
  const [ktp, setKtp] = useState("");
  const [status, setStatus] = useState<Freelancer["status"]>("aktif");
  const [selectedPosisi, setSelectedPosisi] = useState<Posisi[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  
  const [hasBank, setHasBank] = useState(false);
  const [bankName, setBankName] = useState("BCA");
  const [bankNo, setBankNo] = useState("");
  const [bankOwner, setBankOwner] = useState("");

  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (editingFreelancer) {
      setNama(editingFreelancer.nama || (editingFreelancer as any).name || "");
      setNoHp(editingFreelancer.no_hp);
      setKota(editingFreelancer.kota_domisili);
      setKtp(editingFreelancer.nomor_ktp || "");
      setStatus(editingFreelancer.status);
      setSelectedPosisi(editingFreelancer.posisi_utama);
      setRates(editingFreelancer.rate_estimate as Record<string, number>);
      if (editingFreelancer.rekening_bank) {
        setHasBank(true);
        setBankName(editingFreelancer.rekening_bank.nama_bank);
        setBankNo(editingFreelancer.rekening_bank.no_rekening);
        setBankOwner(editingFreelancer.rekening_bank.nama_pemilik);
      } else {
        setHasBank(false);
        setBankName("BCA");
        setBankNo("");
        setBankOwner("");
      }
    } else {
      resetForm();
    }
  }, [editingFreelancer, isOpen]);

  const resetForm = () => {
    setNama("");
    setNoHp("");
    setKota("");
    setKtp("");
    setStatus("aktif");
    setSelectedPosisi([]);
    setRates({});
    setHasBank(false);
    setBankName("BCA");
    setBankNo("");
    setBankOwner("");
    setPhoneError("");
    setActiveSection("A");
  };

  const validatePhone = (phone: string) => {
    if (!phone) return;
    const isDuplicate = existingPhones.includes(phone) && phone !== editingFreelancer?.no_hp;
    if (isDuplicate) {
      setPhoneError("Nomor HP sudah terdaftar di sistem.");
    } else {
      setPhoneError("");
    }
  };

  const handlePosisiToggle = (p: Posisi) => {
    setSelectedPosisi(prev => 
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const handleRateChange = (pos: string, val: string) => {
    const num = parseInt(val.replace(/\D/g, "")) || 0;
    setRates(prev => ({ ...prev, [pos]: num }));
  };

  const handleSave = () => {
    if (!nama || !noHp || !kota || selectedPosisi.length === 0 || phoneError) {
      alert("Mohon lengkapi data wajib (Nama, No. HP, Kota, Minimal 1 Posisi)");
      return;
    }

    const freelancerData: Partial<Freelancer> = {
      nama,
      no_hp: noHp,
      kota_domisili: kota,
      nomor_ktp: ktp,
      status,
      posisi_utama: selectedPosisi,
      rate_estimate: rates,
      rekening_bank: hasBank ? {
        nama_bank: bankName,
        no_rekening: bankNo,
        nama_pemilik: bankOwner
      } : null
    };

    onSave(freelancerData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f4f4f5' }}>{editingFreelancer ? "Edit Freelancer" : "Tambah Freelancer Baru"}</h2>
          <button style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }} onClick={onClose}><X size={20} /></button>
        </div>

        <div className="form-section">
          <div className="section-header" onClick={() => setActiveSection("A")}>
            <span>SECTION A — IDENTITAS</span>
            <span>{activeSection === "A" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
          </div>
          {activeSection === "A" && (
            <div className="section-body">
              <div className="filter-group">
                <label className="filter-label">Nama Lengkap *</label>
                <input type="text" className="mini-input-premium" value={nama} onChange={e => setNama(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="filter-label">No. HP *</label>
                <input 
                  type="text" 
                  className="mini-input-premium" 
                  value={noHp} 
                  onChange={e => setNoHp(e.target.value)}
                  onBlur={() => validatePhone(noHp)}
                />
                {phoneError && <span style={{ color: '#F09595', fontSize: '11px' }}>{phoneError}</span>}
              </div>
              <div className="filter-group">
                <label className="filter-label">Kota Domisili *</label>
                <input type="text" className="mini-input-premium" value={kota} onChange={e => setKota(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="filter-label">Nomor KTP</label>
                <input type="text" className="mini-input-premium" value={ktp} onChange={e => setKtp(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {["aktif", "tidak_aktif", "blacklist"].map((s) => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        className="custom-radio"
                        name="modal-status"
                        checked={status === s}
                        onChange={() => setStatus(s as any)}
                      />
                      <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{s.replace('_', ' ').toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="section-header" onClick={() => setActiveSection("B")}>
            <span>SECTION B — POSISI & RATE</span>
            <span>{activeSection === "B" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
          </div>
          {activeSection === "B" && (
            <div className="section-body">
              <label className="filter-label">Pilih Posisi (Minimal 1) *</label>
              <div className="posisi-checklist">
                {POSISI_LIST.map((p) => (
                  <div key={p} style={{ marginBottom: '4px' }}>
                    <label className="posisi-item">
                      <input 
                        type="checkbox" 
                        className="custom-checkbox"
                        checked={selectedPosisi.includes(p)}
                        onChange={() => handlePosisiToggle(p)}
                      />
                      <span style={{ fontSize: '13px' }}>{p}</span>
                    </label>
                    {selectedPosisi.includes(p) && (
                      <div style={{ paddingLeft: '24px', marginTop: '4px' }}>
                        <input 
                          type="text" 
                          className="mini-input-premium" 
                          placeholder="Rate estimate (Rp)..."
                          value={rates[p] ? rates[p].toLocaleString('id-ID') : ""}
                          onChange={e => handleRateChange(p, e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="section-header" onClick={() => setActiveSection("C")}>
            <span>SECTION C — REKENING BANK</span>
            <span>{activeSection === "C" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
          </div>
          {activeSection === "C" && (
            <div className="section-body">
              <label className="posisi-item">
                <input type="checkbox" className="custom-checkbox" checked={hasBank} onChange={e => setHasBank(e.target.checked)} />
                <span style={{ fontSize: '13px' }}>Tambah rekening sekarang</span>
              </label>
              
              {hasBank && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="filter-group">
                    <label className="filter-label">Nama Bank *</label>
                    <select className="mini-input-premium" value={bankName} onChange={e => setBankName(e.target.value)}>
                      {["BCA", "Mandiri", "BRI", "BNI", "CIMB", "BSI", "Lainnya"].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="filter-label">Nomor Rekening *</label>
                    <input type="text" className="mini-input-premium" value={bankNo} onChange={e => setBankNo(e.target.value)} />
                  </div>
                  <div className="filter-group">
                    <label className="filter-label">Nama Pemilik Rekening *</label>
                    <input type="text" className="mini-input-premium" value={bankOwner} onChange={e => setBankOwner(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button className="primary-button-premium" style={{ flex: 1 }} onClick={handleSave}>Simpan</button>
          <button className="secondary-button-premium" style={{ flex: 1 }} onClick={onClose}>Batal</button>
        </div>
      </div>
    </div>
  );
};
