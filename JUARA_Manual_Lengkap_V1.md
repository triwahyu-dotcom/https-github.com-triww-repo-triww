# JUARA WORKSPACE: PANDUAN OPERASIONAL TERPADU (V1.0)
*Dokumentasi Resmi untuk Seluruh Divisi: AE, PM, Finance, & Management*

---

## BAB 1: DASHBOARD UTAMA (THE COMMAND CENTER)
Dashboard adalah wajah pertama aplikasi yang merangkum kesehatan bisnis JUARA secara real-time.

### 1.1 Barisan Statistik Utama (Top Widgets)
- **Leads & Pitching**: Total nilai Rupiah dari proyek yang statusnya masih 'Lead' atau 'Pitching'. Angka ini membantu Management melihat potensi omzet ke depan.
- **On Going Projects**: Nilai proyek yang sedang berjalan (Status: Negotiation, Execution, Reporting, Finance).
- **Billed / Completed**: Total nilai proyek yang sudah selesai 100%.
- **Grand Total Value**: Akumulasi seluruh proyek yang pernah masuk ke sistem.

### 1.2 Widget Monitoring AR (Account Receivable) - *Sangat Penting!*
Ini adalah fitur baru untuk mengontrol arus kas:
- **Total Outstanding AR**: Jumlah tagihan yang belum dibayar klien (Status Invoiced + Pending).
- **Overdue (Menunggak)**: Tagihan yang sudah dikirim (**Invoiced**) tapi sudah melewati **Due Date** (Tanggal Jatuh Tempo). Jika widget ini berwarna **Merah**, tim Finance/AE harus segera melakukan penagihan.

---

## BAB 2: MODUL PROJECT TRACKER (DIVISI AE & PM)
Modul ini digunakan untuk melacak perjalanan sebuah proyek dari ide hingga pelunasan.

### 2.1 Menambah Proyek Baru
1. Klik **"+ Add Project"** (Tombol Biru, Kanan Atas).
2. **Project Name**: Masukkan nama yang unik.
3. **Client Selection**: Jika klien belum ada, klik **"+ Add New Client"**. Jangan memaksakan memilih klien yang salah.
4. **Project Value**: Masukkan angka bersih (misal: 150000000). Sistem akan otomatis mengubahnya menjadi Rp 150.000.000.
5. **Owners (AE)**: Ketik nama AE yang menangani. Jika lebih dari satu, pisahkan dengan koma (Contoh: `Ubaid, Yudi`). Nama **Ubaidullah** akan otomatis disinkronkan menjadi **Ubaid** untuk konsistensi data.

### 2.2 Mengelola Detail Proyek (Project Card)
Klik nama proyek untuk membuka jendela detail. Di sini ada 4 tab utama:
- **TAB ACTIVITY**: Mencatat otomatis setiap kali status proyek berubah. Berguna untuk audit jika ada proyek yang "stuck" terlalu lama di satu tahap.
- **TAB TASKS**: Daftar periksa (Checklist) operasional. Centang setiap tugas yang selesai. Progres bar di atas akan bergerak otomatis.
- **TAB MILESTONES**: Titik pencapaian penting.
    - Input: `Technical Meeting`, `Loading Barang`, `Event Day`.
    - Klik lingkaran di sebelah kiri hingga menjadi hijau untuk menandai "Done".
- **TAB BILLING (Kunci Data AR)**:
    - Masukkan Termin (Contoh: `DP 50%`, `Pelunasan`).
    - **Status PENDING**: Baru rencana.
    - **Status INVOICED**: Tagihan sudah dikirim ke klien (Wajib isi *Due Date*).
    - **Status PAID**: Uang sudah masuk (Otomatis mengupdate status *Partial/Paid* di dashboard).

---

## BAB 3: MODUL CRM (CUSTOMER RELATIONSHIP)
Pusat database klien untuk strategi marketing ke depan.

### 3.1 Profil Klien
- Setiap klien memiliki **Lifetime Value** (Total uang yang pernah dibayarkan ke JUARA).
- **AE Assigned**: Mengetahui AE mana yang memegang akun klien tersebut secara dominan.
- **Contact List**: Simpan nomor WhatsApp dan email PIC klien di sini agar AE lain bisa tetap memantau jika AE utama berhalangan.

---

## BAB 4: MODUL FINANCE & RFP (REQUEST FOR PAYMENT)
Alur pengajuan uang keluar untuk vendor atau freelancer.

### 4.1 Langkah PM (Pengajuan)
1. Buka menu **Finance & RFP**.
2. Pilih Proyek yang sedang dijalankan.
3. Upload dokumen pendukung (PO dari klien atau Kontrak Vendor).
4. Klik **Create RFP**. Pilih Vendor dan masukkan nominal.

### 4.2 Langkah Approver (Management/Director)
1. Buka dashboard Finance bagian **Operational**.
2. Lihat daftar RFP yang berstatus `Submitted`.
3. Klik **Approve** untuk memberikan lampu hijau bagi Finance untuk membayar.

### 4.3 Langkah Finance (Pembayaran)
1. Setelah status RFP menjadi `Approved`, Finance melakukan transfer bank.
2. Upload bukti transfer ke sistem.
3. Ubah status menjadi `Paid`. Status ini akan terlihat oleh PM secara real-time, sehingga PM tahu vendor sudah dibayar.

---

## BAB 5: MODUL VENDOR MANAGEMENT
Database seluruh supplier dan mitra kerja JUARA.

### 5.1 Registrasi Vendor
- Vendor mendaftar mandiri via **`partner.juaraevent.id`**.
- Mereka akan mengisi legalitas (NPWP, NIB) dan profil perusahaan.

### 5.2 Approval & Rating
- Tim Procurement memeriksa dokumen vendor baru di menu **Vendors**.
- **Rating (1-5 Bintang)**: Sangat penting diisi setelah event selesai. Vendor dengan rating rendah (di bawah 3.5) akan muncul dengan peringatan agar tidak digunakan lagi di proyek selanjutnya.

---

## BAB 6: FITUR KOLABORASI
- **Presence**: Di pojok kanan atas, jika ada avatar rekan Anda, berarti mereka sedang online. Arahkan mouse untuk melihat nama mereka.
- **Logout**: Selalu gunakan tombol **Logout** saat selesai, terutama jika menggunakan komputer kantor, untuk melindungi data sensitif keuangan perusahaan.

---

*Hak Cipta © 2026 JUARA Workspace. Dokumen ini bersifat rahasia dan hanya untuk penggunaan internal.*
