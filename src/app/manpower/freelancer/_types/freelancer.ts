import { Posisi } from "../_data/posisiList";

export interface AssignmentHistory {
  id: string;
  project_id: string;
  nama_event: string;
  posisi_di_event: Posisi;
  tanggal_mulai: string;
  tanggal_selesai: string;
  rate_aktual: number | null;
  rating_pm: number | null;
  catatan_pm: string;
  status_pembayaran: "belum" | "proses" | "lunas";
}

export interface RekeningBank {
  nama_bank: string;
  no_rekening: string;
  nama_pemilik: string;
}

export interface Freelancer {
  id: string;
  nama: string;
  no_hp: string;
  posisi_utama: Posisi[];
  rate_estimate: {
    [key in Posisi]?: number;
  };
  kota_domisili: string;
  status: "aktif" | "tidak_aktif" | "blacklist" | "on_event";
  rekening_bank: RekeningBank | null;
  nomor_ktp: string;
  foto_url: string | null;
  assignment_history: AssignmentHistory[];
  total_event: number;
  rating_avg: number | null;
  created_at: string;
  updated_at: string;
}
