const xlsx = require('xlsx');

const parseShiftExcel = (fileBuffer) => {
  const workbook = xlsx.read(fileBuffer, {
    type: 'buffer',
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  return rows
    .map((row) => {
      const normalized = {};

      for (const key in row) {
        const rawKey = key.trim().toLowerCase();
        const value = row[key];

        // 🔥 MAP EXCEL HEADERS → DB FIELDS
        if (rawKey.includes('date')) {
          normalized.date =
            value instanceof Date
              ? value.toISOString().split('T')[0]
              : String(value).trim();
        }

        if (rawKey.includes('shift')) {
          normalized.shift_type = String(value).trim().toLowerCase();
        }

        if (rawKey.includes('required') || rawKey.includes('count')) {
          normalized.required_count = Number(value);
        }
      }

      return normalized;
    })
    .filter(
      (row) =>
        row.date &&
        row.shift_type &&
        Number.isFinite(row.required_count)
    );
};

module.exports = { parseShiftExcel };