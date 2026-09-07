const mongoose = require('mongoose');

const BiomarkerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  measured_value: { type: Number, required: true },
  unit: { type: String, default: '' },
  ref_min: { type: Number, default: 0 },
  ref_max: { type: Number, default: 0 },
  status: { type: String, enum: ['NORMAL', 'LOW', 'HIGH', 'CRITICAL'], default: 'NORMAL' }
});

const DocumentSchema = new mongoose.Schema({
  doc_type: { 
    type: String, 
    enum: [
      'CHEST_XRAY',
      'ORTHO_XRAY',
      'BLOOD_CBC',
      'BIOCHEMISTRY',
      'HANDWRITTEN_RX',
      'CLINICAL_REPORT',
      'BLOOD_REPORT',
      'X_RAY',
      'PRESCRIPTION',
      'DISCHARGE_SUMMARY'
    ],
    default: 'CLINICAL_REPORT'
  },
  file_path: { type: String, required: true },
  raw_extracted_text: { type: String, default: '' },
  biomarkers: [BiomarkerSchema],
  ai_prediction: {
    finding: { type: String, default: '' },
    confidence: { type: String, default: '90%' },
    severity: { type: String, default: 'SAFE' },
    key_points: [{ type: String }]
  },
  created_at: { type: Date, default: Date.now }
});

// In backend/models/Encounter.js
// Add these fields to EncounterSchema:
const EncounterSchema = new mongoose.Schema({
  token_number: { type: String, required: true, unique: true },
  patient: {
    full_name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    phone: { type: String, required: true },
    abha_id: { type: String, default: null }
  },
  care_mode: { type: String, enum: ['general', 'ayush'], default: 'general' },
  chief_complaint: { type: String, required: true },
  symptoms: [{ type: String }],
  interview_answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  structured_hpi: { type: mongoose.Schema.Types.Mixed, default: {} },
  triage_summary: {
    risk_level: { type: String, enum: ['SAFE', 'MODERATE', 'SEVERE'], default: 'SAFE' },
    risk_score: { type: Number, default: 10 },
    suspected_diseases: [
      {
        disease: String,
        confidence: String,
        severity: String,
        trigger: String
      }
    ],
    highlighted_keywords: [{ type: String }],
    red_flags: [{ type: String }],
    clinical_note: { type: String, default: '' }
  },
  documents: [DocumentSchema],
  qr_code_data: { type: String, required: true },
  status: { type: String, enum: ['WAITING', 'IN_CONSULTATION', 'COMPLETED'], default: 'WAITING' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Encounter', EncounterSchema);