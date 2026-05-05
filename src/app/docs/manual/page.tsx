"use client";

import { useState } from "react";
import { 
  Book, 
  Target, 
  Users, 
  Building2, 
  FileText, 
  Zap, 
  ShieldCheck, 
  ChevronRight,
  Printer,
  Home,
  Search,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

const CHAPTERS = [
  { id: "intro", title: "Dashboard Utama", icon: <Target size={18} /> },
  { id: "projects", title: "Project Tracker", icon: <Zap size={18} /> },
  { id: "crm", title: "Modul CRM", icon: <Users size={18} /> },
  { id: "finance", title: "Finance & RFP", icon: <FileText size={18} /> },
  { id: "vendors", title: "Vendor Management", icon: <Building2 size={18} /> },
  { id: "collaboration", title: "Kolaborasi", icon: <ShieldCheck size={18} /> },
];

export default function ManualPage() {
  const [activeChapter, setActiveChapter] = useState("intro");

  const renderContent = () => {
    switch (activeChapter) {
      case "intro":
        return (
          <div className="manual-content-fade">
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#f4f4f5', marginBottom: '24px' }}>Bab 1: Dashboard Utama (Command Center)</h2>
            <p style={{ color: '#a1a1aa', lineHeight: 1.6, marginBottom: '24px' }}>
              Dashboard adalah pusat kendali yang merangkum kesehatan bisnis JUARA secara real-time. Di sini Anda bisa memantau pipeline, proyek aktif, hingga piutang yang menunggak.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ color: '#f4f4f5', marginBottom: '12px', fontSize: '15px' }}>Statistik Utama</h4>
                <ul style={{ color: '#71717a', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '20px' }}>
                  <li><strong style={{ color: '#a78bfa' }}>Leads & Pitching</strong>: Potensi omzet dari proyek yang baru masuk.</li>
                  <li><strong style={{ color: '#378ADD' }}>On Going</strong>: Proyek yang sedang dalam tahap eksekusi.</li>
                  <li><strong style={{ color: '#5DCAA5' }}>Completed</strong>: Total keberhasilan proyek yang sudah selesai.</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ color: '#f4f4f5', marginBottom: '12px', fontSize: '15px' }}>Monitoring AR (Account Receivable)</h4>
                <p style={{ color: '#71717a', fontSize: '13px', lineHeight: 1.5 }}>
                  Fitur krusial untuk mengontrol arus kas. Jika widget <strong>Overdue</strong> berwarna <span style={{ color: '#EF4444' }}>Merah</span>, berarti ada tagihan yang sudah lewat jatuh tempo dan harus segera ditagih.
                </p>
              </div>
            </div>
          </div>
        );
      case "projects":
        return (
          <div className="manual-content-fade">
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#f4f4f5', marginBottom: '24px' }}>Bab 2: Modul Project Tracker</h2>
            <div style={{ background: '#378ADD20', borderLeft: '4px solid #378ADD', padding: '16px', borderRadius: '4px', marginBottom: '24px' }}>
              <p style={{ color: '#85B7EB', fontSize: '13px', margin: 0 }}><strong>Pro Tip:</strong> Gunakan tombol "+ Add New Client" langsung dari form proyek jika klien belum terdaftar untuk menghemat waktu.</p>
            </div>
            
            <h3 style={{ fontSize: '18px', color: '#f4f4f5', marginBottom: '16px' }}>2.1 Alur Pengisian Project Card</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#378ADD', color: 'white', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                <div>
                  <h4 style={{ color: '#e4e4e7', fontSize: '14px', marginBottom: '4px' }}>Tab Tasks (Checklist)</h4>
                  <p style={{ color: '#71717a', fontSize: '13px' }}>Digunakan untuk melacak progres operasional harian tim di lapangan.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#378ADD', color: 'white', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>2</div>
                <div>
                  <h4 style={{ color: '#e4e4e7', fontSize: '14px', marginBottom: '4px' }}>Tab Billing (Data AR)</h4>
                  <p style={{ color: '#71717a', fontSize: '13px' }}>Wajib mengubah status ke <strong>Invoiced</strong> saat menagih dan <strong>Paid</strong> saat uang masuk agar dashboard AR tetap akurat.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case "finance":
        return (
          <div className="manual-content-fade">
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#f4f4f5', marginBottom: '24px' }}>Bab 4: Alur Keuangan (RFP Flow)</h2>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '32px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><Zap size={24} /></div>
                    <div style={{ fontSize: '13px', color: '#f4f4f5', fontWeight: 600 }}>PM Create</div>
                  </div>
                  <ChevronRight style={{ color: '#3f3f46' }} />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><Search size={24} /></div>
                    <div style={{ fontSize: '13px', color: '#f4f4f5', fontWeight: 600 }}>Procurement Review</div>
                  </div>
                  <ChevronRight style={{ color: '#3f3f46' }} />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239,159,39,0.1)', color: '#EF9F27', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><ShieldCheck size={24} /></div>
                    <div style={{ fontSize: '13px', color: '#f4f4f5', fontWeight: 600 }}>Director Approve</div>
                  </div>
                  <ChevronRight style={{ color: '#3f3f46' }} />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(93,202,165,0.1)', color: '#5DCAA5', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><FileText size={24} /></div>
                    <div style={{ fontSize: '13px', color: '#f4f4f5', fontWeight: 600 }}>Finance Pay</div>
                  </div>
               </div>
               <p style={{ color: '#71717a', fontSize: '13px', textAlign: 'center', margin: 0 }}>Setiap status (Draft, Submitted, Approved, Paid) dapat dipantau langsung oleh PM di dashboard mereka.</p>
            </div>
          </div>
        );
      default:
        return <div style={{ color: '#71717a' }}>Bab ini sedang dalam penyusunan...</div>;
    }
  };

  return (
    <div className="manual-page-premium" style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5', display: 'flex' }}>
      {/* Manual Sidebar */}
      <aside style={{ width: '280px', borderRight: '0.5px solid rgba(255,255,255,0.08)', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#378ADD', display: 'grid', placeItems: 'center', color: 'white' }}><Book size={20} /></div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>JUARA MANUAL</h1>
            <p style={{ fontSize: '11px', color: '#52525b', margin: 0 }}>v1.0 Internal Docs</p>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {CHAPTERS.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChapter(ch.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeChapter === ch.id ? 'rgba(55,138,221,0.1)' : 'transparent',
                color: activeChapter === ch.id ? '#85B7EB' : '#71717a',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: '0.2s'
              }}
            >
              {ch.icon} {ch.title}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <Link href="/projects" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', color: '#a1a1aa', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <ArrowLeft size={14} /> Kembali ke Dashboard
            </button>
          </Link>
        </div>
      </aside>

      {/* Main Reading Area */}
      <main style={{ flex: 1, padding: '60px 80px', overflowY: 'auto', maxWidth: '1000px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', paddingBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#378ADD', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px' }}>DOCUMENTATION</div>
            <h2 style={{ fontSize: '32px', fontWeight: 500, color: '#f4f4f5', margin: 0 }}>Panduan Operasional</h2>
          </div>
          <button 
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '30px', background: '#f4f4f5', color: '#09090b', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Printer size={16} /> Cetak Manual (PDF)
          </button>
        </header>

        <div className="manual-body">
          {renderContent()}
        </div>

        <footer style={{ marginTop: '100px', paddingTop: '40px', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <span style={{ fontSize: '12px', color: '#3f3f46' }}>© 2026 JUARA Workspace System</span>
           <div style={{ display: 'flex', gap: '24px' }}>
              <span style={{ fontSize: '12px', color: '#3f3f46' }}>Internal Only</span>
              <span style={{ fontSize: '12px', color: '#3f3f46' }}>Confidential</span>
           </div>
        </footer>
      </main>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .manual-content-fade {
          animation: fadeIn 0.4s ease-out;
        }
        @media print {
          aside { display: none !important; }
          main { padding: 0 !important; width: 100% !important; max-width: none !important; }
          button { display: none !important; }
          .manual-page-premium { background: white !important; color: black !important; }
          h2, h3, h4, p, li { color: black !important; }
          .manual-body div { border-color: #ddd !important; }
        }
      `}</style>
    </div>
  );
}
