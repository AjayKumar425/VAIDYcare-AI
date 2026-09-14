const QRCode = require('qrcode');
const Encounter = require('../models/Encounter');
const { analyzeMedicalDocument } = require('../services/geminiService');
const { detectRedFlags, buildStructuredSummary } = require('../services/aiEngine');
const axios = require('axios');

const PYTHON_AI_URL = 'http://localhost:8000';

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
    // Collect all document text for feeding into the Python ML keyword engine
    const documentFindings = [];
    let highestRiskScore = redFlags.length > 0 ? 85 : 15;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let aiResult = null;
        try {
          console.log(`Analyzing document: ${file.originalname} (${file.mimetype})`);
          aiResult = await analyzeMedicalDocument(file.path, file.mimetype);
        } catch (err) {
          console.error(`Gemini analysis failed for ${file.originalname}:`, err.message);
        }

        if (aiResult) {
          // ── Update highest risk score ──────────────────────────────────────
          if (aiResult.risk_score && aiResult.risk_score > highestRiskScore) {
            highestRiskScore = aiResult.risk_score;
          }

          // ── Collect bullet point findings as keywords (FIXED: was aiResult.findings) ──
          if (Array.isArray(aiResult.essential_bullet_points)) {
            aiResult.essential_bullet_points.forEach((bp) => {
              const text = typeof bp === 'object' ? bp.text : bp;
              if (text) {
                allKeywords.add(text.slice(0, 60));
                documentFindings.push(text); // feed into ML keyword engine
              }
              // Auto-escalate risk based on RED flags from document analysis
              if (bp.flag === 'RED' && highestRiskScore < 80) highestRiskScore = 80;
              if (bp.flag === 'YELLOW' && highestRiskScore < 45) highestRiskScore = 45;
            });
          }

          // ── Collect full_report_text for NLP analysis ──────────────────────
          if (aiResult.full_report_text) {
            documentFindings.push(aiResult.full_report_text);
          }

          // ── Collect one_line_summary ───────────────────────────────────────
          if (aiResult.one_line_summary) {
            documentFindings.push(aiResult.one_line_summary);
          }

          // ── Collect predicted_condition ────────────────────────────────────
          if (aiResult.predicted_condition) {
            documentFindings.push(aiResult.predicted_condition);
          }

          // ── Collect suspected_conditions (FIXED: was aiResult.suspected_conditions but Gemini returned predicted_condition) ──
          if (Array.isArray(aiResult.suspected_conditions) && aiResult.suspected_conditions.length > 0) {
            aiResult.suspected_conditions.forEach((sc) => {
              allSuspectedDiseases.push({
                disease: sc.disease || sc.condition,
                confidence: sc.confidence || '85%',
                severity: sc.severity || (aiResult.risk_score >= 70 ? 'SEVERE' : 'MODERATE'),
                trigger: sc.trigger || aiResult.one_line_summary || 'Multimodal document analysis'
              });
            });
          } else if (aiResult.predicted_condition) {
            allSuspectedDiseases.push({
              disease: aiResult.predicted_condition,
              confidence: '85%',
              severity: aiResult.risk_score >= 70 ? 'SEVERE' : 'MODERATE',
              trigger: aiResult.one_line_summary || 'Multimodal document analysis'
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

    // 5. Call Python NLP on chief complaint
    let nlpKeywords = [];
    try {
      const nlpRes = await axios.post(`${PYTHON_AI_URL}/api/ai/analyze-complaint`, {
        text: chiefComplaint || ''
      });
      if (nlpRes.data && nlpRes.data.medical_terms) {
        nlpRes.data.medical_terms.forEach(t => allKeywords.add(t));
        nlpKeywords = nlpRes.data.medical_terms;
      }
    } catch (err) {
      console.log('Python NLP Engine offline or error:', err.message);
    }

    // 6. Call Python ML Keyword Flagging Engine
    //    Now includes ALL document findings text so the engine sees what's in reports
    let flaggedKeywords = [];
    let overallCondition = 'STABLE';
    let overallConditionColor = 'GREEN';
    try {
      const flagRes = await axios.post(`${PYTHON_AI_URL}/api/ai/flag-keywords`, {
        chief_complaint: chiefComplaint || '',
        interview_answers: parsedAnswers,
        symptoms: [
          ...parsedSymptoms,
          ...documentFindings   // <<< FIXED: feed document findings into ML engine
        ]
      });
      if (flagRes.data && flagRes.data.flagged_keywords) {
        flaggedKeywords = flagRes.data.flagged_keywords;
        overallCondition = flagRes.data.overall_condition || 'STABLE';
        overallConditionColor = flagRes.data.overall_color || 'GREEN';

        // Auto-escalate risk score based on ML engine assessment
        if (overallConditionColor === 'RED' && highestRiskScore < 75) {
          highestRiskScore = 80;
        } else if (overallConditionColor === 'YELLOW' && highestRiskScore < 45) {
          highestRiskScore = 50;
        }

        flaggedKeywords.forEach(k => allKeywords.add(k.keyword));
      }
    } catch (err) {
      console.log('Python Keyword Flagging Engine offline or error:', err.message);
    }

    // 7. Call Python Differential Diagnosis Prediction
    let aiDiagnoses = [];
    try {
      const diagRes = await axios.post(`${PYTHON_AI_URL}/api/ai/predict-diagnosis`, {
        socrates_data: structuredHpi
      });
      if (diagRes.data && diagRes.data.top_diagnoses) {
        aiDiagnoses = diagRes.data.top_diagnoses.map(d => ({
          disease: d.disease,
          confidence: `${Math.round(d.probability * 100)}%`,
          severity: d.probability > 0.8 ? 'HIGH' : 'MODERATE',
          trigger: d.rationale
        }));
      }
    } catch (err) {
      console.log('Python Diagnosis Engine offline or error:', err.message);
    }

    // 8. Determine Overall Risk Level
    let overallRisk = 'SAFE';
    if (highestRiskScore >= 75 || redFlags.length > 0) {
      overallRisk = 'SEVERE';
    } else if (highestRiskScore >= 45) {
      overallRisk = 'MODERATE';
    }

    // Merge AI diagnoses with document-extracted suspected conditions
    const finalSuspectedDiseases =
      aiDiagnoses.length > 0
        ? [...aiDiagnoses, ...allSuspectedDiseases]
        : allSuspectedDiseases.length > 0
          ? allSuspectedDiseases
          : [{ disease: chiefComplaint || 'General OPD Consultation', confidence: '80%', severity: overallRisk, trigger: 'Self-reported intake' }];

    // Deduplicate suspected diseases
    const seenDiseases = new Set();
    const uniqueDiseases = finalSuspectedDiseases.filter(d => {
      const key = (d.disease || '').toLowerCase();
      if (seenDiseases.has(key)) return false;
      seenDiseases.add(key);
      return true;
    });

    // Build rich clinical note
    const docSummaries = uploadedDocuments
      .map(d => d.extracted_data?.one_line_summary)
      .filter(Boolean)
      .join(' | ');

    const triageSummary = {
      risk_level: overallRisk,
      risk_score: highestRiskScore,
      red_flags: redFlags,
      suspected_diseases: uniqueDiseases,
      highlighted_keywords: Array.from(allKeywords),
      flagged_keywords: flaggedKeywords,
      overall_condition: overallCondition,
      overall_condition_color: overallConditionColor,
      document_count: uploadedDocuments.length,
      clinical_note: [
        `${overallRisk} priority OPD intake.`,
        `Care mode: ${careMode.toUpperCase()}.`,
        `Red flags detected: ${redFlags.length}.`,
        `AI condition assessment: ${overallCondition}.`,
        uploadedDocuments.length > 0 ? `Documents analyzed: ${uploadedDocuments.length}. Findings: ${docSummaries || 'See documents tab'}.` : '',
        `Chief complaint: "${chiefComplaint}".`
      ].filter(Boolean).join(' ')
    };

    // 9. Generate QR Code
    const qrPayload = JSON.stringify({
      tokenNumber,
      patientName: fullName,
      age,
      gender,
      riskLevel: overallRisk,
      timestamp: new Date().toISOString()
    });
    const qrCodeBase64 = await QRCode.toDataURL(qrPayload);

    // 10. Save Encounter to MongoDB
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