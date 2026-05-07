import { Metadata } from "next";
import { getDashboardData } from "@/lib/vendor/store";
import { PartnerIntakeFormV2 } from "@/components/partner-v2/PartnerIntakeFormV2";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export const metadata: Metadata = {
  title: "Partner Registration v2 (Beta) | JUARA",
  description: "Form pendaftaran partner versi baru untuk ekosistem JUARA Event.",
};

export default async function PartnerV2Page() {
  const data = await getDashboardData();
  
  return (
    <div className={`${GeistSans.variable} ${GeistMono.variable}`} style={{ background: '#FAF9F7', minHeight: '100vh', fontFamily: 'var(--geist-sans), sans-serif' }}>
      <PartnerIntakeFormV2 serviceOptions={data.services} />
    </div>
  );
}
