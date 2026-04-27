const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmployee = (employee) => {
  const normalized = {};
  for (const key in employee) {
    const val = employee[key];
    normalized[key] = typeof val === 'string' ? val.trim() : val;
  }
  if (normalized.emp_code !== undefined) {
    normalized.emp_code = String(normalized.emp_code).trim();
  }
  if (normalized.email) {
    normalized.email = normalized.email.toLowerCase();
  }
  if (normalized.salary !== undefined && normalized.salary !== '') {
    const parsed = Number(normalized.salary);
    if (!isNaN(parsed)) normalized.salary = parsed;
  }
  return normalized;
};

const validateEmployees = (employeesArray) => {
  const valid = [];
  const invalid = [];

  employeesArray.forEach((employee, index) => {
    const row = normalizeEmployee(employee);
    const errors = [];
    const excelRow = index + 2; // +1 for 0-based index, +1 for header row

    if (!row.emp_code) errors.push('Missing emp_code');
    if (!row.first_name) errors.push('Missing first_name');
    if (!row.email) {
      errors.push('Missing email');
    } else if (!EMAIL_REGEX.test(row.email)) {
      errors.push('Invalid email format');
    }

    if (row.salary !== undefined && row.salary !== '' && isNaN(row.salary)) {
      errors.push('Salary must be a number');
    }

    if (errors.length > 0) {
      invalid.push({ excelRow, row, errors });
    } else {
      valid.push({ ...row, excelRow });
    }
  });

  return { valid, invalid };
};

module.exports = { validateEmployees };
