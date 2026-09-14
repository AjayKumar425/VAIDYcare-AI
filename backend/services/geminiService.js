// backend/services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

// ── Use correct, available Gemini model names ───────────────────────────────
const ACTIVE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

function getGenAI() {
  if (apiKeys.length === 0) {
    console.error('ERROR: No GEMINI_API_KEY found in backend/.env!');
    return null;
  }
  const key = apiKeys[currentKeyIndex % apiKeys.length];
  return new GoogleGenerativeAI(key);
}

function rotateKey() {
  if (apiKeys.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    console.log(`Rotated to Gemini API Key #${currentKeyIndex + 1}`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function analyzeMedicalDocument(filePath, mimeType) {
  const genAI = getGenAI();

  if (!genAI) {
    console.warn('No Gemini key configured. Using fallback analyzer.');
    return generateSmartFallback(filePath);
  }

  const fileBuffer = fs.readFileSync(filePath);

  let resolvedMime = mimeType || 'image/jpeg';
  if (filePath.endsWith('.png')) resolvedMime = 'image/png';
  else if (filePath.endsWith('.webp')) resolvedMime = 'image/webp';
  else if (filePath.endsWith('.pdf')) resolvedMime = 'application/pdf';

  const filePart = {
    inlineData: {
      data: fileBuffer.toString('base64'),
      mimeType: resolvedMime
    }
  };

  const prompt = `
You are an expert AI clinical radiologist, pathologist, and physician assistant.
Analyze this medical report, scan, lab test, or handwritten prescription with clinical precision.

DO NOT output generic boilerplate or hospital addresses.
Extract real diagnostic insights so the attending doctor saves time and makes fast clinical decisions.

Instructions per report type:
1. X-Ray / CT / MRI / Ultrasound:
   - Identify body part and view (e.g., Chest PA, Left Ankle Lateral).
   - Report exact fracture location, displacement, joint effusion, cardiomegaly, lung opacities, or normal bone alignment.
2. Blood / Lab Report (CBC, LFT, KFT, Lipid):
   - Extract test parameters, observed values, reference ranges, and flags.
   - Summarize what abnormal levels indicate (e.g., "Elevated WBC (16,200/uL) indicates active leukocytosis / infection").
3. Handwritten Prescription / Doctor Note:
   - Extract medicine names, dosage (e.g., 500mg), frequency (e.g., BD/TDS), and instructions.
   - Extract written provisional diagnosis.

Assign clinical severity flags:
- RED: Emergency / Critical (Fracture, Hemorrhage, Pneumothorax, Leukocytosis >15k, Critical lab values)
- YELLOW: Warning / Borderline (Mild elevation, deficiency, soft tissue swelling)
- GREEN: Normal / Safe (No fracture, lung fields clear, normal biomarker ranges)

IMPORTANT: Be thorough. Extract ALL visible findings. If you see blood values, extract ALL of them.
If you see an X-ray, describe EVERYTHING visible — bones, soft tissue, joints, any abnormality.
Extract symptoms and conditions as plain English text so they can be matched against disease keywords.

Respond ONLY with valid raw JSON (no markdown, no code fences):
{
  "doc_type": "RADIOLOGY_XRAY | PATHOLOGY_CBC | BIOCHEMISTRY_PANEL | PRESCRIPTION_RX | CARDIOLOGY_ECG",
  "category_label": "Radiology / X-Ray | Pathology / CBC Panel | Prescription (Rx) | Biochemistry",
  "predicted_condition": "Exact Medical Diagnosis or Primary Finding",
  "one_line_summary": "1 concise clinical sentence summarizing the main finding",
  "full_report_text": "Complete textual summary of everything visible in this document for NLP analysis",
  "essential_bullet_points": [
    {
      "text": "Exact finding with anatomical site or exact lab value",
      "flag": "RED | YELLOW | GREEN",
      "category": "Bone / Imaging | Lab Finding | Diagnosis | Treatment"
    }
  ],
  "extracted_medications": [
    {
      "drug_name": "Medicine name",
      "dosage": "500mg",
      "frequency": "Twice daily (BD)",
      "notes": "After food"
    }
  ],
  "biomarkers": [
    {
      "name": "Parameter Name",
      "value": "Observed value",
      "unit": "Unit",
      "normal_range": "Normal range",
      "flag": "LOW | NORMAL | HIGH | CRITICAL"
    }
  ],
  "suspected_conditions": [
    {
      "disease": "Condition Name",
      "confidence": "85%",
      "severity": "SEVERE | MODERATE | MILD",
      "trigger": "Finding that triggered this suspicion"
    }
  ],
  "risk_score": 75
}
`;

  for (const modelName of ACTIVE_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Calling Gemini [${modelName}] (Attempt ${attempt}/3)...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        });

        const result = await model.generateContent([prompt, filePart]);
        const responseText = result.response.text().trim();
        const cleanJson = responseText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const parsed = JSON.parse(cleanJson);
        console.log(`[${modelName}] SUCCESS: ${parsed.predicted_condition}`);

        // Ensure suspected_conditions always exists for downstream consumers
        if (!Array.isArray(parsed.suspected_conditions)) {
          parsed.suspected_conditions = parsed.predicted_condition ? [{
            disease: parsed.predicted_condition,
            confidence: '85%',
            severity: parsed.risk_score >= 70 ? 'SEVERE' : 'MODERATE',
            trigger: parsed.one_line_summary || 'Gemini multimodal analysis'
          }] : [];
        }

        return parsed;
      } catch (err) {
        console.warn(`[${modelName}] Attempt ${attempt} failed: ${err.message}`);
        if (err.message.includes('503') || err.message.includes('429')) {
          console.log('Rate limit / overload — waiting 2s before retry...');
          await sleep(2000);
        } else {
          break; // Non-retryable error — try next model
        }
      }
    }
  }

  rotateKey();
  console.warn('All Gemini models failed — using smart fallback');
  return generateSmartFallback(filePath);
}

function generateSmartFallback(filePath) {
  const isImage = /\.(jpe?g|png|webp)$/i.test(filePath);
  return {
    doc_type: isImage ? 'RADIOLOGY_XRAY' : 'PATHOLOGY_CBC',
    category_label: isImage ? 'Radiology / Diagnostic Scan' : 'Pathology / Blood Panel',
    predicted_condition: isImage ? 'Suspected Musculoskeletal / Radiology Finding' : 'Lab Panel Pending Review',
    one_line_summary: 'Document uploaded — AI analysis pending. Manual review recommended.',
    full_report_text: isImage ? 'Radiology scan uploaded for physician review' : 'Laboratory report uploaded for review',
    essential_bullet_points: [
      { text: 'Document received and queued for physician review', flag: 'YELLOW', category: 'Status' },
      { text: 'AI analysis temporarily unavailable — manual review required', flag: 'YELLOW', category: 'Status' }
    ],
    extracted_medications: [],
    biomarkers: [],
    suspected_conditions: [],
    risk_score: 40
  };
}

module.exports = { analyzeMedicalDocument };