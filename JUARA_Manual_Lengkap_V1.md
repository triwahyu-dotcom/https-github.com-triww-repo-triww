# 📘 MANUAL OPERASIONAL: JUARA PROJECT TRACKER
**Versi 1.0 (Mei 2026)**
*Satu Sumber Kebenaran untuk Efisiensi & Transparansi Operasional*

---

## 🚀 PENDAHULUAN
JUARA Project Tracker adalah ekosistem digital yang dirancang untuk mengintegrasikan alur kerja **CRM, Procurement, Project Management, dan Finance**. Manual ini disusun agar setiap anggota tim (AE, PM, Finance, & Procurement) memiliki standar kerja yang sama.

---

## 📂 1. PENGADAAN (PO, SPK, & KONTRAK)
Setiap pengeluaran dana untuk pihak ketiga wajib melalui modul Procurement.

### 1.1 Tipe Dokumen
- **PO (Purchase Order)**: Untuk pembelian/sewa barang atau alat (misal: Sewa LED, Sound System).
- **SPK (Surat Perintah Kerja)**: Untuk jasa tenaga kerja perorangan atau spesialis (misal: Freelance Crew, MC).
- **KONTRAK**: Untuk kerjasama jangka panjang atau nilai proyek yang besar.

### 1.2 Logika Pajak & Gross Up
Sistem secara otomatis menghitung pajak berdasarkan pilihan Anda:
| Pajak | Tarif | Penggunaan |
| :--- | :--- | :--- |
| **PPN** | 11% | Menambah nilai total (untuk Vendor PKP). |
| **PPh 21** | 2.5% | Potongan untuk Jasa Perorangan/Freelancer. |
| **PPh 23** | 2.0% | Potongan untuk Jasa Vendor (Badan Usaha). |

**Mode Pajak:**
- **Potong PPh (Normal)**: Vendor menerima nominal bersih setelah dipotong pajak.
- **Gross Up (Ditanggung JUARA)**: Sistem menaikkan nilai DPP sehingga vendor menerima uang utuh sesuai harga kesepakatan. 
  *Rumus: Subtotal / (1 - Tarif PPh)*.

---

## 🗂️ 2. PROJECT CARD (COMMAND CENTER)
Project Card adalah tempat AE/PM memantau kesehatan proyek secara real-time.

### 2.1 Tab Tasks & Milestones
- **Stage Checklist**: Wajib dicentang setiap kali tugas selesai (Execution, Reporting, dll). Ini menentukan persentase progres di dashboard utama.
- **Custom Milestones**: Masukkan tanggal penting (misal: "Final Layout", "Loading"). Milestone yang terlewat akan ditandai oleh sistem.

### 2.2 Tab Billing (Term of Payment)
- **Status Invoice**: PENDING (Belum ditagih) -> INVOICED (Sudah kirim invoice) -> PAID (Duit masuk).
- **Aturan Emas**: **DP minimal 30%** harus berstatus **PAID** sebelum proyek diizinkan masuk ke fase eksekusi lapangan demi keamanan cashflow.

---

## 🤝 3. VENDOR & RESOURCE MANAGEMENT
JUARA tidak lagi mendaftarkan vendor secara manual, melainkan melalui sistem kurasi.

### 3.1 Alur Pendaftaran (Intake)
1. Vendor mendaftar mandiri via link portal.
2. Vendor mengisi data legalitas, bank, pajak, dan **Link Folder Cloud (Google Drive)**.
3. Vendor mendapatkan **Registration Code** sebagai bukti pendaftaran.

### 3.2 Kebijakan Penyimpanan Data
- **Data Only**: Sistem hanya menyimpan teks (NPWP, Rekening, dll).
- **File Fisik**: Foto KTP/NPWP/Portofolio tetap berada di folder Drive vendor. Sistem hanya menyimpan link-nya. Hal ini dilakukan agar aplikasi tetap cepat dan ringan.

### 3.3 Penilaian (Rating)
Setelah proyek selesai, PM wajib memberikan rating (1-5 bintang). Vendor dengan rating **< 3.0** akan masuk daftar merah (*blacklist*) untuk proyek selanjutnya.

---

## 💰 4. FINANCE & SETTLEMENT
Setiap dana yang keluar melalui **Cash Advance (CA)** wajib dipertanggungjawabkan (Settlement).

### 4.1 Proses Settlement (STL)
Sistem membandingkan dana yang diminta (**Requested**) dengan nota asli (**Actual Spending**):
- **Under Budget**: Ada sisa uang? Wajib dikembalikan ke Finance.
- **Over Budget**: Pengeluaran melebihi budget? Wajib menyertakan catatan alasan untuk approval Director.
- **Nota**: Input deskripsi nota satu per satu agar tercatat di laporan keuangan digital.

---

## 📖 5. CARA MENGAKSES MANUAL INI
Manual ini bersifat interaktif dan dapat diakses kapan saja:
1. Klik Ikon **Buku (User Manual)** di sidebar aplikasi.
2. Gunakan fitur **Pencarian (Ctrl+F)** untuk mencari topik spesifik.
3. **Cetak PDF**: Klik tombol "Print Manual" di pojok kanan atas halaman web manual untuk mendapatkan versi cetak/offline.

---

**© 2026 JUARA Project Tracker. Seluruh hak cipta dilindungi.**
