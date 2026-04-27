const { parseEmployeeExcel } = require('../services/employeeExcelParser');
const { validateEmployees } = require('../services/employeeValidator');
const { insertEmployees } = require('../services/employeeRepository');

const uploadEmployees = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const parsed = parseEmployeeExcel(req.file.buffer);
    const { valid, invalid } = validateEmployees(parsed);

    if (invalid.length > 0) {
      console.warn(`[Upload] ${invalid.length} invalid row(s) skipped:`);
      invalid.forEach(({ excelRow, errors }) => {
        console.warn(`  Row ${excelRow}: ${errors.join(', ')}`);
      });
    }

    let inserted = 0;
    if (valid.length > 0) {
      ({ inserted } = await insertEmployees(valid));
    }

    res.status(200).json({
      message: 'Upload processed successfully',
      total: parsed.length,
      inserted,
      failed: invalid.length,
      invalidRows: invalid.map(({ excelRow, row, errors }) => ({ excelRow, row, errors })),
    });
  } catch (err) {
    console.error('Upload pipeline error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

module.exports = { uploadEmployees };
