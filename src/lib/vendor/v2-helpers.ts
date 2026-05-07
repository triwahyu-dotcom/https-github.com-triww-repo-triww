import type { Vendor, RelationshipType, EntityType } from "./types";

/**
 * Detects if a vendor is registered via the V2 form based on schema fields
 */
export function isV2Vendor(vendor: Pick<Vendor, "entityType" | "relationshipType" | "submissionMetadata">): boolean {
  return Boolean(
    vendor.entityType ||
    vendor.relationshipType ||
    vendor.submissionMetadata?.formVersion?.startsWith("v2")
  );
}

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  vendor_rental: "Vendor Rental",
  vendor_service: "Vendor Jasa",
  vendor_supply: "Vendor Supply",
  eo_partner: "EO Partner",
  talent_agency: "Talent Agency",
  talent: "Talent",
  crew_lead: "Crew Lead",
  crew_individual: "Crew Individu",
  freelance: "Freelance",
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  business: "Badan Usaha",
  individual: "Perorangan",
};

/**
 * Returns a human-readable type label, falling back to legacy classification
 */
export function getVendorTypeLabel(vendor: Vendor): string {
  if (vendor.relationshipType) {
    return RELATIONSHIP_LABELS[vendor.relationshipType];
  }
  return vendor.classification || "Belum diklasifikasi";
}

/**
 * Derives default tax treatment based on entity type
 */
export function getTaxTreatment(vendor: Vendor): string {
  if (vendor.entityType === "business") return "PPh 23 (2%)";
  if (vendor.entityType === "individual") return "PPh 21";
  return "Belum jelas";
}

/**
 * Returns structured capability data for the adaptive detail view
 */
export function getCapabilityDisplay(vendor: Vendor): Array<{
  section: string;
  fields: Array<{ label: string; value: string | string[] | undefined }>;
}> {
  if (!vendor.relationshipType) return [];
  
  const sections = [];
  
  if (vendor.relationshipType === "vendor_rental") {
    sections.push({
      section: "Peralatan & Layanan",
      fields: [
        { label: "Kategori", value: vendor.rentalCategories },
        { label: "Sub-kategori", value: vendor.rentalSubcategories },
        { label: "Operator", value: vendor.withOperator === "always" ? "Selalu disertakan" :
                                    vendor.withOperator === "optional" ? "Optional (dry hire)" :
                                    vendor.withOperator === "dry_hire_only" ? "Dry hire saja" : "" },
        { label: "Kapasitas", value: vendor.capacityNotes },
        { label: "Layanan Termasuk", value: vendor.includedServices },
        { label: "Layanan Tambahan", value: vendor.addonServices },
        { label: "Pricing Model", value: vendor.pricingModel },
      ],
    });
  } else if (vendor.relationshipType === "vendor_supply") {
    sections.push({
      section: "Produk & Pengiriman",
      fields: [
        { label: "MOQ", value: vendor.minimumOrderQty },
        { label: "Lead Time", value: vendor.leadTime },
        { label: "Layanan Pendukung", value: vendor.addonServices },
      ],
    });
  } else if (vendor.relationshipType === "talent") {
    sections.push({
      section: "Profil Performer",
      fields: [
        { label: "Tipe", value: vendor.performerType },
        { label: "Genre / Spesialisasi", value: vendor.genre },
        { label: "Pengalaman", value: vendor.experienceCount },
        { label: "Bahasa", value: vendor.languages },
        { label: "Rider", value: vendor.riderNotes },
      ],
    });
  } else if (vendor.relationshipType === "crew_lead") {
    sections.push({
      section: "Profil Crew Lead & Tim",
      fields: [
        { label: "Role Utama", value: vendor.crewRole },
        { label: "Komposisi Tim", value: vendor.teamComposition },
        { label: "Total Tim", value: vendor.teamSize },
        { label: "Pengalaman Tim", value: vendor.teamExperience },
        { label: "Day Rate Tim", value: vendor.teamDayRate },
        { label: "Tanggung Jawab Tim", value: vendor.teamResponsibilityAccepted ? "✓ Disetujui" : "Belum disetujui" },
      ],
    });
  } else if (vendor.relationshipType === "crew_individual") {
    sections.push({
      section: "Profil Crew",
      fields: [
        { label: "Role / Spesialisasi", value: vendor.crewRole },
        { label: "Pengalaman", value: vendor.experienceCount },
        { label: "Day Rate", value: vendor.dayRate },
        { label: "Sertifikasi", value: vendor.certifications },
      ],
    });
  } else if (vendor.relationshipType === "freelance") {
    sections.push({
      section: "Profil Creative",
      fields: [
        { label: "Spesialisasi", value: vendor.creativeSpecialty },
        { label: "Software", value: vendor.softwareSkills },
        { label: "Rate", value: vendor.ratePerProject },
        { label: "Turn-around", value: vendor.turnaroundTime },
        { label: "Working Style", value: vendor.workingStyle },
      ],
    });
  } else if (vendor.relationshipType === "eo_partner" || vendor.relationshipType === "talent_agency") {
    sections.push({
      section: "Kapabilitas",
      fields: [
        { label: "Layanan", value: vendor.services },
        { label: "Skala Project", value: vendor.capacityNotes },
        { label: "Pengalaman", value: vendor.experienceCount },
        ...(vendor.teamComposition ? [{ label: "Tim Inti", value: vendor.teamComposition }] : []),
      ],
    });
  } else if (vendor.relationshipType === "vendor_service") {
    sections.push({
      section: "Kapabilitas Jasa",
      fields: [
        { label: "Layanan", value: vendor.services },
        { label: "Kapasitas", value: vendor.capacityNotes },
        { label: "Pricing", value: vendor.pricingModel },
      ],
    });
  }
  
  if (vendor.operatingCities?.length) {
    sections.push({
      section: "Cakupan Geografis",
      fields: [
        { label: "Kota Operasi", value: vendor.operatingCities },
      ],
    });
  }
  
  return sections;
}
