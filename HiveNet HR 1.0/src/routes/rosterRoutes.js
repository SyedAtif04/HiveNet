const express = require('express');
const router = express.Router();

const { generateRosterForDate, getRosterByDate } = require('../controllers/rosterController');

router.get('/generate/:date', generateRosterForDate);
router.get('/:date', getRosterByDate);

module.exports = router;
