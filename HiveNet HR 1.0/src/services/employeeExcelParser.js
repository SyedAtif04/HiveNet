const xlsx = require('xlsx');

const parseEmployeeExcel = (fileBuffer) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const employees = rows
    .map((row) => {
      const cleaned = {};
      for (const key in row) {
        const trimmedKey = key.trim();
        const trimmedValue = typeof row[key] === 'string' ? row[key].trim() : row[key];
        cleaned[trimmedKey] = trimmedValue;
      }
      return cleaned;
    })
    .filter((row) => Object.values(row).some((val) => val !== ''));

  return employees;
};

module.exports = { parseEmployeeExcel };
