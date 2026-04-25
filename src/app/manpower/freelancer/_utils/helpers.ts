import { AssignmentHistory, Freelancer } from "../_types/freelancer";

export function formatHP(hp: string): string {
  const digits = hp.replace(/\D/g, "");
  let normalized = digits;
  if (digits.startsWith("62")) {
    normalized = "0" + digits.slice(2);
  }
  
  if (normalized.length < 10) return normalized;
  
  return normalized.replace(/(\d{4})(\d{4})(\d{1,})/, "$1-$2-$3");
}

export function formatRupiah(angka: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(angka);
}

export function getRateTertinggi(rate_estimate: Freelancer['rate_estimate']): number | null {
  const values = Object.values(rate_estimate).filter((v): v is number => typeof v === 'number');
  return values.length > 0 ? Math.max(...values) : null;
}

export function getEventTerakhir(history: AssignmentHistory[]): string {
  if (history.length === 0) return '—';
  const sorted = [...history].sort(
    (a, b) => new Date(b.tanggal_mulai).getTime() - new Date(a.tanggal_mulai).getTime()
  );
  return sorted[0].nama_event;
}

export function hitungRatingAvg(history: AssignmentHistory[]): number | null {
  const ratings = history.map(h => h.rating_pm).filter((r): r is number => r !== null);
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}
