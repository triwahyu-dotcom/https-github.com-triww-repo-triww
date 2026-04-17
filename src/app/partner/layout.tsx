import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Registration | JUARA",
  description: "Join the JUARA Partner Network",
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="partner-portal-wrapper" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {children}
    </div>
  );
}
