"use client";

import { useState } from "react";
import { VendorIntakeForm } from "@/components/vendors/VendorIntakeForm";
import { User, Building2 } from "lucide-react";

export function PartnerPageClient({ serviceOptions }: { serviceOptions: string[] }) {
  const [showVendorForm, setShowVendorForm] = useState(false);

  return (
    <main className="partner-portal-main" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="partner-portal-hero" style={{ 
        padding: '80px 20px 60px', 
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <em className="eyebrow" style={{ 
            color: 'var(--blue)', 
            fontSize: '0.8rem', 
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 800,
            display: 'block',
            marginBottom: '20px'
          }}>JUARA Partner Network</em>
          <h1 style={{ 
            fontSize: 'max(2.8rem, 5vw)', 
            fontWeight: 900, 
            margin: '0 0 24px', 
            letterSpacing: '-0.04em',
            lineHeight: 1
          }}>Pendaftaran Partner</h1>
          <p className="text-muted" style={{ fontSize: '1.25rem', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto' }}>
            Bergabunglah dengan ekosistem JUARA Event dan jadilah bagian dari kesuksesan event-event besar kami.
          </p>
        </div>
      </div>

      {!showVendorForm ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '30px', 
          padding: '0 20px 100px',
          flexWrap: 'wrap'
        }}>
          {/* Vendor Card */}
          <div 
            style={{ 
              width: '440px',
              padding: '48px 40px', 
              background: '#16161d', 
              borderRadius: '40px', 
              border: '1px solid var(--line)', 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '32px', 
              background: 'rgba(99, 102, 241, 0.1)', 
              color: 'var(--blue)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Building2 size={40} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.8rem', fontWeight: 800 }}>Vendor / Company</h3>
              <p style={{ fontSize: '1rem', color: 'var(--muted)', lineHeight: 1.6 }}>Penyedia jasa (Equipment, Catering, Venue, dll).</p>
            </div>
            <button 
              className="primary-button" 
              onClick={() => setShowVendorForm(true)}
              style={{ 
                padding: '14px 40px', 
                borderRadius: '100px', 
                fontSize: '1rem', 
                fontWeight: 700,
                background: '#5b5cff'
              }}
            >
              Daftar Vendor
            </button>
          </div>

          {/* Manpower Card */}
          <div 
            style={{ 
              width: '440px',
              padding: '48px 40px', 
              background: 'rgba(34, 197, 94, 0.03)', 
              borderRadius: '40px', 
              border: '1px solid rgba(34, 197, 94, 0.15)', 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '32px', 
              background: 'rgba(34, 197, 94, 0.1)', 
              color: '#22c55e', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <User size={40} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.8rem', fontWeight: 800 }}>Freelance / Manpower</h3>
              <p style={{ fontSize: '1rem', color: 'var(--muted)', lineHeight: 1.6 }}>Tenaga ahli profesional (PM, Crew, Talent, dll).</p>
            </div>
            <a 
              href="/partner/manpower" 
              style={{ 
                textDecoration: 'none',
                padding: '14px 40px', 
                borderRadius: '100px', 
                fontSize: '1rem', 
                fontWeight: 700,
                background: '#22c55e',
                color: 'white',
                display: 'inline-block'
              }}
            >
              Daftar Manpower
            </a>
          </div>
        </div>
      ) : (
        <div id="vendor-form" className="form-container" style={{ paddingBottom: '100px', opacity: 1, transition: 'opacity 0.5s ease' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px', marginBottom: '32px' }}>
            <button 
              onClick={() => setShowVendorForm(false)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--blue)', 
                fontWeight: 600, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Kembali ke Pilihan
            </button>
          </div>
          <div className="form-section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Registrasi Vendor</h2>
            <p className="text-muted">Lengkapi data perusahaan Anda untuk mulai bekerja sama dengan JUARA.</p>
          </div>
          <VendorIntakeForm serviceOptions={serviceOptions} />
        </div>
      )}

      <footer style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        borderTop: '1px solid var(--line)',
        color: 'var(--muted-soft)',
        fontSize: '0.85rem'
      }}>
        <p>&copy; {new Date().getFullYear()} JUARAEVENT.ID — All Rights Reserved.</p>
      </footer>
    </main>
  );
}
