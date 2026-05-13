# Vendor Dashboard Audit — 12 Mei 2026

## Summary
Audit ini dilakukan pasca-migrasi P2 untuk memastikan Admin Dashboard di `/vendors` dapat menampilkan data secara akurat menggunakan skema V2 (entityType & relationshipType). Ditemukan beberapa isu kritikal pada logika penghitungan counter dan redundansi pada filter toolbar yang masih menggunakan logika V1 (legacy). Secara visual dashboard sudah sangat baik, namun secara data masih ada "silent mismatch" antara apa yang ditampilkan di counter dengan data V2 yang sebenarnya.

## Findings

### A. Counter Cards
- **Issue 1**: Logika penghitungan "Penyedia Jasa" & "Penyedia Barang" masih menggunakan field V1.
  - Current behavior: Menggunakan `v.classification === "Penyedia Barang"` yang merupakan data legacy. Banyak vendor V2 yang classification-nya belum ter-update atau "Unknown".
  - Expected: Harus menggunakan `relationshipType`. "Penyedia Barang" adalah `vendor_supply`. "Penyedia Jasa" adalah selain `vendor_supply`.
  - Severity: 🔴 critical (Data counter salah/tidak akurat untuk vendor baru)
  - File reference: `src/components/vendors/VendorDashboard.tsx` line 80 & 359-360
- **Issue 2**: Counter "Approved" tidak eksplisit mengecek status aktif.
  - Current behavior: `v.reviewStatus === "approved"`.
  - Expected: Memastikan hanya menghitung vendor yang aktif (exclude `archived_vendors`). Saat ini `initialData` memang sudah mem-filter active vendors, tapi filter di level UI lebih aman.
  - Severity: 🟢 minor
  - File reference: `src/components/vendors/VendorDashboard.tsx` line 361

### B. Filter Toolbar
- **Issue 1**: Redundansi dan Inkonsistensi Filter V1 vs V2.
  - Current behavior: Ada filter "Classification" (V1), "Services" (V1), dan "Tipe Mitra" (V2) serta "Bentuk Entitas" (V2). Filter "Classification" dan "Services" seringkali tidak memberikan hasil yang akurat untuk vendor V2.
  - Expected: Menghapus filter V1 ("Services / Specialist", "Services", "Type") dan hanya mempertahankan filter V2 yang akurat.
  - Severity: 🟡 medium (Membingungkan admin)
  - File reference: `src/components/vendors/VendorDashboard.tsx` line 411-457
- **Issue 2**: Filter "Search" tidak mencari ke field V2.
  - Current behavior: Hanya mencari ke `v.name` dan `v.category` (V1 category).
  - Expected: Harus mencari ke `relationshipType` labels dan mungkin field capability.
  - Severity: 🟡 medium
  - File reference: `src/components/vendors/VendorDashboard.tsx` line 160-162

### C. Sorting
- **Issue 1**: Logika Sorting Terbatas.
  - Current behavior: Sorting hanya bekerja untuk `sortKey === "registered"`.
  - Expected: Sorting harus bekerja untuk field lain yang ditampilkan seperti "Score" atau "Nama".
  - Severity: 🟡 medium
  - File reference: `src/components/vendors/VendorDashboard.tsx` line 167-171
- **Issue 2**: Handling `registeredTimestamp` untuk vendor tanpa tanggal.
  - Current behavior: Menggunakan `new Date()` sebagai fallback (Line 77).
  - Expected: Fallback yang lebih konsisten agar vendor tanpa tanggal tidak selalu muncul di paling atas saat sort DESC.
  - Severity: 🟢 minor

### D. List Item Rendering
- **Issue 1**: Fallback Label untuk Vendor V1.
  - Current behavior: Menggunakan `v.category` (V1) di atas nama vendor.
  - Expected: Sudah cukup baik, namun bisa lebih dipertegas jika vendor tersebut adalah legacy.
  - Severity: 🟢 minor
  - File reference: `src/components/vendors/VendorDashboard.tsx` line 565

### E. Other Issues
- **Issue 1**: `archived_vendors` tidak terlihat sama sekali.
  - Current behavior: Sesuai ekspektasi (tidak muncul di list). Namun, admin tidak punya cara untuk melihat siapa yang sudah di-archive.
  - Expected: (Future feature) Tab "Archived" jika diperlukan. Untuk saat ini, pastikan counter "Total" tidak menyertakan mereka.
  - Severity: 🟢 minor
- **Issue 2**: Penggunaan `any[]` pada state vendors.
  - Current behavior: `const [vendors, setVendors] = useState<any[]>([]);`.
  - Expected: Gunakan type yang lebih ketat untuk menghindari runtime error.
  - Severity: 🟢 minor

### F. TypeScript & Console
- **Findings**: `npm run build` menunjukkan 375 errors, namun sebagian besar di `mockFreelancers.ts` dan file lain yang tidak terkait langsung dengan VendorDashboard. `VendorDashboard.tsx` sendiri bersih dari type errors yang menghalangi build.
- **Console Warning**: Potensial warning pada `useEffect` dependency array jika ada function yang didefinisikan di luar tapi digunakan di dalam (misal `openVendor`).

## Recommendations

1. **Fix Counter Logic (Priority 1)**: Ubah filter `penyediaJasaCount` dan `penyediaBarangCount` agar menggunakan `relationshipType` dengan fallback ke `classification` V1.
2. **Cleanup Toolbar (Priority 1)**: Hapus filter "Classification" dan "Services" yang berbasis V1. Pertahankan "Tipe Mitra", "Bentuk Entitas", dan "Status".
3. **Enhance Search (Priority 2)**: Update logika `matchSearch` agar mencakup label dari `relationshipType` dan `entityType`.
4. **Fix Sorting (Priority 3)**: Lengkapi logika sorting untuk Score dan Name.
5. **Type Safety (Priority 3)**: Refactor `vendors` state agar menggunakan type `VendorDetail[]`.

## Questions for User

1. Apakah filter "Directory" (Line 381) masih sering digunakan? Saat ini directory hanya menampilkan card view sederhana.
2. Apakah admin membutuhkan tab khusus untuk melihat `archived_vendors` di dashboard ini atau biarkan tetap tersembunyi?
3. Untuk sorting "Tanggal Daftar", jika ada vendor V1 yang tidak punya `sourceTimestamp`, apakah ingin diletakkan di paling bawah secara default?
