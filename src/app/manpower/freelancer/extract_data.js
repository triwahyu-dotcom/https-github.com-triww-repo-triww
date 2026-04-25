const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = '/Users/yudiqitrick/Desktop/PROJECT TRACKER JUARA/Knowledge base/01_DATABASE_MASTER/Freelance Per Position Database.xlsx';
const workbook = xlsx.readFile(filePath);

const freelancers = {};

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  data.forEach(row => {
    const nama = (row['Nama'] || '').trim();
    const hp = (row['No Handphone'] || '').toString().trim();
    const posisi = (row['Posisi'] || sheetName).trim();
    const rate = row['Rate (Estimate)'] || null;
    const catatan = row['Catatan'] || '';
    
    if (!nama) return;
    
    // Key by name + hp to handle duplicates
    const key = `${nama}_${hp}`;
    
    if (!freelancers[key]) {
      freelancers[key] = {
        id: `f-${Object.keys(freelancers).length + 1}`,
        nama,
        no_hp: hp,
        posisi_utama: [posisi],
        rate_estimate: { [posisi]: rate },
        kota_domisili: '—', // Missing in Excel
        status: 'aktif',
        rekening_bank: null,
        nomor_ktp: '',
        foto_url: null,
        assignment_history: catatan ? [{
          id: `a-${Object.keys(freelancers).length + 1}`,
          project_id: '',
          nama_event: catatan,
          posisi_di_event: posisi,
          tanggal_mulai: '',
          tanggal_selesai: '',
          rate_aktual: rate,
          rating_pm: null,
          catatan_pm: catatan,
          status_pembayaran: 'lunas'
        }] : [],
        total_event: catatan ? 1 : 0,
        rating_avg: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else {
      // Handle multi-position if they appear in multiple sheets
      if (!freelancers[key].posisi_utama.includes(posisi)) {
        freelancers[key].posisi_utama.push(posisi);
      }
      if (rate && !freelancers[key].rate_estimate[posisi]) {
        freelancers[key].rate_estimate[posisi] = rate;
      }
    }
  });
});

const outputData = Object.values(freelancers);

const fileContent = `import { Freelancer } from "../_types/freelancer";

export const MOCK_FREELANCERS: Freelancer[] = ${JSON.stringify(outputData, null, 2)};
`;

fs.writeFileSync('/Users/yudiqitrick/Desktop/PROJECT TRACKER JUARA/vendor-management-app/src/app/manpower/freelancer/_data/mockFreelancers.ts', fileContent);

console.log(`Successfully extracted ${outputData.length} freelancers.`);
