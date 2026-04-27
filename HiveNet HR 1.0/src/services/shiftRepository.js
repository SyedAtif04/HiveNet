const pool = require('../config/db');

const COLUMNS = ['date', 'shift_type', 'required_count'];
const COL_COUNT = COLUMNS.length;

// Requires UNIQUE constraint on (date, shift_type) in the DB
const insertShiftRequirements = async (validShifts) => {
  if (!validShifts.length) return { inserted: 0 };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const values = [];
    const placeholders = validShifts.map((shift, i) => {
      const offset = i * COL_COUNT;
      values.push(shift.date, shift.shift_type, shift.required_count);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    });

    const query = `
      INSERT INTO shift_requirements (${COLUMNS.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (date, shift_type) DO UPDATE
        SET required_count = EXCLUDED.required_count
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

module.exports = { insertShiftRequirements };
