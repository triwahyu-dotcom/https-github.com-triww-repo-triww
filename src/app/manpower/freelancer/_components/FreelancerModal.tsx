import React, { useState, useEffect } from "react";
import { 
  X, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  AlertCircle 
} from "lucide-react";
import { Freelancer, RekeningBank } from "../_types/freelancer";
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
      setNama(editingFreelancer.nama);
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
    // Basic Validation
    if (!nama || !noHp || !kota || selectedPosisi.length === 0 || phoneError) {
      alert("Mohon lengkapi data wajib (Nama, No. HP, Kota, Minimal 1 Posisi)");
      return;
    }

    if (hasBank && (!bankName || !bankNo || !bankOwner)) {
      alert("Mohon lengkapi data rekening bank.");
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>{editingFreelancer ? "Edit Freelancer" : "Tambah Freelancer Baru"}</h2>
          <button className="close-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}><X size={20} /></button>
        </div>

        <div className="form-section">
          <div className="section-header" onClick={() => setActiveSection("A")}>
            <span>SECTION A — IDENTITAS</span>
            <span>SECTION A — IDENTITAS</span>
            <span>{activeSection === "A" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
          </div>
          {activeSection === "A" && (
            <div className="section-body">
              <div className="filter-group">
                <label className="filter-label">Nama Lengkap *</label>
                <input type="text" className="search-input" value={nama} onChange={e => setNama(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="filter-label">No. HP *</label>
                <input 
                  type="text" 
                  className="search-input" 
                  value={noHp} 
                  onChange={e => setNoHp(e.target.value)}
                  onBlur={() => validatePhone(noHp)}
                />
                {phoneError && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{phoneError}</span>}
              </div>
              <div className="filter-group">
                <label className="filter-label">Kota Domisili *</label>
                <input type="text" className="search-input" value={kota} onChange={e => setKota(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="filter-label">Nomor KTP</label>
                <input type="text" className="search-input" value={ktp} onChange={e => setKtp(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <div className="radio-group" style={{ flexDirection: 'row', gap: '16px' }}>
                  {["aktif", "tidak_aktif", "blacklist"].map((s) => (
                    <label key={s} className="radio-item">
                      <input 
                        type="radio" 
                        name="modal-status"
                        checked={status === s}
                        onChange={() => setStatus(s as any)}
                      />
                      {s.replace('_', ' ').toUpperCase()}
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
            <span>SECTION B — POSISI & RATE</span>
            <span>{activeSection === "B" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
          </div>
          {activeSection === "B" && (
            <div className="section-body">
              <label className="filter-label">Pilih Posisi (Minimal 1) *</label>
              <div className="posisi-checklist" style={{ maxHeight: 'none' }}>
                {POSISI_LIST.map((p) => (
                  <div key={p} style={{ marginBottom: '12px' }}>
                    <label className="posisi-item">
                      <input 
                        type="checkbox" 
                        checked={selectedPosisi.includes(p)}
                        onChange={() => handlePosisiToggle(p)}
                      />
                      {p}
                    </label>
                    {selectedPosisi.includes(p) && (
                      <div style={{ paddingLeft: '26px', marginTop: '4px' }}>
                        <input 
                          type="text" 
                          className="search-input" 
                          placeholder="Rate estimate (Rp)..."
                          value={rates[p] ? rates[p].toLocaleString('id-ID') : ""}
                          onChange={e => handleRateChange(p, e.target.value)}
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
            <span>SECTION C — REKENING BANK</span>
            <span>{activeSection === "C" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
          </div>
          {activeSection === "C" && (
            <div className="section-body">
              <label className="posisi-item">
                <input type="checkbox" checked={hasBank} onChange={e => setHasBank(e.target.checked)} />
                Tambah rekening sekarang
              </label>
              
              {hasBank && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                  <div className="filter-group">
                    <label className="filter-label">Nama Bank *</label>
                    <select className="dropdown-select" value={bankName} onChange={e => setBankName(e.target.value)}>
                      {["BCA", "Mandiri", "BRI", "BNI", "CIMB", "BSI", "Lainnya"].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="filter-label">Nomor Rekening *</label>
                    <input type="text" className="search-input" value={bankNo} onChange={e => setBankNo(e.target.value)} />
                  </div>
                  <div className="filter-group">
                    <label className="filter-label">Nama Pemilik Rekening *</label>
                    <input type="text" className="search-input" value={bankOwner} onChange={e => setBankOwner(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button className="primary-btn" style={{ flex: 1 }} onClick={handleSave}>Simpan</button>
          <button className="reset-btn" style={{ flex: 1 }} onClick={onClose}>Batal</button>
        </div>
      </div>
    </div>
  );
};
