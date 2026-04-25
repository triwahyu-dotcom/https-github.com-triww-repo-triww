import { VendorIntakeForm } from "@/components/vendors/VendorIntakeForm";
import { getDashboardData } from "@/lib/vendor/store";

export default async function PartnerPage() {
  const dashboard = await getDashboardData();

  return (
    <main className="partner-portal-main">
      <div className="partner-portal-hero" style={{ 
        padding: '60px 20px 40px', 
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(91,140,255,0.08) 0%, transparent 100%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <em className="eyebrow" style={{ 
            color: 'var(--blue)', 
            fontSize: '0.9rem', 
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 700,
            display: 'block',
            marginBottom: '16px'
          }}>JUARA Partner Network</em>
          <h1 style={{ 
            fontSize: 'max(2.5rem, 4vw)', 
            fontWeight: 900, 
            margin: '0 0 20px', 
            letterSpacing: '-0.03em',
            lineHeight: 1.1
          }}>Expand your reach with JUARA Event</h1>
          <p className="text-muted" style={{ fontSize: '1.2rem', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
            Register your company to our centralized procurement system and be discovered by our event management teams.
          </p>
        </div>
      </div>
      
      <div className="form-container" style={{ paddingBottom: '100px' }}>
        <VendorIntakeForm serviceOptions={dashboard.services} />
      </div>

      <footer style={{ 
        textAlign: 'center', 
        padding: '40px 20px', 
        borderTop: '1px solid var(--line)',
        color: 'var(--muted)',
        fontSize: '0.9rem'
      }}>
        <p>&copy; {new Date().getFullYear()} JUARAEVENT.ID — All Rights Reserved.</p>
      </footer>
    </main>
  );
}
