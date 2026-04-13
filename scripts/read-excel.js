const XLSX = require("xlsx");
const path = require("path");

const filePath = "/Users/yudiqitrick/Desktop/PROJECT TRACKER JUARA/Flow - Working System.xlsx";
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== SHEET: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  console.log(JSON.stringify(json, null, 2));
});
