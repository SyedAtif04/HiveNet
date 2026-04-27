const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const uploadRoutes = require('./routes/uploadRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const testRoute = require('./routes/testRoute');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/upload', uploadRoutes);
app.use('/api/upload/shifts', shiftRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/test', testRoute);

app.get('/', (_req, res) => {
  res.send('API is running...');
});

module.exports = app;
