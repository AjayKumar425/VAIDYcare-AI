const Encounter = require('../models/Encounter');
const { detectRedFlags, buildStructuredSummary } = require('../services/aiEngine');
const QRCode = require('qrcode');
const path = require('path');
const { analyzeMedicalDocumentWithGemini } = require('../services/geminiService');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CRITICAL_KEYWORDS = [
  'chest pain',
  'breathlessness',
  'shortness of breath',
  'unconscious',
  'fainting',
  'severe bleeding',
  'seizure',
  'stroke'
];

// Top of backend/controllers/intakeController.js
const { detectRedFlags, buildStructuredSummary } = require('../services/aiEngine');

// Inside submitKioskSession:
exports.submitKioskSession = async (req, res) => {
  try {
    const {
      fullName,
      age,
      gender,
      phone,
      abhaId,
      chiefComplaint,
      symptoms,
      careMode = 'general',
      interviewAnswers
    } = req.body;

    const parsedAnswers = typeof interviewAnswers === 'string'
      ? JSON.parse(interviewAnswers || '{}')
      : (interviewAnswers || {});

    // 1. Run Rule-Based Red Flag Detection on Chief Complaint + Interview
    const fullTextCorpus = `${chiefComplaint || ''} ${Object.values(parsedAnswers).join(' ')}`;
    const redFlags = detectRedFlags(fullTextCorpus);

    let highestRiskScore = 10;
    const allKeywords = new Set();

    if (redFlags.length > 0) {
      highestRiskScore = Math.max(highestRiskScore, 90);
      redFlags.forEach((rf) => allKeywords.add(rf.split(':')[0]));
    }

    // 2. Build Structured HPI Summary
    const structuredHpi = buildStructuredSummary(parsedAnswers, careMode);

    // [Keep the existing multer req.files loop & Gemini document analyzer here...]
    // When computing overallRisk:
    let overallRisk = 'SAFE';
    if (highestRiskScore >= 75) overallRisk = 'SEVERE';
    else if (highestRiskScore >= 45) overallRisk = 'MODERATE';

    const triage = {
      risk_level: overallRisk,
      risk_score: highestRiskScore,
      red_flags: redFlags,
      suspected_diseases: allSuspectedDiseases.map((d) => ({
        disease: d.condition || d.disease || 'General Pathology',
        confidence: d.confidence || '85%',
        severity: d.severity || 'MODERATE',
        trigger: d.trigger || 'Diagnostic Report Finding'
      })),
      highlighted_keywords: Array.from(allKeywords),
      clinical_note: `${overallRisk} Priority: [${careMode.toUpperCase()}] intake with ${redFlags.length} active red flags.`
    };

    const newEncounter = new Encounter({
      token_number: tokenNumber,
      patient: {
        full_name: fullName || 'Patient',
        age: Number(age) || 0,
        gender: gender || 'Other',
        phone: phone || '',
        abha_id: abhaId || null
      },
      care_mode: careMode,
      chief_complaint: chiefComplaint || 'Routine Medical Consultation',
      symptoms: parsedSymptoms,
      interview_answers: parsedAnswers,
      structured_hpi: structuredHpi,
      triage_summary: triage,
      documents: uploadedDocuments,
      qr_code_data: qrCodeBase64
    });

    await newEncounter.save();

    return res.status(201).json({
      success: true,
      tokenNumber,
      qrCodeBase64,
      sessionId: newEncounter._id,
      triage
    });
  } catch (error) {
    console.error('Submission Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};