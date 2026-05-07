import type { Vendor, EntityType, RelationshipType } from "../../src/lib/vendor/types";

export interface MigrationResult {
  vendor: Vendor;
  action: "classify" | "delete" | "skip";
  reason: string;
  newEntityType?: EntityType;
  newRelationshipType?: RelationshipType;
  confidence: "high" | "medium" | "low" | "skip";
  flagForReview: boolean;
}

// === STEP 1: Detect dummy/test entries ===
const DUMMY_NAME_PATTERNS = [
  /^test$/i,
  /^test\s/i,
  /\stest$/i,
  /^dummy/i,
  /^asdf/i,
  /^qwerty/i,
  /^vendor$/i,
  /^partner$/i,
  /^vendor\s+juara$/i,
  /^xxx/i,
  /^\d+$/,           // entirely numeric name
  /^[a-z]{1,3}$/i,   // very short (1-3 chars)
];

const DUMMY_EMAIL_PATTERNS = [
  /^test@/i,
  /^asdf@/i,
  /^a@a/i,
  /@test\./i,
  /@example\./i,
];

export function isDummyEntry(vendor: Vendor): boolean {
  const name = (vendor.name || "").trim();
  const email = (vendor.email || "").trim();
  
  if (!name) return true; // empty name is dummy
  
  for (const pattern of DUMMY_NAME_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  for (const pattern of DUMMY_EMAIL_PATTERNS) {
    if (pattern.test(email)) return true;
  }
  
  return false;
}

// === STEP 2: Detect entityType ===
const BUSINESS_NAME_PREFIXES = /^(pt|cv|ud|tbk|inc|ltd|llc)\b\.?/i;
const BUSINESS_NAME_SUFFIXES = /\b(pt|cv|tbk|inc|ltd)\.?$/i;
const BUSINESS_WORD_PATTERN = /\b(production|productions|productionhouse|rental|services?|management|communication|communications|comm\b|projects?|events?|studio|works?|creative|media|inc|enterprise|co\b|company|consulting|agency|group|corp|industries|jaya|abadi|sejahtera|makmur|bersama|prima|sentosa|raya|utama)\b/i;

export function detectEntityType(vendor: Vendor): { 
  entityType: EntityType; 
  confidence: number;  // 0-100
  reasoning: string;
} {
  const name = (vendor.name || "").trim();
  const legalStatus = vendor.legalStatus;
  const npwp = (vendor.npwpNumber || "").replace(/[^\d]/g, "");
  
  let score = 0;
  let signals: string[] = [];
  
  // Strong business signals
  if (BUSINESS_NAME_PREFIXES.test(name) || BUSINESS_NAME_SUFFIXES.test(name)) {
    score += 50;
    signals.push("name has PT/CV/Tbk");
  }
  
  const hasBusinessWords = BUSINESS_WORD_PATTERN.test(name);
  if (hasBusinessWords && name.split(/\s+/).length >= 2) {
    score += 30;
    signals.push("name contains business word (Production/Rental/Services/etc)");
  }

  if (legalStatus === "PT/CV") {
    score += 40;
    signals.push("legalStatus is PT/CV");
  }
  if (npwp.length === 15 || npwp.length === 16) {
    score += 20;
    signals.push("has valid NPWP length");
  }
  
  // Individual signals
  if (legalStatus === "Freelance/Perorangan") {
    score -= 50;
    signals.push("legalStatus is Freelance");
  }
  
  // Personal name pattern (multiple words, no business indicator)
  const wordCount = name.split(/\s+/).length;
  const hasBusinessAffix = BUSINESS_NAME_PREFIXES.test(name) || BUSINESS_NAME_SUFFIXES.test(name);

  if (wordCount >= 2 && wordCount <= 4 && !hasBusinessAffix && !hasBusinessWords) {
    score -= 20;
    signals.push("looks like personal name");
  }
  
  if (score >= 40) {
    return { entityType: "business", confidence: Math.min(100, 50 + score), reasoning: signals.join("; ") };
  } else {
    return { entityType: "individual", confidence: Math.min(100, 50 + Math.abs(score)), reasoning: signals.join("; ") };
  }
}

// === STEP 3: Detect relationshipType ===

// RENTAL: equipment, transport, vehicles
const RENTAL_KEYWORDS = /\b(sound|lighting|led|rigging|stage|tenda|tent|genset|furniture|kendaraan|vehicle|truss|backdrop|booth|rental|rent\b|sewa|trans\b|transport|pariwisata|tour|car|bus|toilet|portable|sewatoilet|colony rental|rent\s*car)\b/i;

// SERVICE: ongoing services (catering, security, cleaning, etc)
const SERVICE_KEYWORDS = /\b(catering|security|cleaning|photo|video|photographer|videographer|design|legal|logistic|logistik|crowd|guard|usher|dekorasi|dekor|decoration|florist|bunga|liaison|loading|moving|sertifikasi|akustik|sablon|installation|maintenance)\b/i;

// SUPPLY: physical goods that get consumed/owned
const SUPPLY_KEYWORDS = /\b(merchandise|merch|konsumsi|food|beverage|signage|atk|goodie|souvenir|print|printing|stationary|gimmick|hampers|trophy|piala|seragam|uniform|tshirt|kaos)\b/i;

// EO: event organizer / production house
const EO_KEYWORDS = /\b(eo\b|event\s*organizer|event\s*organiser|production\s*house|production\b|wedding\s*organizer|wo\b|management|organizer|producer|productions|projex|projects|events?\b)\b/i;

// TALENT AGENCY: business that manages talents
const TALENT_AGENCY_KEYWORDS = /\b(talent\s*agency|management\s*artis|manajemen\s*artis|artist\s*agency|model\s*agency|booking\s*agency)\b/i;

// TALENT: performers
const TALENT_KEYWORDS = /\b(mc\b|m\.c\.|master\s*of\s*ceremon|singer|vokalis|vocalist|band|dj\b|dancer|dance\s*crew|magician|comedian|performer|talent|penyanyi|host)\b/i;

// CREW LEAD
const CREW_LEAD_KEYWORDS = /\b(show\s*director|stage\s*manager|floor\s*director|production\s*manager|pm\s*lapangan|korlap|wedding\s*organizer\s*lead|sutradara|technical\s*director|td\b)\b/i;

// CREW INDIVIDU
const CREW_KEYWORDS = /\b(floor\s*manager|liaison|lo\b|runner|usher|operator|rigger|switcher|programmer|steward|stagehand|cameramen|kameramen|lighting\s*operator|sound\s*operator|tally|cuekrew|crew)\b/i;

// FREELANCE: creative individuals
const FREELANCE_KEYWORDS = /\b(freelance|freelancer|designer|copywriter|editor|illustrator|content\s*creator|graphic\s*design|art\s*director|creative\s*director|render|3d\s*artist|motion\s*graphic|after\s*effect)\b/i;

export function detectRelationshipType(
  vendor: Vendor,
  entityType: EntityType
): { relationshipType: RelationshipType; confidence: number; reasoning: string } {
  // Get all searchable text from vendor
  const services = Array.isArray((vendor as any).services) 
    ? (vendor as any).services.join(" ") 
    : "";
  const displayType = vendor.displayType || "";
  const classification = vendor.classification || "";
  const vendorName = vendor.name || "";
  
  const searchText = `${vendorName} ${services} ${displayType} ${classification}`.toLowerCase();
  
  // PRIORITY ORDER (most specific → most generic)

  // 1. Talent agency (business + specific keywords)
  if (TALENT_AGENCY_KEYWORDS.test(searchText) && entityType === "business") {
    return { relationshipType: "talent_agency", confidence: 90, reasoning: "talent agency keywords + business" };
  }

  // 2. Specific talent (MC, dance, singer) - works for both individual and business
  if (TALENT_KEYWORDS.test(searchText)) {
    // If business, treat as talent_agency
    if (entityType === "business") {
      return { relationshipType: "talent_agency", confidence: 70, reasoning: "talent keywords + business → likely agency" };
    }
    return { relationshipType: "talent", confidence: 85, reasoning: "talent performer keywords" };
  }

  // 3. Crew lead (specific roles)
  if (CREW_LEAD_KEYWORDS.test(searchText)) {
    return { 
      relationshipType: entityType === "individual" ? "crew_lead" : "vendor_service",
      confidence: 80, 
      reasoning: "crew lead role keywords" 
    };
  }

  // 4. Rental (equipment + transport)
  if (RENTAL_KEYWORDS.test(searchText)) {
    return { relationshipType: "vendor_rental", confidence: 85, reasoning: "rental/equipment/transport keywords" };
  }

  // 5. Specific service categories
  if (SERVICE_KEYWORDS.test(searchText)) {
    return { relationshipType: "vendor_service", confidence: 80, reasoning: "service keywords" };
  }

  // 6. Crew individual (after services)
  if (CREW_KEYWORDS.test(searchText) && entityType === "individual") {
    return { relationshipType: "crew_individual", confidence: 75, reasoning: "crew keywords + individual" };
  }

  // 7. Freelance (specific creative)
  if (FREELANCE_KEYWORDS.test(searchText)) {
    if (entityType === "individual") {
      return { relationshipType: "freelance", confidence: 80, reasoning: "freelance/creative keywords + individual" };
    }
    return { relationshipType: "vendor_service", confidence: 60, reasoning: "creative keywords + business" };
  }

  // 8. EO (broader keywords, lower priority because of "management"/"production" overlap)
  if (EO_KEYWORDS.test(searchText)) {
    return { relationshipType: "eo_partner", confidence: 70, reasoning: "EO/production/management keywords" };
  }

  // 9. Supply
  if (SUPPLY_KEYWORDS.test(searchText)) {
    return { relationshipType: "vendor_supply", confidence: 75, reasoning: "supply/goods keywords" };
  }

  // 10. Fallback
  if (entityType === "individual") {
    return { relationshipType: "freelance", confidence: 30, reasoning: "individual fallback (no clear signal)" };
  }

  // Business fallback based on legacy classification
  if (classification === "Penyedia Barang") {
    return { relationshipType: "vendor_supply", confidence: 40, reasoning: "fallback: legacy Penyedia Barang" };
  }

  return { relationshipType: "vendor_service", confidence: 30, reasoning: "business fallback (no clear signal)" };
}

// === STEP 4: Main classifier ===
export function classifyVendor(vendor: Vendor): MigrationResult {
  // Skip already V2
  if (vendor.entityType && vendor.relationshipType && (vendor as any).submissionMetadata?.formVersion !== "v2.0-migrated") {
    return {
      vendor,
      action: "skip",
      reason: "already has native V2 fields",
      confidence: "skip",
      flagForReview: false,
    };
  }
  
  // Detect dummy
  if (isDummyEntry(vendor)) {
    return {
      vendor,
      action: "delete",
      reason: `dummy/test entry detected (name: "${vendor.name}", email: "${vendor.email}")`,
      confidence: "skip",
      flagForReview: false,
    };
  }
  
  // Classify
  const entityResult = detectEntityType(vendor);
  const relationshipResult = detectRelationshipType(vendor, entityResult.entityType);
  
  const combinedConfidence = (entityResult.confidence + relationshipResult.confidence) / 2;
  
  let confidenceLevel: "high" | "medium" | "low";
  if (combinedConfidence >= 80) confidenceLevel = "high";
  else if (combinedConfidence >= 55) confidenceLevel = "medium";
  else confidenceLevel = "low";
  
  return {
    vendor,
    action: "classify",
    reason: `Entity: ${entityResult.reasoning} | Rel: ${relationshipResult.reasoning}`,
    newEntityType: entityResult.entityType,
    newRelationshipType: relationshipResult.relationshipType,
    confidence: confidenceLevel,
    flagForReview: confidenceLevel === "low" || combinedConfidence < 60,
  };
}
