const Encounter = require('../models/Encounter');
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

exports.submitKioskSession = async (req, res) => {
  try {
    const { fullName, age, gender, phone, abhaId, chiefComplaint, symptoms } = req.body;

    const tokenNumber = `MED-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrPayload = JSON.stringify({ tokenNumber, phone: phone || '' });
    const qrCodeBase64 = await QRCode.toDataURL(qrPayload);

    let parsedSymptoms = [];
    if (Array.isArray(symptoms)) {
      parsedSymptoms = symptoms;
    } else if (typeof symptoms === 'string') {
      try {
        parsedSymptoms = JSON.parse(symptoms);
      } catch {
        parsedSymptoms = symptoms.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    const uploadedDocuments = [];
    const allSuspectedDiseases = [];
    const allKeywords = new Set();
    let highestRiskScore = 10;

    const combinedIntakeText = `${chiefComplaint || ''} ${parsedSymptoms.join(' ')}`.toLowerCase();
    CRITICAL_KEYWORDS.forEach((kw) => {
      if (combinedIntakeText.includes(kw)) {
        allKeywords.add(kw.toUpperCase());
        highestRiskScore = Math.max(highestRiskScore, 80);
      }
    });

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        if (i > 0) {
          await sleep(1500); // 1.5-sec pause between multi-file uploads to respect rate limits
        }

        const webFilePath = `/uploads/${path.basename(file.path)}`;
        const geminiResult = (await analyzeMedicalDocumentWithGemini(file.path)) || {};

        const currentRisk = geminiResult.risk_level || 'SAFE';
        if (currentRisk === 'SEVERE') highestRiskScore = Math.max(highestRiskScore, 85);
        else if (currentRisk === 'MODERATE') highestRiskScore = Math.max(highestRiskScore, 55);

        (geminiResult.highlighted_keywords || []).forEach((kw) => allKeywords.add(kw));
        (geminiResult.suspected_conditions || []).forEach((sc) => allSuspectedDiseases.push(sc));

        uploadedDocuments.push({
          doc_type: geminiResult.detected_type || 'CLINICAL_REPORT',
          file_path: webFilePath,
          raw_extracted_text: geminiResult.primary_condition || '',
          biomarkers: geminiResult.biomarkers || [],
          ai_prediction: {
            finding: geminiResult.primary_condition || 'Diagnostic Scan Analyzed',
            confidence: geminiResult.confidence || '90%',
            severity: currentRisk,
            key_points: geminiResult.key_points || []
          }
        });
      }
    }

    let overallRisk = 'SAFE';
    if (highestRiskScore >= 75) overallRisk = 'SEVERE';
    else if (highestRiskScore >= 45) overallRisk = 'MODERATE';

    const triage = {
      risk_level: overallRisk,
      risk_score: highestRiskScore,
      suspected_diseases: allSuspectedDiseases.map((d) => ({
        disease: d.condition || d.disease || 'General Pathology',
        confidence: d.confidence || '85%',
        severity: d.severity || 'MODERATE',
        trigger: d.trigger || 'Diagnostic Report Finding'
      })),
      highlighted_keywords: Array.from(allKeywords),
      clinical_note: `${overallRisk} Priority: Intake registered with ${parsedSymptoms.length} symptom(s) and ${uploadedDocuments.length} document(s).`
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
      chief_complaint: chiefComplaint || 'Routine Medical Consultation',
      symptoms: parsedSymptoms,
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
    return res.status(500).json({
      success: false,
      error: error.message,
      triage: {
        risk_level: 'SAFE',
        risk_score: 10,
        suspected_diseases: [],
        highlighted_keywords: [],
        clinical_note: 'Standard intake registered.'
      }
    });
  }
};