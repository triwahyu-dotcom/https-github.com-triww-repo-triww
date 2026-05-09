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
        { id: "vendor_rental", title: "Equipment Supplier", desc: "Sound system, lighting, LED, rigging, stage. Penyedia alat operasional event.", icon: <Sliders size={24} />, badge: "EQUIPMENT" },
        { id: "vendor_service", title: "Service Provider", desc: "Catering, security, cleaning, logistic. Jasa operasional event.", icon: <Settings size={24} />, badge: "SERVICE" },
        { id: "vendor_supply", title: "Supply Partner", desc: "Merchandise, konsumsi, material event.", icon: <Package size={24} />, badge: "SUPPLY" },
        { id: "eo_partner", title: "EO Partner", desc: "Subkontraktor, co-production, atau crew supplier. Punya tim/agency sendiri untuk eksekusi event.", icon: <Handshake size={24} />, badge: "PARTNER" },
        { id: "talent_agency", title: "Talent Management", desc: "Mengelola roster artis profesional untuk supply ke event. Multiple talent under management.", icon: <Mic size={24} />, badge: "MANAGEMENT" },
      ]
    : [
        { id: "vendor_rental", title: "Equipment Supplier", desc: "Sound system, lighting, LED, rigging, stage. Penyedia alat operasional event.", icon: <Sliders size={24} />, badge: "EQUIPMENT" },
        { id: "vendor_service", title: "Service Provider", desc: "Catering, security, cleaning, logistic. Jasa operasional event.", icon: <Settings size={24} />, badge: "SERVICE" },
        { id: "vendor_supply", title: "Supply Partner", desc: "Merchandise, konsumsi, material event.", icon: <Package size={24} />, badge: "SUPPLY" },
        { id: "talent_agency", title: "Talent Management", desc: "Mengelola roster artis profesional untuk supply ke event. Multiple talent under management.", icon: <Mic size={24} />, badge: "MANAGEMENT" },
        { id: "eo_partner", title: "EO Partner", desc: "Subkontraktor, co-production, atau crew supplier. Punya tim/agency sendiri untuk eksekusi event.", icon: <Handshake size={24} />, badge: "PARTNER" },
        { id: "talent", title: "Performer", desc: "Tampil di event sebagai talent — MC, vocalist, DJ, performer, magician.", icon: <Music size={24} />, badge: "TALENT" },
        { id: "crew_lead", title: "Crew Lead", desc: "Tactical lead untuk tim teknis. Koordinator lapangan dengan tim eksekusi.", icon: <Users size={24} />, badge: "LEADER" },
        { id: "crew_individual", title: "Field Crew", desc: "Eksekusi lapangan — floor manager, LO, runner, operator teknis.", icon: <Wrench size={24} />, badge: "CREW" },
        { id: "freelance", title: "Creative Specialist", desc: "Designer, photographer, videographer, editor. Visual content production.", icon: <Palette size={24} />, badge: "CREATIVE" },
      ];

  return (
    <div>
      <h2 className={styles.stepTitle}>Pilih Tipe Kemitraan</h2>
      <p className={styles.stepDescription}>
        Bagaimana posisi Anda dalam ekosistem JUARA? Tentukan klasifikasi operasional Anda.
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
