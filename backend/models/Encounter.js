const mongoose = require('mongoose');

const BiomarkerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, default: '' },
  measured_value: { type: mongoose.Schema.Types.Mixed, default: '' },
  unit: { type: String, default: '' },
  normal_range: { type: String, default: '' },
  ref_min: { type: mongoose.Schema.Types.Mixed, default: null },
  ref_max: { type: mongoose.Schema.Types.Mixed, default: null },
  flag: { type: String, default: 'NORMAL' },
  status: { type: String, default: 'NORMAL' }
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  original_name: { type: String, default: '' },
  file_path: { type: String, default: '' },
  mime_type: { type: String, default: 'image/jpeg' },
  doc_type: { type: String, default: 'Medical Record' },
  raw_extracted_text: { type: String, default: '' },
  biomarkers: [BiomarkerSchema],
  ai_prediction: {
    finding: { type: String, default: '' },
    key_points: [{ type: String }],
    confidence: { type: String, default: '85%' },
    severity: { type: String, default: 'SAFE' }
  },
  extracted_data: { type: mongoose.Schema.Types.Mixed, default: {} }
});

const EncounterSchema = new mongoose.Schema({
  token_number: { type: String, required: true, unique: true },
  patient: {
    full_name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, default: 'Male' },
    phone: { type: String, default: '' },
    abha_id: { type: String, default: null }
  },
  care_mode: { type: String, default: 'general' },
  chief_complaint: { type: String, required: true },
  symptoms: [{ type: String }],
  interview_answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  structured_hpi: { type: mongoose.Schema.Types.Mixed, default: {} },
  triage_summary: {
    risk_level: { type: String, default: 'SAFE' },
    risk_score: { type: Number, default: 10 },
    suspected_diseases: [{ type: mongoose.Schema.Types.Mixed }],
    highlighted_keywords: [{ type: String }],
    red_flags: [{ type: String }],
    clinical_note: { type: String, default: '' }
  },
  documents: [DocumentSchema],
  qr_code_data: { type: String, required: true },
  status: { type: String, default: 'WAITING' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Encounter', EncounterSchema);