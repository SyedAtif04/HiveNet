const express = require('express');
const router = express.Router();
const multer = require('multer');

const { uploadShiftRequirements } = require('../controllers/shiftController');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/', upload.single('file'), uploadShiftRequirements);

module.exports = router;