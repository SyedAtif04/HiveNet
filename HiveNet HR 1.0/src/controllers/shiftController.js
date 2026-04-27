const { parseShiftExcel } = require('../services/shiftExcelParser');
const { validateShifts } = require('../services/shiftValidator');
const { insertShiftRequirements } = require('../services/shiftRepository');

const uploadShiftRequirements = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const parsed = parseShiftExcel(req.file.buffer);
    const { valid, invalid } = validateShifts(parsed);

    if (invalid.length > 0) {
      console.warn(`[Shift Upload] ${invalid.length} invalid row(s) skipped:`);
      invalid.forEach(({ excelRow, errors }) => {
        console.warn(`Row ${excelRow}: ${errors.join(', ')}`);
      });
    }

    let inserted = 0;
    if (valid.length > 0) {
      ({ inserted } = await insertShiftRequirements(valid));
    }

    res.json({
      message: 'Shift requirements processed successfully',
      total: parsed.length,
      inserted,
      failed: invalid.length,
      invalidRows: invalid,
    });

  } catch (err) {
    console.error('Shift upload pipeline error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { uploadShiftRequirements };