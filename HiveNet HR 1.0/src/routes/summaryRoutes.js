const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/summaryController');

router.get('/', getSummary);

module.exports = router;
