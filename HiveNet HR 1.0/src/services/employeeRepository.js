const pool = require('../config/db');

const COLUMNS = ['emp_code', 'name', 'email', 'role', 'department', 'salary'];
const COL_COUNT = COLUMNS.length;

const insertEmployees = async (validEmployees) => {
  if (!validEmployees.length) return { inserted: 0 };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const values = [];
    const placeholders = validEmployees.map((emp, i) => {
      const offset = i * COL_COUNT;
      const name = [emp.first_name, emp.last_name].filter(Boolean).join(' ');
      values.push(
        emp.emp_code,
        name,
        emp.email,
        emp.role || 'staff',
        emp.department || null,
        emp.salary !== undefined && emp.salary !== '' ? Number(emp.salary) : null
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
    });

    const query = `
      INSERT INTO employees (${COLUMNS.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (emp_code) DO NOTHING
    `;

    const result = await client.query(query, values);
    await client.query('COMMIT');

    return { inserted: result.rowCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { insertEmployees };
