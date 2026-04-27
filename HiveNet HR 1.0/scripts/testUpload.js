require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { uploadEmployees } = require('../src/controllers/uploadController');

const filePath = path.resolve(__dirname, '../test/employees.xlsx');

if (!fs.existsSync(filePath)) {
  console.error('❌ Test file not found:', filePath);
  process.exit(1);
}

const req = {
  file: {
    buffer: fs.readFileSync(filePath),
    originalname: 'employees.xlsx',
  },
};

const res = {
  status(code) {
    this._status = code;
    return this;
  },
  json(data) {
    console.log('\n📦 Response Status:', this._status);
    console.log(JSON.stringify(data, null, 2));
  },
};

(async () => {
  console.log('🚀 Running upload pipeline test...\n');
  await uploadEmployees(req, res);
})();
