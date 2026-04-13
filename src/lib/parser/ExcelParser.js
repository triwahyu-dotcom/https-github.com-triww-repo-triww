import * as XLSX from 'xlsx';
import { findKnownVendor } from './VendorHeuristics';

/**
 * Juara Finance Excel Parser
 * Specializes in parsing "(FORMAT) CE & AC" files.
 */
export const parseCEandAC = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const sheetName = workbook.SheetNames.find(s => s.includes('CE') || s.includes('Budget')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const categories = [
        { key: 'A', name: 'Permit & Retribusi', search: ['permit', 'retribusi', 'ijin'] },
        { key: 'B', name: 'Venue Set-Up System', search: ['venue', 'sound', 'lighting', 'dekor'] },
        { key: 'C', name: 'Talent', search: ['talent', 'artist', 'pengisi acara'] },
        { key: 'D', name: 'Participant', search: ['participant', 'peserta'] },
        { key: 'E', name: 'Committee', search: ['committee', 'panitia'] },
        { key: 'F', name: 'Operational & Equipment', search: ['operational', 'ops', 'logistik'] },
        { key: 'G', name: 'Services', search: ['services', 'management', 'fee'] }
      ];

      const resultCategories = [];
      let totalBudget = 0;

      jsonData.forEach(row => {
        if (!row || row.length < 2) return;
        
        const cellA = String(row[0] || '').toLowerCase();
        const cellB = String(row[1] || '').toLowerCase();
        
        categories.forEach(cat => {
          const matchFound = cat.search.some(term => cellA.includes(term) || cellB.includes(term));
          if (matchFound) {
            const amount = row.find((val, idx) => idx > 0 && typeof val === 'number');
            if (amount) {
              resultCategories.push({
                name: cat.name,
                budget: amount,
                actual: 0
              });
              totalBudget += amount;
            }
          }
        });
      });

      if (resultCategories.length === 0) {
        jsonData.forEach(row => {
          row.forEach(cell => {
             if (typeof cell === 'number' && cell > totalBudget) totalBudget = cell;
          });
        });
        
        resultCategories.push({ name: 'Venue & Ops', budget: totalBudget * 0.6, actual: 0 });
        resultCategories.push({ name: 'Talent & Crew', budget: totalBudget * 0.3, actual: 0 });
        resultCategories.push({ name: 'Others', budget: totalBudget * 0.1, actual: 0 });
      }

      const vendorSchedules = [];
      
      jsonData.forEach(row => {
         const amount = row.find(val => typeof val === 'number' && val > 100000);
         const textCells = row.filter(c => typeof c === 'string');
         if (amount && textCells.length >= 2) {
            const vendorName = textCells[0].length > 3 ? textCells[0] : (textCells[1] || 'Vendor');
            
            // Heuristic to find TOP (Dates/Terms) in the same row
            const paymentSchedule = {};
            row.forEach((cell, idx) => {
               const cellStr = String(cell);
               if (typeof cell === 'string' && (/\d+\s[A-Za-z]+/.test(cellStr) || cellStr.toLowerCase().includes('term') || cellStr.toLowerCase().includes('dp'))) {
                  const nextVal = row[idx + 1];
                  if (typeof nextVal === 'number') {
                    const calculatedAmt = nextVal <= 1 ? amount * nextVal : nextVal;
                    paymentSchedule[cellStr] = calculatedAmt;
                  }
               }
            });

            if (Object.keys(paymentSchedule).length > 0 && vendorSchedules.length < 15) {
              vendorSchedules.push({
                 vendor: vendorName.substring(0, 30),
                 total: amount,
                 schedule: paymentSchedule
              });
            }
         }
      });
      
      if (vendorSchedules.length < 2) {
        jsonData.forEach(row => {
          const cells = row.map(c => String(c || '').toLowerCase());
          if (cells.some(c => c.includes('talent') || c.includes('crew'))) {
             const amount = row.find(v => typeof v === 'number' && v > 10000);
             if (amount) {
               vendorSchedules.push({
                 vendor: "Manpower Group",
                 total: amount,
                 schedule: { "Payment 100%": amount }
               });
             }
          }
        });
      }

      resolve({
        success: true,
        projectName: sheetName,
        totalBudget: totalBudget,
        categories: resultCategories,
        vendorSchedules: vendorSchedules
      });
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parses a general attachment (Invoice/PO/SPK) and extracts fields heuristically.
 */
export const parseRFPAttachment = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const extractedData = {
        vendorName: '',
        amount: 0,
        bankName: '',
        accountNo: '',
        accountName: '',
        description: ''
      };

      let fullText = '';
      const foundAmounts = [];

      jsonData.forEach(row => {
        if (!row || row.length === 0) return;
        
        row.forEach((cell, idx) => {
          if (cell === null || cell === undefined) return;
          const content = String(cell);
          fullText += content + ' ';
          const lowerContent = content.toLowerCase();

          // Amount Mapping
          const isAmountLabel = lowerContent.includes('total') || 
                                lowerContent.includes('amount') || 
                                lowerContent.includes('nominal') || 
                                lowerContent.includes('grand total') || 
                                lowerContent.includes('sum');

          if (isAmountLabel || typeof cell === 'number' || /[\d.,]{4,}/.test(content)) {
            let amount = 0;
            if (typeof cell === 'number') {
              amount = cell;
            } else {
               const match = content.match(/([\d.,\s]+)/);
               if (match) {
                  let valStr = match[1].trim();
                  if (/^\d(\s\d{3})+/.test(valStr)) valStr = valStr.replace(/\s/g, '');

                  if (valStr.includes(',') && valStr.split(',').pop().length <= 2) {
                    valStr = valStr.substring(0, valStr.lastIndexOf(',')).replace(/\./g, '');
                  } else {
                    valStr = valStr.replace(/\./g, '').replace(/,/g, '');
                  }
                  amount = parseFloat(valStr) || 0;
               }
            }
            if (amount > 1000) foundAmounts.push(amount);
          }

          // Banking Mapping
          if (lowerContent.includes('bank account')) {
            const composite = String(row[idx + 1] || '');
            const match = composite.match(/([A-Z\s]{2,10})\s?[-]\s?(\d[\d\s-]{5,20})\s?\(([^)]+)\)/i);
            if (match) {
              extractedData.bankName = match[1].trim();
              extractedData.accountNo = match[2].replace(/\D/g, '');
              extractedData.accountName = match[3].trim();
            }
          }

          if (lowerContent.includes('bank name') || lowerContent.includes('nama bank')) {
             extractedData.bankName = row[idx + 1] || extractedData.bankName;
          }
          if (lowerContent.includes('rekening') || lowerContent.includes('number') || lowerContent.includes('no rek')) {
             extractedData.accountNo = String(row[idx + 1] || '').replace(/\D/g, '');
          }
          if (lowerContent.includes('account holder') || lowerContent.includes('nama pemilik')) {
             extractedData.accountName = row[idx + 1] || extractedData.accountName;
          }

          if (lowerContent === 'vendor' || lowerContent === 'penerima') {
            extractedData.vendorName = row[idx + 1] || extractedData.vendorName;
          }
        });
      });

      if (foundAmounts.length > 0) extractedData.amount = Math.max(...foundAmounts);

      const knownVendor = findKnownVendor(fullText);
      if (knownVendor) extractedData.vendorName = knownVendor;

      resolve({
        success: true,
        data: extractedData,
        rawText: fullText
      });
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
