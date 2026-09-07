const QRCode = require('qrcode');
const Encounter = require('../models/Encounter');
const { analyzeMedicalDocument } = require('../services/geminiService');
const { detectRedFlags, buildStructuredSummary } = require('../services/aiEngine');

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

    // Parse symptoms & interview answers safely
    let parsedSymptoms = [];
    if (symptoms) {
      parsedSymptoms = typeof symptoms === 'string' ? JSON.parse(symptoms) : symptoms;
    }

    let parsedAnswers = {};
    if (interviewAnswers) {
      parsedAnswers = typeof interviewAnswers === 'string' ? JSON.parse(interviewAnswers) : interviewAnswers;
    }

    // 1. Generate Token Number (e.g., V-4821)
    const tokenNumber = 'V-' + Math.floor(1000 + Math.random() * 9000);

    // 2. Run Red Flag Detection on Chief Complaint & Answers
    const combinedText = `${chiefComplaint || ''} ${Object.values(parsedAnswers).join(' ')} ${parsedSymptoms.join(' ')}`;
    const redFlags = detectRedFlags(combinedText);

    // 3. Build Structured HPI (SOCRATES + AYUSH)
    const structuredHpi = buildStructuredSummary(parsedAnswers, careMode);

    // 4. Process Multi-File Uploads with Gemini Multimodal AI
    const uploadedDocuments = [];
    const allSuspectedDiseases = [];
    const allKeywords = new Set();
    let highestRiskScore = redFlags.length > 0 ? 85 : 15;

    

// In backend/controllers/intakeController.js (inside submitKioskSession):

if (req.files && req.files.length > 0) {
  for (const file of req.files) {
    let aiResult = null;
    try {
      aiResult = await analyzeMedicalDocument(file.path, file.mimetype);
    } catch (err) {
      console.error(`Analysis failed for ${file.originalname}:`, err.message);
    }

    if (aiResult) {
      if (aiResult.risk_score && aiResult.risk_score > highestRiskScore) {
        highestRiskScore = aiResult.risk_score;
      }
      
      // Collect findings as keywords
      if (Array.isArray(aiResult.findings)) {
        aiResult.findings.forEach((f) => {
          const text = typeof f === 'object' ? f.text : f;
          allKeywords.add(text.slice(0, 35));
        });
      }

      // Collect suspected conditions
      if (Array.isArray(aiResult.suspected_conditions)) {
        aiResult.suspected_conditions.forEach((sc) => allSuspectedDiseases.push(sc));
      } else if (aiResult.predicted_condition) {
        allSuspectedDiseases.push({
          condition: aiResult.predicted_condition,
          confidence: '90%',
          severity: aiResult.risk_score >= 70 ? 'SEVERE' : 'MODERATE',
          trigger: aiResult.summary || 'Multimodal Scan Extraction'
        });
      }

      uploadedDocuments.push({
        filename: file.filename,
        original_name: file.originalname,
        file_path: `/uploads/${file.filename}`,
        mime_type: file.mimetype,
        doc_type: aiResult.doc_type || 'RADIOLOGY_XRAY',
        extracted_data: aiResult
      });
    }
  }
}

    // Determine Overall Risk Level
    let overallRisk = 'SAFE';
    if (highestRiskScore >= 75 || redFlags.length > 0) {
      overallRisk = 'SEVERE';
    } else if (highestRiskScore >= 45) {
      overallRisk = 'MODERATE';
    }

    const triageSummary = {
      risk_level: overallRisk,
      risk_score: highestRiskScore,
      red_flags: redFlags,
      suspected_diseases: allSuspectedDiseases.length > 0 ? allSuspectedDiseases : [
        {
          disease: chiefComplaint || 'General OPD Consultation',
          confidence: '80%',
          severity: overallRisk,
          trigger: 'Self-reported intake'
        }
      ],
      highlighted_keywords: Array.from(allKeywords),
      clinical_note: `${overallRisk} priority OPD intake. Care mode: ${careMode.toUpperCase()}. Red flags: ${redFlags.length}.`
    };

    // 5. Generate QR Code Data URL
    const qrPayload = JSON.stringify({
      tokenNumber,
      patientName: fullName,
      age,
      gender,
      riskLevel: overallRisk,
      timestamp: new Date().toISOString()
    });
    const qrCodeBase64 = await QRCode.toDataURL(qrPayload);

    // 6. Save Encounter to MongoDB
    const encounter = new Encounter({
      token_number: tokenNumber,
      patient: {
        full_name: fullName || 'Patient',
        age: Number(age) || 0,
        gender: gender || 'Male',
        phone: phone || '',
        abha_id: abhaId || null
      },
      care_mode: careMode,
      chief_complaint: chiefComplaint || 'General Checkup',
      symptoms: parsedSymptoms,
      interview_answers: parsedAnswers,
      structured_hpi: structuredHpi,
      triage_summary: triageSummary,
      documents: uploadedDocuments,
      qr_code_data: qrCodeBase64,
      status: 'WAITING'
    });

    await encounter.save();

    return res.status(201).json({
      success: true,
      tokenNumber,
      qrCodeBase64,
      sessionId: encounter._id,
      triage: triageSummary
    });
  } catch (err) {
    console.error('intakeController submit error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};