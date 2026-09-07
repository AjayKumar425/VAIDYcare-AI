const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const intakeRoutes = require('./routes/intakeRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Expose /uploads directory for static images and PDFs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/doctor', doctorRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'VAIDYcare-AI Gateway',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.status(200).send('VAIDYcare-AI Backend is Live');
});

app.listen(PORT, () => {
  console.log(`VAIDYcare-AI Gateway running on http://localhost:${PORT}`);
});