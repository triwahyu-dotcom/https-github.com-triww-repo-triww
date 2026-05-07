import type { RelationshipType } from "@/lib/vendor/types";

export const DOCUMENT_REQUIREMENTS: Record<RelationshipType, Array<{ name: string; required: boolean }>> = {
  vendor_rental: [
    { name: "Akta Pendirian", required: true },
    { name: "NPWP Badan", required: true },
    { name: "NIB", required: true },
    { name: "KTP Direktur", required: true },
    { name: "Company Profile", required: true },
    { name: "Daftar Peralatan + Spesifikasi", required: true },
    { name: "Pricelist Sewa", required: true },
    { name: "Sertifikat Alat (rigging/electrical)", required: false },
    { name: "NDA", required: true },
    { name: "Sertifikat PKP", required: false },
  ],
  vendor_service: [
    { name: "Akta Pendirian", required: true },
    { name: "NPWP Badan", required: true },
    { name: "NIB", required: true },
    { name: "KTP Direktur", required: true },
    { name: "Company Profile", required: true },
    { name: "Pricelist Layanan", required: false },
    { name: "NDA", required: true },
    { name: "Sertifikat PKP", required: false },
  ],
  vendor_supply: [
    { name: "Akta Pendirian", required: true },
    { name: "NPWP Badan", required: true },
    { name: "NIB", required: true },
    { name: "KTP Direktur", required: true },
    { name: "Katalog Produk", required: true },
    { name: "Pricelist + MOQ", required: true },
    { name: "Sample Produk (foto)", required: false },
    { name: "NDA", required: true },
    { name: "Sertifikat PKP", required: false },
  ],
  eo_partner: [
    { name: "Akta Pendirian (jika badan)", required: false },
    { name: "KTP / NPWP", required: true },
    { name: "Company Profile", required: true },
    { name: "Portfolio 3 Project Terakhir", required: true },
    { name: "Statement Tanggung Jawab Tim (jika individu)", required: false },
    { name: "MoU Template", required: false },
    { name: "NDA", required: true },
  ],
  talent_agency: [
    { name: "Akta Pendirian", required: true },
    { name: "NPWP Badan", required: true },
    { name: "NIB", required: true },
    { name: "Daftar Talent", required: true },
    { name: "Contoh Kontrak Talent", required: true },
    { name: "NDA", required: true },
  ],
  talent: [
    { name: "KTP", required: true },
    { name: "NPWP Pribadi", required: false },
    { name: "Showreel / Demo Video", required: true },
    { name: "Rate Card", required: true },
    { name: "Rider Standard", required: false },
    { name: "Daftar Pengalaman", required: true },
  ],
  crew_lead: [
    { name: "KTP", required: true },
    { name: "NPWP Pribadi", required: false },
    { name: "Portfolio Project", required: true },
    { name: "Daftar Tim & CV Singkat", required: true },
    { name: "Statement Tanggung Jawab Tim", required: true },
    { name: "NDA", required: true },
  ],
  crew_individual: [
    { name: "KTP", required: true },
    { name: "NPWP Pribadi", required: false },
    { name: "CV / Pengalaman", required: true },
    { name: "Sertifikat Profesi", required: false },
    { name: "NDA", required: true },
  ],
  freelance: [
    { name: "KTP", required: true },
    { name: "NPWP Pribadi", required: false },
    { name: "Portfolio Online (link)", required: true },
    { name: "Rate Card", required: true },
    { name: "NDA", required: true },
  ],
};

export function getRequiredDocs(relationshipType: RelationshipType) {
  return DOCUMENT_REQUIREMENTS[relationshipType] || [];
}
