const pool = require('../config/db');

const generateRoster = async (date) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const reqResult = await client.query(
      `SELECT shift_type, required_count
       FROM shift_requirements
       WHERE date = $1
       ORDER BY required_count DESC`,
      [date]
    );

    if (!reqResult.rows.length) {
      await client.query('ROLLBACK');
      return { assigned: 0, message: 'No shift requirements found for this date' };
    }

    const weeklyResult = await client.query(
      `SELECT employee_id, COUNT(*)::int AS shift_count
       FROM shifts
       WHERE date >= date_trunc('week', $1::date)
         AND date <  date_trunc('week', $1::date) + interval '7 days'
       GROUP BY employee_id`,
      [date]
    );

    const weeklyWorkload = new Map(weeklyResult.rows.map((r) => [r.employee_id, r.shift_count]));
    const inRunWeekly = new Map();
    const assignedInRun = new Set();

    const totalWeeklyScore = (id) => (weeklyWorkload.get(id) ?? 0) + (inRunWeekly.get(id) ?? 0);

    const allAssignments = [];

    for (const req of reqResult.rows) {
      const empResult = await client.query(
        `SELECT e.id
         FROM employees e
         LEFT JOIN shifts s
           ON s.employee_id = e.id AND s.date = $1
         LEFT JOIN leaves l
           ON l.employee_id = e.id
           AND $1 BETWEEN l.start_date AND l.end_date
           AND l.status = 'approved'
         WHERE s.employee_id IS NULL
           AND l.employee_id IS NULL`,
        [date]
      );

      const candidates = empResult.rows
        .filter((e) => !assignedInRun.has(e.id))
        .sort((a, b) => {
          const scoreDiff = totalWeeklyScore(a.id) - totalWeeklyScore(b.id);
          return scoreDiff !== 0 ? scoreDiff : a.id - b.id;
        });

      let filled = 0;
      for (const emp of candidates) {
        if (filled >= req.required_count) break;
        allAssignments.push({ employee_id: emp.id, date, shift_type: req.shift_type });
        assignedInRun.add(emp.id);
        inRunWeekly.set(emp.id, (inRunWeekly.get(emp.id) ?? 0) + 1);
        filled++;
      }
    }

    if (!allAssignments.length) {
      await client.query('ROLLBACK');
      return { assigned: 0, message: 'Not enough employees to fulfill shift requirements' };
    }

    const values = [];
    const placeholders = allAssignments.map((a, i) => {
      const offset = i * 3;
      values.push(a.employee_id, a.date, a.shift_type);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    });

    const result = await client.query(
      `INSERT INTO shifts (employee_id, date, shift_type)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (employee_id, date) DO NOTHING`,
      values
    );

    await client.query('COMMIT');

    return {
      assigned: result.rowCount,
      requested: allAssignments.length,
      shortfall: allAssignments.length - result.rowCount,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { generateRoster };
