"use client";

import { 
  Sliders, 
  Settings, 
  Package, 
  Handshake, 
  Mic, 
  Music, 
  Users, 
  Wrench, 
  Palette 
} from "lucide-react";
import { EntityType, RelationshipType } from "@/lib/vendor/types";
import styles from "../styles.module.css";

interface Step2Props {
  entityType: EntityType;
  value: RelationshipType | null;
  onChange: (v: RelationshipType) => void;
}

export function Step2SubType({ entityType, value, onChange }: Step2Props) {
  const options = entityType === "business" 
    ? [
        { id: "vendor_rental", title: "Vendor Rental", desc: "Sewa alat: Sound, Lighting, LED, dll", icon: <Sliders size={24} />, badge: "Equipment" },
        { id: "vendor_service", title: "Vendor Service", desc: "Jasa: Catering, Security, Cleaning", icon: <Settings size={24} />, badge: "Service" },
        { id: "vendor_supply", title: "Vendor Supply", desc: "Jual barang: Merchandise, Konsumsi", icon: <Package size={24} />, badge: "Supply" },
        { id: "eo_partner", title: "EO Partner", desc: "Kerjasama antar Event Organizer", icon: <Handshake size={24} />, badge: "Partnership" },
        { id: "talent_agency", title: "Talent Agency", desc: "Manajemen artis & talent", icon: <Mic size={24} />, badge: "Management" },
      ]
    : [
        { id: "vendor_rental", title: "Vendor Rental", desc: "Sewa alat: Sound, Lighting, LED, dll", icon: <Sliders size={24} />, badge: "Equipment" },
        { id: "vendor_service", title: "Vendor Service", desc: "Jasa: Catering, Security, Cleaning", icon: <Settings size={24} />, badge: "Service" },
        { id: "vendor_supply", title: "Vendor Supply", desc: "Jual barang: Merchandise, Konsumsi", icon: <Package size={24} />, badge: "Supply" },
        { id: "talent_agency", title: "Talent Agency", desc: "Manajemen artis & talent", icon: <Mic size={24} />, badge: "Management" },
        { id: "eo_partner", title: "EO Partner", desc: "Profesional independen / Freelance PM", icon: <Handshake size={24} />, badge: "Partner" },
        { id: "talent", title: "Individual Talent", desc: "MC, Performer, Artist", icon: <Music size={24} />, badge: "Talent" },
        { id: "crew_lead", title: "Crew Lead", desc: "Leader tim teknis / Koordinator", icon: <Users size={24} />, badge: "Leader" },
        { id: "crew_individual", title: "Individual Crew", desc: "FM, LO, Operator teknis", icon: <Wrench size={24} />, badge: "Crew" },
        { id: "freelance", title: "Creative Freelance", desc: "Designer, Photographer, Editor", icon: <Palette size={24} />, badge: "Creative" },
      ];

  return (
    <div>
      <h2 className={styles.stepTitle}>Pilih Hubungan Kerja</h2>
      <p className={styles.stepDescription}>
        Bagaimana Anda akan bekerjasama dengan JUARA? Pilih kategori yang paling sesuai dengan spesialisasi utama Anda.
      </p>

      <div className={styles.grid}>
        {options.map((opt) => (
          <button 
            key={opt.id}
            className={`${styles.card} ${value === opt.id ? styles.cardSelected : ""}`}
            onClick={() => onChange(opt.id as RelationshipType)}
          >
            <div className={styles.cardIcon}>
              {opt.icon}
            </div>
            <div>
              <span className={styles.cardTitle}>{opt.title}</span>
              <span className={styles.cardDescription}>{opt.desc}</span>
            </div>
            <span className={styles.cardBadge}>{opt.badge}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
