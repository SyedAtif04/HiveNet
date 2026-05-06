const pool = require('../config/db');

const STATIC_QA = [
  {
    match: ['generate roster', 'auto roster', 'auto generate', 'create roster', 'roster generation'],
    answer: 'To auto-generate a roster, go to **Roster Planner** and click **Auto-Generate** for the selected date. The system assigns available employees based on weekly workload balance, skipping anyone already assigned or on approved leave.',
  },
  {
    match: ['upload employee', 'import employee', 'add employee', 'employee data', 'employee file'],
    answer: 'Go to **Upload Data** and use the Employee Upload section. Upload an **.xlsx file** with columns: emp_code, first_name, last_name, email, role, department, salary. Duplicate emp_codes are automatically skipped.',
  },
  {
    match: ['upload shift', 'shift requirement', 'shift schedule', 'shift data', 'import shift'],
    answer: 'Go to **Upload Data** and use the Shift Requirements section. Upload an **.xlsx file** with columns: date (YYYY-MM-DD), shift_type (morning/afternoon/night), required_count.',
  },
  {
    match: ['what shifts', 'shift types', 'morning shift', 'afternoon shift', 'night shift', 'shifts available'],
    answer: 'Three shifts are configured:\n\n- **Morning** — 06:00 to 14:00\n- **Afternoon** — 14:00 to 22:00\n- **Night** — 22:00 to 06:00\n\nShift assignments can be viewed and managed in the **Roster Planner**.',
  },
  {
    match: ['overtime', 'who worked overtime', 'overtime employees'],
    answer: 'Overtime tracking is not yet configured in this system. You can view all shift assignments for any day in the **Roster Planner** to identify double shifts.',
  },
  {
    match: ['help', 'what can you do', 'capabilities', 'what do you know', 'what can you help'],
    answer: 'I can help with the following HR queries:\n\n- **Employee count** — total headcount\n- **Leave status** — who is on leave today, pending requests\n- **Shift shortfall** — understaffed slots for today\n- **Roster info** — how to generate and manage rosters\n- **Data uploads** — employee and shift requirement files\n\nTry asking: "How many employees do we have?" or "Who is on leave today?"',
  },
];

const DYNAMIC_QA = [
  {
    match: ['how many employees', 'total employees', 'headcount', 'staff count', 'employee count'],
    handler: async () => {
      const res = await pool.query('SELECT COUNT(*)::int AS count FROM employees');
      const n   = res.rows[0].count;
      return `We currently have **${n} employee${n !== 1 ? 's' : ''}** in the system.`;
    },
  },
  {
    match: ['on leave today', 'who is on leave', 'absent today', 'leave today', 'employees on leave'],
    handler: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res   = await pool.query(
        `SELECT e.name FROM employees e
         JOIN leaves l ON l.employee_id = e.id
         WHERE $1::date BETWEEN l.start_date AND l.end_date AND l.status = 'approved'`,
        [today]
      );
      if (!res.rows.length) return 'No employees are on approved leave today.';
      const names = res.rows.map(r => `**${r.name}**`).join(', ');
      return `Today **${res.rows.length} employee${res.rows.length !== 1 ? 's' : ''}** ${res.rows.length === 1 ? 'is' : 'are'} on approved leave: ${names}.`;
    },
  },
  {
    match: ['pending leave', 'leave request', 'leave approval', 'approve leave', 'pending approval'],
    handler: async () => {
      const res = await pool.query(
        `SELECT COUNT(*)::int AS count FROM leaves WHERE status = 'pending'`
      );
      const n = res.rows[0].count;
      return `There ${n === 1 ? 'is' : 'are'} **${n} pending leave request${n !== 1 ? 's' : ''}** awaiting manager approval.`;
    },
  },
  {
    match: ['shift shortfall', 'understaffed', 'unfilled shift', 'shift gap', 'missing staff'],
    handler: async () => {
      const today = new Date().toISOString().split('T')[0];
      const [scheduled, requirements] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM shifts WHERE date = $1`, [today]),
        pool.query(
          `SELECT COALESCE(SUM(required_count), 0)::int AS total FROM shift_requirements WHERE date = $1`,
          [today]
        ),
      ]);
      const shortfall = Math.max(0, requirements.rows[0].total - scheduled.rows[0].count);
      if (shortfall === 0) return 'All shifts are fully staffed today — no shortfall detected.';
      return `Current shift shortfall: **${shortfall} unfilled position${shortfall !== 1 ? 's' : ''}** for today. Go to **Roster Planner** and click **Auto-Generate** to fill them.`;
    },
  },
  {
    match: ['department', 'departments', 'which department', 'list department'],
    handler: async () => {
      const res = await pool.query(
        `SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department`
      );
      if (!res.rows.length) return 'No department data found in the system yet.';
      const depts = res.rows.map(r => `**${r.department}**`).join(', ');
      return `Departments in the system: ${depts}.`;
    },
  },
];

const DEFAULT_REPLY =
  "I can help with HR-related queries. Try asking about **employee count**, **shift assignments**, **leave requests**, or **roster generation**. Type **help** to see all available topics.";

const chat = async (req, res) => {
  const message = (req.body.message || '').toLowerCase().trim();

  for (const qa of STATIC_QA) {
    if (qa.match.some(kw => message.includes(kw))) {
      return res.json({ response: qa.answer });
    }
  }

  for (const qa of DYNAMIC_QA) {
    if (qa.match.some(kw => message.includes(kw))) {
      try {
        const answer = await qa.handler();
        return res.json({ response: answer });
      } catch (err) {
        console.error('Chat DB error:', err.message);
        return res.status(500).json({ message: 'Failed to query data', error: err.message });
      }
    }
  }

  res.json({ response: DEFAULT_REPLY });
};

module.exports = { chat };
