const pool = require('../config/db');
const { generateRoster } = require('../services/rosterService');

const SHIFT_TYPES = ['morning', 'afternoon', 'evening', 'night'];

const generateRosterForDate = async (req, res) => {
  try {
    const { date } = req.params;
    const result = await generateRoster(date);
    res.status(200).json(result);
  } catch (err) {
    console.error('Roster generation error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

const getRosterByDate = async (req, res) => {
  try {
    const { date } = req.params;

    const result = await pool.query(
      `SELECT s.shift_type, e.id, e.name
       FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       WHERE s.date = $1
       ORDER BY s.shift_type, e.name`,
      [date]
    );

    const shifts = SHIFT_TYPES.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {});

    for (const row of result.rows) {
      if (shifts[row.shift_type]) {
        shifts[row.shift_type].push({ id: row.id, name: row.name });
      } else {
        shifts[row.shift_type] = [{ id: row.id, name: row.name }];
      }
    }

    res.status(200).json({ date, shifts });
  } catch (err) {
    console.error('Roster fetch error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

module.exports = { generateRosterForDate, getRosterByDate };
