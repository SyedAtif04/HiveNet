const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { parseEmployeeExcel } = require('../services/employeeExcelParser');

router.get('/parse-excel', (req, res) => {
  const filePath = path.resolve(__dirname, '../../test/employees.xlsx');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Test file not found', path: filePath });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const data = parseEmployeeExcel(fileBuffer);

  res.status(200).json({
    message: 'Parsed successfully',
    count: data.length,
    data,
  });
});

module.exports = router;
