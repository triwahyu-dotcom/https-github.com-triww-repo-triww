import { getDashboardData } from "@/lib/vendor/store";
import { PartnerPageClient } from "@/components/partner/PartnerPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Registration | JUARA",
  description: "Daftarkan perusahaan atau keahlian Anda ke sistem pengadaan terpusat JUARA Event",
};

export default async function PartnerPage() {
  const dashboard = await getDashboardData();

  return <PartnerPageClient serviceOptions={dashboard.services} />;
}
