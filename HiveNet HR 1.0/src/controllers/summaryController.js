const pool = require('../config/db');

const getSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [empCount, onLeave, pendingLeaves, scheduled, requirements] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM employees'),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM leaves
         WHERE $1::date BETWEEN start_date AND end_date AND status = 'approved'`,
        [today]
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM leaves WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM shifts WHERE date = $1`, [today]),
      pool.query(
        `SELECT COALESCE(SUM(required_count), 0)::int AS total FROM shift_requirements WHERE date = $1`,
        [today]
      ),
    ]);

    const totalRequired  = requirements.rows[0].total;
    const totalScheduled = scheduled.rows[0].count;
    const shortfall      = Math.max(0, totalRequired - totalScheduled);

    res.json({
      totalEmployees: empCount.rows[0].count,
      onLeaveToday:   onLeave.rows[0].count,
      pendingLeaves:  pendingLeaves.rows[0].count,
      shiftShortfall: shortfall,
    });
  } catch (err) {
    console.error('Summary error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

module.exports = { getSummary };
