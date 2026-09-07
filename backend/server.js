const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const intakeRoutes = require('./routes/intakeRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const authRoutes = require('./routes/authRoutes');

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
  res.json({ status: 'OK', message: 'VAIDYcare-AI Gateway Running with Gemini 3.6 Multimodal' });
});

app.listen(PORT, () => {
  console.log(`VAIDYcare-AI Gateway running on http://localhost:${PORT}`);
});