"use client";

import { useState, useTransition } from "react";
import { 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  CreditCard, 
  Camera, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { POSISI_LIST, Posisi } from "@/app/manpower/freelancer/_data/posisiList";

const INITIAL_FORM = {
  nama: "",
  no_hp: "",
  kota_domisili: "",
  posisi_utama: [] as Posisi[],
  rate_estimate: {} as Record<string, number>,
  nomor_ktp: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_holder: "",
};

export function ManpowerIntakeForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function updateField(name: string, value: any) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function togglePosisi(posisi: Posisi) {
    setForm((current) => {
      const isSelected = current.posisi_utama.includes(posisi);
      const newPosisi = isSelected 
        ? current.posisi_utama.filter(p => p !== posisi)
        : [...current.posisi_utama, posisi];
      
      // Cleanup rate_estimate if position is removed
      const newRates = { ...current.rate_estimate };
      if (isSelected) delete newRates[posisi];

      return { ...current, posisi_utama: newPosisi, rate_estimate: newRates };
    });
  }

  function updateRate(posisi: string, rate: string) {
    const numRate = parseInt(rate.replace(/[^\d]/g, "")) || 0;
    setForm(current => ({
      ...current,
      rate_estimate: { ...current.rate_estimate, [posisi]: numRate }
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.posisi_utama.length === 0) {
      setError("Silakan pilih minimal satu posisi.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/manpower-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal mengirim pendaftaran.");
        return;
      }

      setMessage("Pendaftaran berhasil terkirim! Tim kami akan meninjau profil Anda.");
      setForm(INITIAL_FORM);
    });
  }

  return (
    <div className="manpower-form-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
      <form 
        className="panel vendor-form-card" 
        onSubmit={handleSubmit} 
        style={{ 
          padding: '40px',
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow)'
        }}
      >
        
        {/* Identity Section */}
        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--blue)', marginBottom: '24px' }}>
          <User size={18} /> <span>Informasi Pribadi</span>
        </div>
        
        <section className="form-grid-2" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>Nama Lengkap</label>
            <input 
              required 
              value={form.nama} 
              onChange={e => updateField("nama", e.target.value)} 
              placeholder="Contoh: Budi Santoso" 
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>No. WhatsApp</label>
            <input 
              required 
              value={form.no_hp} 
              onChange={e => updateField("no_hp", e.target.value)} 
              placeholder="62812..." 
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>Kota Domisili</label>
            <input 
              required 
              value={form.kota_domisili} 
              onChange={e => updateField("kota_domisili", e.target.value)} 
              placeholder="Contoh: Jakarta Selatan" 
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>Nomor KTP</label>
            <input 
              required 
              value={form.nomor_ktp} 
              onChange={e => updateField("nomor_ktp", e.target.value)} 
              placeholder="16 digit nomor KTP" 
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}
            />
          </div>
        </section>

        {/* Position Selection */}
        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--blue)', marginBottom: '16px' }}>
          <Briefcase size={18} /> <span>Keahlian & Posisi</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted-soft)', marginBottom: '20px' }}>Pilih satu atau lebih posisi yang sesuai dengan keahlian Anda.</p>
        
        <div className="posisi-selector" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
          gap: '12px',
          marginBottom: '40px'
        }}>
          {POSISI_LIST.map((posisi) => (
            <button 
              key={posisi}
              type="button"
              onClick={() => togglePosisi(posisi)}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: form.posisi_utama.includes(posisi) ? 'var(--blue)' : 'var(--line)',
                background: form.posisi_utama.includes(posisi) ? 'rgba(99, 102, 241, 0.1)' : 'var(--panel-soft)',
                color: form.posisi_utama.includes(posisi) ? 'var(--blue)' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
            >
              {posisi}
            </button>
          ))}
        </div>

        {/* Rate Estimates */}
        {form.posisi_utama.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div className="form-section-title" style={{ marginBottom: '16px' }}>Estimasi Rate per Day (IDR)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {form.posisi_utama.map(posisi => (
                <div key={posisi} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '15px', 
                  background: 'var(--panel-soft)', 
                  padding: '12px 20px', 
                  borderRadius: '16px',
                  border: '1px solid var(--line)'
                }}>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{posisi}</span>
                  <input 
                    type="text" 
                    placeholder="Rate..."
                    value={form.rate_estimate[posisi]?.toLocaleString() || ""}
                    onChange={e => updateRate(posisi, e.target.value)}
                    style={{ 
                      width: '180px', 
                      textAlign: 'right',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      background: 'var(--panel)',
                      color: 'var(--text)'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bank Section */}
        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--blue)', marginBottom: '24px' }}>
          <CreditCard size={18} /> <span>Informasi Rekening</span>
        </div>
        <section className="form-grid-2" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>Nama Bank</label>
            <input 
              required 
              value={form.bank_name} 
              onChange={e => updateField("bank_name", e.target.value)} 
              placeholder="BCA / Mandiri / BRI" 
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>Nomor Rekening</label>
            <input 
              required 
              value={form.bank_account_number} 
              onChange={e => updateField("bank_account_number", e.target.value)} 
              placeholder="000-000-000" 
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}
            />
          </div>
          <div className="full" style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>Nama Pemilik Rekening</label>
            <input 
              required 
              value={form.bank_account_holder} 
              onChange={e => updateField("bank_account_holder", e.target.value)} 
              placeholder="Sesuai buku tabungan" 
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel-soft)', color: 'var(--text)' }}
            />
          </div>
        </section>



        {/* Feedback Messages */}
        {message && (
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--green)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
            <CheckCircle2 size={18} /> {message}
          </div>
        )}
        {error && (
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--red)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <button 
            type="submit" 
            disabled={pending} 
            className="primary-button"
            style={{ 
              padding: '16px 60px', 
              borderRadius: '100px', 
              fontSize: '1rem', 
              fontWeight: 700,
              boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)'
            }}
          >
            {pending ? "Mengirim..." : "Kirim Pendaftaran"}
          </button>
        </div>
      </form>
    </div>
  );
}
