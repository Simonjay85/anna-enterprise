const xlsx = require('xlsx');

// Create a dummy workbook simulating the user's excel
const wb = xlsx.utils.book_new();
const wsData = [
  ["DaisyLexi 12-Month Action Plan", null, null, null, null, null, null, null, null],
  ["Phase", "Timeline", "Category", "Task", "Priority", "Platform", "Deliverable", "KPI", "Notes"],
  ["Foundation", "Month 1", "Brand", "Define mission", "High", "Internal", "Brand stmt", "Brand clarity", "Base"],
  ["Foundation", "Month 1", "Brand", "Create mini", "High", "Internal", "Mini guide", "Identity", "Keep simple"]
];
const ws = xlsx.utils.aoa_to_sheet(wsData);
xlsx.utils.book_append_sheet(wb, ws, "12-Month Plan");

// Simmons backend logic
const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1 });
let bestRowIndex = 0;
let maxCols = 0;
for (let i = 0; i < Math.min(10, rawRows.length); i++) {
  const rowProps = rawRows[i]?.filter(c => typeof c === 'string' && c.trim() !== '') || [];
  if (rowProps.length > maxCols) {
    maxCols = rowProps.length;
    bestRowIndex = i;
  }
}

const headers = rawRows[bestRowIndex]?.map(h => String(h).trim()) || [];

const jsonRows = [];
for (let i = bestRowIndex + 1; i < rawRows.length; i++) {
  const r = rawRows[i];
  if (!r || r.length === 0) continue;
  const mappedRow = {};
  for (let c = 0; c < headers.length; c++) {
    if (headers[c]) mappedRow[headers[c]] = r[c];
  }
  const hasData = Object.values(mappedRow).some(v => v !== undefined && v !== null && String(v).trim() !== '');
  if (hasData) jsonRows.push(mappedRow);
}

console.log("Best Row Index:", bestRowIndex);
console.log("Headers:", headers);
console.log("Test Row 0 Task:", jsonRows[0]["Task"]);
