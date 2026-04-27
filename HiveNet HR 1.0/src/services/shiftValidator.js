const VALID_SHIFT_TYPES = ['morning', 'afternoon', 'evening', 'night'];

const toDateString = (val) => {
  if (!val && val !== 0) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString().split('T')[0];
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
};

const validateShifts = (shiftsArray) => {
  const valid = [];
  const invalid = [];

  shiftsArray.forEach((shift, index) => {
    const errors = [];
    const excelRow = index + 2;

    const dateStr = toDateString(shift.date);
    if (!shift.date && shift.date !== 0) {
      errors.push('Missing date');
    } else if (!dateStr) {
      errors.push('Invalid date format');
    }

    const shiftType = typeof shift.shift_type === 'string' ? shift.shift_type.trim().toLowerCase() : shift.shift_type;
    if (!shiftType) {
      errors.push('Missing shift_type');
    } else if (!VALID_SHIFT_TYPES.includes(shiftType)) {
      errors.push(`Invalid shift_type. Must be one of: ${VALID_SHIFT_TYPES.join(', ')}`);
    }

    const count = Number(shift.required_count);
    if (shift.required_count === '' || shift.required_count === undefined) {
      errors.push('Missing required_count');
    } else if (isNaN(count) || !Number.isInteger(count) || count < 1) {
      errors.push('required_count must be a positive integer');
    }

    if (errors.length > 0) {
      invalid.push({ excelRow, row: shift, errors });
    } else {
      valid.push({ excelRow, date: dateStr, shift_type: shiftType, required_count: count });
    }
  });

  return { valid, invalid };
};

module.exports = { validateShifts };
