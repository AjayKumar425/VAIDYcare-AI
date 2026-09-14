const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const PYTHON_AI_URL = 'http://localhost:8000';
const upload = multer();

router.post('/analyze-complaint', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_AI_URL}/api/ai/analyze-complaint`, req.body);
    res.json(response.data);
  } catch (err) {
    console.error("AI Engine Error (NLP):", err.message);
    res.status(500).json({ error: "Failed to reach AI NLP engine" });
  }
});

router.post('/predict-diagnosis', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_AI_URL}/api/ai/predict-diagnosis`, req.body);
    res.json(response.data);
  } catch (err) {
    console.error("AI Engine Error (Diagnosis):", err.message);
    res.status(500).json({ error: "Failed to reach AI Diagnosis engine" });
  }
});

router.post('/ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    const response = await axios.post(`${PYTHON_AI_URL}/api/ai/ocr`, formData, {
      headers: formData.getHeaders()
    });
    res.json(response.data);
  } catch (err) {
    console.error("AI Engine Error (OCR):", err.message);
    res.status(500).json({ error: "Failed to reach AI OCR engine" });
  }
});

// ML Keyword Flagging Engine (full intake submission)
router.post('/flag-keywords', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_AI_URL}/api/ai/flag-keywords`, req.body);
    res.json(response.data);
  } catch (err) {
    console.error("AI Engine Error (Keyword Flagging):", err.message);
    res.status(500).json({ error: "Failed to reach AI Keyword Flagging engine" });
  }
});

// NEW: Real-time classify-intake (live as patient types in the kiosk)
router.post('/classify-intake', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_AI_URL}/api/ai/classify-intake`, req.body, {
      timeout: 3000  // fast timeout for real-time UX
    });
    res.json(response.data);
  } catch (err) {
    // Gracefully degrade — return empty response so UI stays functional
    console.warn("AI classify-intake unavailable:", err.message);
    res.json({
      overall_condition: "STABLE",
      overall_color: "GREEN",
      flagged_keywords: [],
      red_count: 0,
      yellow_count: 0,
      green_count: 0,
    });
  }
});

// NEW: Prescription keyword extractor (handwritten Rx OCR → structured drugs)
router.post('/parse-prescription', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_AI_URL}/api/ai/parse-prescription`, req.body, {
      timeout: 10000
    });
    res.json(response.data);
  } catch (err) {
    console.error('AI parse-prescription error:', err.message);
    res.status(500).json({
      error: 'Prescription AI engine unavailable',
      medicines: [],
      diagnoses: [],
      rx_risk_level: 'LOW'
    });
  }
});

module.exports = router;
