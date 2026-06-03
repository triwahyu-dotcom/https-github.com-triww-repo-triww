import React from 'react';

export type TypeBadgeVariant = 
  | 'eo_partner' | 'vendor_jasa' | 'vendor_rental' | 'vendor_supply' | 'talent' | 'talent_agency' | 'freelance' | 'crew_lead'
  | 'brand' | 'government' | 'co_partner' | 'ngo' | 'media';

const TYPE_CONFIG: Record<TypeBadgeVariant, { label: string; color: string }> = {
  eo_partner:    { label: 'EO Partner',    color: '#E6863C' },
  vendor_jasa:   { label: 'Vendor Jasa',   color: '#58A6FF' },
  vendor_rental: { label: 'Vendor Rental', color: '#7F77DD' },
  vendor_supply: { label: 'Vendor Supply', color: '#3FB950' },
  talent:        { label: 'Talent',        color: '#D29922' },
  talent_agency: { label: 'Talent Agency', color: '#EF9F27' },
  freelance:     { label: 'Freelance',     color: '#5DCAA5' },
  crew_lead:     { label: 'Crew Lead',     color: '#8B949E' },
  
  // CRM categories
  brand:         { label: 'Brand',         color: '#AFA9EC' },
  government:    { label: 'Government',    color: '#5DCAA5' },
  co_partner:    { label: 'Co. Partner',   color: '#85B7EB' },
  ngo:           { label: 'NGO',           color: '#EF9F27' },
  media:         { label: 'Media',         color: '#ED93B1' },
};

export function TypeBadge({ variant }: { variant: TypeBadgeVariant | string }) {
  const norm = (variant || '').toLowerCase().trim().replace(/\s+/g, '_');
  let key: TypeBadgeVariant = 'vendor_jasa';

  if (norm === 'eo_partner' || norm === 'eo') key = 'eo_partner';
  else if (norm === 'vendor_jasa' || norm === 'jasa' || norm === 'vendor_service' || norm === 'service') key = 'vendor_jasa';
  else if (norm === 'vendor_rental' || norm === 'rental') key = 'vendor_rental';
  else if (norm === 'vendor_supply' || norm === 'supply' || norm === 'goods' || norm === 'penyedia_barang') key = 'vendor_supply';
  else if (norm === 'talent') key = 'talent';
  else if (norm === 'talent_agency' || norm === 'agency') key = 'talent_agency';
  else if (norm === 'freelance' || norm === 'freelancer') key = 'freelance';
  else if (norm === 'crew_lead' || norm === 'crew') key = 'crew_lead';
  else if (norm === 'brand') key = 'brand';
  else if (norm === 'government' || norm === 'gov') key = 'government';
  else if (norm === 'co_partner' || norm === 'co._partner' || norm === 'copartner') key = 'co_partner';
  else if (norm === 'ngo') key = 'ngo';
  else if (norm === 'media') key = 'media';
  else if (norm in TYPE_CONFIG) {
    key = norm as TypeBadgeVariant;
  }

  const config = TYPE_CONFIG[key] || TYPE_CONFIG.vendor_jasa;
  const label = config.label;
  const color = config.color;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 'var(--radius-sm)',
      fontSize: 11,
      fontWeight: 500,
      color,
      background: `${color}26`,       /* 15% opacity */
      border: `1px solid ${color}4D`, /* 30% opacity */
      whiteSpace: 'nowrap',
    }}>
      ● {label}
    </span>
  );
}
