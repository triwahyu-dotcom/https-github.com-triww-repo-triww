const xlsx = require('xlsx');
const path = require('path');

const filePath = '/Users/yudiqitrick/Desktop/PROJECT TRACKER JUARA/Knowledge base/Freelance Per Position Database.xlsx';
const workbook = xlsx.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  console.log(`\n--- ${sheetName} ---`);
  console.log(data.slice(0, 3)); // Show first 3 rows
});
