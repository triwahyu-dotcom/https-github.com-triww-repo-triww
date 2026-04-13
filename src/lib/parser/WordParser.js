import mammoth from 'mammoth';
import { findKnownVendor } from './VendorHeuristics';

/**
 * Smart Word Extraction for Juara Finance
 * Extracts text from .docx files and identifies financial fields using heuristics.
 */
export const parseWordAttachment = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        const fullText = result.value; 
        
        const data = extractFieldsFromText(fullText);
        resolve({
          success: true,
          data: data,
          rawText: fullText
        });
      } catch (err) {
        console.error('Word parsing error:', err);
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

function extractFieldsFromText(text) {
  const data = {
    vendorName: '',
    amount: 0,
    bankName: '',
    accountNo: '',
    accountName: '',
    description: ''
  };

  const amountPatterns = [
    /(?:grand total|total summary|total bayar|total main ac|total setelah diskon)\s?[:.]?\s?([\d.,\s]+(?:Rp|idr)?)/i,
    /(?:Rp|idr|amount|nominal)\s?[:.]?\s?([\d.,\s]+)/i,
    /([\d.,\s]+)Rp/i 
  ];

  const foundAmounts = [];
  for (const pattern of amountPatterns) {
    const matches = text.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      let valStr = match[1].replace(/Rp|idr/gi, '').trim();
      if (/^\d(\s\d{3})+/.test(valStr)) valStr = valStr.replace(/\s/g, '');
      
      if (valStr.includes(',') && valStr.split(',').pop().length <= 2) {
        valStr = valStr.substring(0, valStr.lastIndexOf(',')).replace(/\./g, '');
      } else {
        valStr = valStr.replace(/\./g, '').replace(/,/g, '');
      }
      const val = parseFloat(valStr) || 0;
      if (val > 1000) foundAmounts.push(val);
    }
  }
  
  if (foundAmounts.length > 0) {
    data.amount = Math.max(...foundAmounts);
  }

  const compositeBankMatch = text.match(/(?:bank account|rekening)\s?[:.]?\s?([A-Z\s]{2,10})\s?[-]\s?(\d[\d\s-]{5,20})\s?\(([^)]+)\)/i);
  if (compositeBankMatch) {
    data.bankName = compositeBankMatch[1].trim();
    data.accountNo = compositeBankMatch[2].replace(/\D/g, '');
    data.accountName = compositeBankMatch[3].trim();
  } else {
    const bankMatches = {
      bankName: text.match(/(?:bank|nama bank)\s?[:.]?\s?([A-Z\s]{2,15})/i),
      accountNo: text.match(/(?:accounts? number|rekening|no rek)\s?[:.]?\s?(\d[\d\s-]{5,20})/i),
      accountName: text.match(/(?:account name|nama pemilik|nama rekening)\s?[:.]?\s?([A-Z\s.]{3,30})/i)
    };
    
    if (bankMatches.bankName) data.bankName = bankMatches.bankName[1].trim();
    if (bankMatches.accountNo) data.accountNo = bankMatches.accountNo[1].replace(/\D/g, '');
    if (bankMatches.accountName) data.accountName = bankMatches.accountName[1].trim();
  }

  const knownVendor = findKnownVendor(text);
  if (knownVendor) {
    data.vendorName = knownVendor;
  } else {
    const vendorMatch = text.match(/(?:vendor|penerima|pay to|supplier)\s?[:.]?\s?([A-Z\s.]{3,40})/i);
    if (vendorMatch) {
      data.vendorName = vendorMatch[1].trim();
    }
  }

  const descMatch = text.match(/(?:description|keperluan|detail|pekerjaan|perihal)\s?[:.]?\s?([A-Z0-9\s.,]{3,50})/i);
  if (descMatch) {
    data.description = descMatch[1].trim();
  }

  return data;
}
