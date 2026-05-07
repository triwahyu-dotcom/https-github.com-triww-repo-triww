/**
 * Shared validators for JUARA Partner V2 Registration
 */

// Email validation (standard format, single email only — block "/" and "atau")
export function validateEmail(email: string): string | null {
  const trimmed = email?.trim();
  if (!trimmed) return "Email wajib diisi";
  if (trimmed.includes("/") || trimmed.toLowerCase().includes(" atau ")) {
    return "Hanya boleh 1 email. Jika ada email cadangan, gunakan field PIC Backup.";
  }
  // Block known typos
  if (trimmed.endsWith(".con")) return "Email berakhir .con, kemungkinan salah ketik. Apakah maksud Anda .com?";
  // Standard email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return "Format email tidak valid";
  return null;
}

// Phone validation (Indonesian format)
export function validatePhone(phone: string): { error: string | null; normalized: string } {
  const trimmed = phone?.trim();
  if (!trimmed) return { error: "Nomor wajib diisi", normalized: "" };
  
  // Strip all non-digit except leading +
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  
  // Normalize: 08... → +628..., 628... → +628..., +628... stays
  let normalized = cleaned;
  if (cleaned.startsWith("08")) {
    normalized = "+62" + cleaned.substring(1);
  } else if (cleaned.startsWith("628")) {
    normalized = "+" + cleaned;
  } else if (cleaned.startsWith("+628")) {
    normalized = cleaned;
  } else if (cleaned.startsWith("8")) {
    normalized = "+62" + cleaned;
  } else if (cleaned.startsWith("+6221") || cleaned.startsWith("021") || cleaned.startsWith("21")) {
    // Landline handle
    if (cleaned.startsWith("021")) normalized = "+6221" + cleaned.substring(3);
    else if (cleaned.startsWith("21")) normalized = "+6221" + cleaned.substring(2);
  } else {
    return { error: "Nomor harus dimulai dengan 08, 62, atau +62", normalized: "" };
  }
  
  // Length check (after normalization: +62 + digits)
  const digitsOnly = normalized.replace(/^\+/, "");
  if (digitsOnly.length < 9 || digitsOnly.length > 15) {
    return { error: "Panjang nomor tidak valid", normalized: "" };
  }
  return { error: null, normalized };
}

// Bank account number (Indonesian banks)
export function validateBankAccount(accNo: string): string | null {
  const trimmed = accNo?.trim().replace(/[\s\-]/g, "");
  if (!trimmed) return "Nomor rekening wajib diisi";
  if (!/^\d+$/.test(trimmed)) return "Nomor rekening hanya boleh angka";
  if (trimmed.length < 8 || trimmed.length > 18) return "Panjang nomor rekening tidak valid (8-18 digit)";
  return null;
}

// Account holder name validation
export function validateAccountHolder(name: string): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return "Nama pemilik rekening wajib diisi";
  if (trimmed.length < 3) return "Nama terlalu pendek";
  
  // Block obvious garbage
  const lower = trimmed.toLowerCase();
  const garbage = ["ya", "tidak", "dana", "ovo", "gopay", "shopeepay", "ada", "ok", "oke"];
  if (garbage.includes(lower)) {
    return "Nama tidak valid. Tulis nama lengkap pemilik rekening sesuai buku tabungan.";
  }
  
  if (/^[\d\s\-\+]+$/.test(trimmed)) {
    return "Field ini untuk nama, bukan nomor.";
  }
  
  // Must have at least 1 alphabetic character
  if (!/[a-zA-Z]/.test(trimmed)) {
    return "Nama harus mengandung huruf";
  }
  return null;
}

// Check if bank account holder name matches vendor name (for business)
export function checkBankNameMismatch(vendorName: string, holderName: string): string | null {
  if (!vendorName || !holderName) return null;
  
  const normalize = (s: string) => s.toLowerCase()
    .replace(/\b(pt|cv|tbk|inc|ltd|ud|pd|firma)\b\.?/gi, "")
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2); // only words > 2 chars
    
  const vendorWords = normalize(vendorName);
  const holderWords = new Set(normalize(holderName));
  
  // Check overlap
  const overlap = vendorWords.filter(w => holderWords.has(w));
  if (overlap.length === 0) {
    return "⚠ Nama rekening berbeda jauh dengan nama vendor. Pastikan ini benar atau siapkan surat kuasa direksi.";
  }
  return null;
}

// NIK validation (16 digit)
export function validateNIK(nik: string): string | null {
  const cleaned = nik?.replace(/[^\d]/g, "");
  if (!cleaned) return "NIK wajib diisi";
  if (cleaned.length !== 16) return "NIK harus 16 digit angka";
  return null;
}

// NPWP validation (15 or 16 digit)
export function validateNPWP(npwp: string, required: boolean = true): string | null {
  const cleaned = npwp?.replace(/[^\d]/g, "");
  if (!cleaned) return required ? "NPWP wajib diisi" : null;
  if (cleaned.length < 15 || cleaned.length > 16) return "NPWP harus 15-16 digit angka";
  return null;
}

// Min length text
export function validateMinLength(value: string, min: number, fieldName: string): string | null {
  const trimmed = value?.trim() || "";
  if (!trimmed) return `${fieldName} wajib diisi`;
  if (trimmed.length < min) return `${fieldName} minimal ${min} karakter`;
  return null;
}
