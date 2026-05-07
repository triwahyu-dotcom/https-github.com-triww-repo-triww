export const SIDEBAR_CONTENT: Record<string, { docs: string; tax: string; payment: string }> = {
  vendor_rental: {
    docs: "Akta, NPWP badan, NIB, KTP direktur, daftar peralatan",
    tax: "PPh 23 (2% atas nilai sewa). PPN 11% efektif jika PKP.",
    payment: "PO + Surat Jalan + Berita Acara Serah Terima"
  },
  vendor_service: {
    docs: "Akta, NPWP badan, NIB, KTP direktur, Compro, NDA",
    tax: "PPh 23 (2% atas jasa). PPN 11% efektif jika PKP.",
    payment: "PO atau Kontrak + Berita Acara"
  },
  vendor_supply: {
    docs: "Akta, NPWP badan, NIB, katalog produk, pricelist + MOQ",
    tax: "TIDAK kena PPh 23 (pembelian barang). PPN 11% efektif jika PKP.",
    payment: "PO + Surat Jalan + Faktur Pembelian"
  },
  eo_partner_business: {
    docs: "Akta, NPWP, NIB, Compro, Portfolio project",
    tax: "PPh 23 (2%). PPN 11% efektif jika PKP.",
    payment: "Kontrak kolaborasi"
  },
  eo_partner_individual: {
    docs: "KTP, NPWP pribadi (opsional), Portfolio project, statement tanggung jawab tim",
    tax: "PPh 21 (progresif atau final 0,5% UMKM)",
    payment: "Kontrak atau SPK ke nama pribadi"
  },
  talent_agency: {
    docs: "Akta, NPWP, NIB, daftar talent, contoh kontrak talent",
    tax: "PPh 23 (2%) atas fee agency. PPh 21 untuk talent.",
    payment: "Kontrak + Rider talent"
  },
  talent: {
    docs: "KTP, NPWP pribadi (jika ada), Showreel, Rate card, Rider",
    tax: "PPh 21. Final 0,5% jika punya NPWP UMKM.",
    payment: "Kontrak Talent + Rider, DP saat sign"
  },
  crew_lead: {
    docs: "KTP, NPWP (jika ada), Portfolio, statement tanggung jawab tim, daftar tim",
    tax: "PPh 21 ke nama Anda. Anda bayar tim sendiri.",
    payment: "SPK ke nama pribadi. Nilai mencakup seluruh tim."
  },
  crew_individual: {
    docs: "KTP, NPWP (jika ada), CV, sertifikat profesi (jika teknis)",
    tax: "PPh 21 (progresif).",
    payment: "SPK ke nama pribadi. Day rate."
  },
  freelance: {
    docs: "KTP, NPWP (jika ada), Portfolio link, Rate card",
    tax: "PPh 21. Final 0,5% jika NPWP UMKM.",
    payment: "PO atau SPK + Invoice (jika ada)"
  }
};

export const RELATIONSHIP_LABELS: Record<string, string> = {
  vendor_rental: "Vendor Rental",
  vendor_service: "Vendor Service",
  vendor_supply: "Vendor Supply",
  eo_partner: "EO Partner",
  talent_agency: "Talent Agency",
  talent: "Individual Talent",
  crew_lead: "Crew Lead",
  crew_individual: "Individual Crew",
  freelance: "Creative Freelance"
};
