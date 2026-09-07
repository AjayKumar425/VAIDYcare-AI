require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const intakeRoutes = require('./routes/intakeRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Global Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded medical scan images statically
app.use('/uploads', express.static(uploadDir));

// Health Check & Root Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'VAIDYcare-AI Gateway',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.status(200).send('VAIDYcare-AI Backend Gateway is Live');
});

// Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/doctor', doctorRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start HTTP Listener
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 VAIDYcare-AI Gateway running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`=========================================`);
});