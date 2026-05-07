"use client";

import { EntityType, RelationshipType, VendorIntakeV2Payload } from "@/lib/vendor/types";
import styles from "../styles.module.css";

// Import all 9 variants
import { CapVendorRental } from "./capability/CapVendorRental";
import { CapVendorService } from "./capability/CapVendorService";
import { CapVendorSupply } from "./capability/CapVendorSupply";
import { CapEoPartner } from "./capability/CapEoPartner";
import { CapTalentAgency } from "./capability/CapTalentAgency";
import { CapTalent } from "./capability/CapTalent";
import { CapCrewLead } from "./capability/CapCrewLead";
import { CapCrewIndividual } from "./capability/CapCrewIndividual";
import { CapFreelance } from "./capability/CapFreelance";

interface Step4Props {
  entityType: EntityType;
  relationshipType: RelationshipType;
  formData: Partial<VendorIntakeV2Payload>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export function Step4Capability({ entityType, relationshipType, formData, onChange, errors }: Step4Props) {
  const renderVariant = () => {
    const props = { formData, onChange, errors };
    
    switch (relationshipType) {
      case "vendor_rental": return <CapVendorRental {...props} />;
      case "vendor_service": return <CapVendorService {...props} />;
      case "vendor_supply": return <CapVendorSupply {...props} />;
      case "eo_partner": return <CapEoPartner entityType={entityType} {...props} />;
      case "talent_agency": return <CapTalentAgency {...props} />;
      case "talent": return <CapTalent {...props} />;
      case "crew_lead": return <CapCrewLead {...props} />;
      case "crew_individual": return <CapCrewIndividual {...props} />;
      case "freelance": return <CapFreelance {...props} />;
      default: return <div>Tipe hubungan tidak dikenali</div>;
    }
  };

  return (
    <div className={styles.stepContent}>
      {renderVariant()}
    </div>
  );
}
