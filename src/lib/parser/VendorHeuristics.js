/**
 * List of known vendors based on PT Juara / GAPEMPI ecosystem
 */
export const KNOWN_VENDORS = [
  'WIDIA 3D', 'MATA VISUAL', 'DAXSO', 'SG PROD', 'KOBINDO', 
  'EL BRAMO', 'S - Net', 'FLAT PROD', 'STEVEN', 'PRAMUKA DIGITAL', 
  'ARTA ADVERTISING', 'REVI', 'UNPAZZ DANCER', 'HARMONI CHOIR', 
  'DIDI EMERALD', 'LEONI', 'YUM YUM CATERING', 'JOKO SANTOSO',
  'REZA ADITYA', 'BRAMANTYA PUTRA PRADHIKTA', 'ROSYID ALFATONI',
  'ADI PRASTYONO', 'DIMAS PUTRO WISONO', 'RIZKY WANDI SAPUTRA',
  'MAULANA RASYID', 'AGUNG HARDIAWAN', 'WIDDY ZANWAR KUSMIATY',
  'NUR ALAMSYAH', 'R. FAMAL SUWANDA', 'SEPTIAN BAYU ADJI',
  'DODY FEBRIANTO', 'EKA RACHMADHANY', 'HARI WIBOWO',
  'AMBARUKMI HAYUNING TYAS', 'NAUFAL SHAFLY RACHMAN',
  'KANIA YUNIAR', 'MUHAMMAD ARBIA RIJALDI', 'APRILIA FATIMAH',
  'M. RAYHAN FIKRIZAL', 'FAHREZA PUTRA PRASETYO', 'JACINDA NAJLA BASHIRA'
];

/**
 * Finds the first known vendor mentioned in a string of text.
 * Case-insensitive matching.
 */
export function findKnownVendor(text) {
  if (!text) return null;
  const upperText = text.toUpperCase();
  
  // Try exact matches from the list
  for (const vendor of KNOWN_VENDORS) {
    if (upperText.includes(vendor.toUpperCase())) {
      return vendor;
    }
  }
  
  return null;
}
