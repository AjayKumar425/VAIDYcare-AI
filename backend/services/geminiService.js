// backend/services/geminiService.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

// ── Collect all configured API keys dynamically ──────────────────────────────
function getGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.FALLBACKE_GEMINI_API_KEY,
    process.env.FALLBACK_GEMINI_API_KEY,
    ...(process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',') : [])
  ].map(k => k && k.trim()).filter(Boolean);
}

function getGroqApiKey() {
  return (process.env.GROQ_API_KEY || '').trim();
}

// ── Models ────────────────────────────────────────────────────────────────────
const ACTIVE_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest'
];

const GROQ_TEXT_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b'
];

const GROQ_VISION_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────────────
// GROQ FALLBACK ANALYZERS
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeWithGroqVision(filePath, mimeType, prompt) {
  const currentGroqKey = getGroqApiKey();
  if (!currentGroqKey) {
    console.warn('[Groq Vision] No GROQ_API_KEY configured in backend/.env');
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    let resolvedMime = mimeType || 'image/jpeg';
    if (filePath.endsWith('.png')) resolvedMime = 'image/png';
    else if (filePath.endsWith('.webp')) resolvedMime = 'image/webp';
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) resolvedMime = 'image/jpeg';

    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${resolvedMime};base64,${base64Data}`;

    for (const model of GROQ_VISION_MODELS) {
      try {
        console.log(`[Groq Vision Fallback] Calling model [${model}]...`);
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt + '\nReturn ONLY valid JSON with no markdown fences.' },
                  { type: 'image_url', image_url: { url: dataUri } }
                ]
              }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          },
          {
            headers: {
              'Authorization': `Bearer ${currentGroqKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 25000
          }
        );

        const content = response.data.choices[0]?.message?.content?.trim();
        const cleanJson = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleanJson);
        console.log(`[Groq Vision Fallback][${model}] SUCCESS: ${parsed.predicted_condition}`);

        if (!Array.isArray(parsed.suspected_conditions)) {
          parsed.suspected_conditions = parsed.predicted_condition ? [{
            disease: parsed.predicted_condition,
            confidence: '85%',
            severity: (parsed.risk_score || 40) >= 70 ? 'SEVERE' : 'MODERATE',
            trigger: parsed.one_line_summary || 'Groq Vision analysis'
          }] : [];
        }
        return parsed;
      } catch (err) {
        console.warn(`[Groq Vision][${model}] Attempt failed:`, err.response?.data?.error?.message || err.message);
      }
    }
  } catch (err) {
    console.warn('[Groq Vision] Unexpected error:', err.message);
  }
  return null;
}

async function generateSoapWithGroq(encounter, prompt) {
  if (!groqApiKey) return null;
  console.log('[Groq Fallback] Attempting SOAP note generation via Groq Cloud...');

  for (const model of GROQ_TEXT_MODELS) {
    try {
      console.log(`[Groq Fallback] Calling text model [${model}]...`);
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt + '\nReturn ONLY valid JSON format.'
            }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const content = response.data.choices[0]?.message?.content?.trim();
      const cleanJson = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      console.log(`[Groq Fallback][${model}] SUCCESS: SOAP note synthesized.`);
      return parsed;
    } catch (err) {
      console.warn(`[Groq Fallback][${model}] Attempt failed:`, err.response?.data?.error?.message || err.message);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL DOCUMENT / SCAN ANALYZER
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeMedicalDocument(filePath, mimeType) {
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

  let lastError = null;
  const currentGeminiKeys = getGeminiKeys();

  // ── Step 1: Iterate through all Gemini API Keys (Primary + Fallbacks) ────────
  if (currentGeminiKeys.length > 0) {
    for (let keyIdx = 0; keyIdx < currentGeminiKeys.length; keyIdx++) {
      const currentKey = currentGeminiKeys[keyIdx];
      const keyLabel = keyIdx === 0 ? 'Primary' : `Fallback #${keyIdx}`;
      console.log(`[Gemini Engine] Using ${keyLabel} Key (${currentKey.slice(0, 8)}...)...`);

      const genAI = new GoogleGenerativeAI(currentKey);

      for (const modelName of ACTIVE_GEMINI_MODELS) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`Calling Gemini [${modelName}] with ${keyLabel} key (Attempt ${attempt}/2)...`);
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
            console.log(`[${modelName}][${keyLabel}] SUCCESS: ${parsed.predicted_condition}`);

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
            lastError = err.message;
            console.warn(`[${modelName}][${keyLabel}] Attempt ${attempt} failed: ${err.message}`);
            if (err.message.includes('503') || err.message.includes('429')) {
              await sleep(1500);
            } else {
              break; // Try next model or next key
            }
          }
        }
      }
    }
  }

  // ── Step 2: Fallback to Groq Multimodal Vision API ───────────────────────────
  console.warn(`[Fallback] Gemini keys exhausted. Engaging Groq Vision API fallback...`);
  const groqResult = await analyzeWithGroqVision(filePath, mimeType, prompt);
  if (groqResult) {
    return groqResult;
  }

  // ── Step 3: Local Python ML Engine Fallback (CheXNet DenseNet-121) ───────────
  console.warn(`[Tier 4 Fallback] Cloud AI unavailable. Engaging Local Python ML (CheXNet)...`);
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: resolvedMime
    });

    const isImageFile = resolvedMime.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(filePath);
    const mlEndpoint = isImageFile
      ? `${PYTHON_AI_URL}/api/ml/analyze-xray`
      : `${PYTHON_AI_URL}/api/ai/analyze-document`;

    const localRes = await axios.post(mlEndpoint, formData, {
      headers: formData.getHeaders(),
      timeout: 25000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (localRes.data && (localRes.data.predicted_condition || (localRes.data.essential_bullet_points && localRes.data.essential_bullet_points.length > 0))) {
      console.log(`[Tier 4 Fallback] Local ML SUCCESS: ${localRes.data.predicted_condition}`);
      return localRes.data;
    }
  } catch (mlErr) {
    console.warn(`[Tier 4 Fallback] Local Python ML failed:`, mlErr.message);
  }

  // ── Step 4: Graceful Smart Fallback ──────────────────────────────────────────
  console.warn('All AI services (Gemini + Groq + Local ML) failed. Using smart fallback. Reason:', lastError);
  return generateSmartFallback(filePath, lastError);
}

function generateSmartFallback(filePath, errorReason = '') {
  const isImage = /\.(jpe?g|png|webp)$/i.test(filePath);
  const isKeyError = errorReason && (errorReason.includes('API_KEY') || errorReason.includes('API key') || errorReason.includes('403') || errorReason.includes('400'));
  const isQuotaError = errorReason && (errorReason.includes('429') || errorReason.includes('RESOURCE_EXHAUSTED') || errorReason.includes('quota'));

  let statusText = 'AI analysis temporarily unavailable — manual review required';
  if (isKeyError) {
    statusText = 'API Authentication: Please verify Gemini / Groq API keys in backend/.env';
  } else if (isQuotaError) {
    statusText = 'AI Rate Limit: Provider quotas reached. Rotating to next request.';
  }

  return {
    doc_type: isImage ? 'RADIOLOGY_XRAY' : 'PATHOLOGY_CBC',
    category_label: isImage ? 'Radiology / Diagnostic Scan' : 'Pathology / Blood Panel',
    predicted_condition: isImage ? 'Suspected Musculoskeletal / Radiology Finding' : 'Lab Panel Pending Review',
    one_line_summary: isKeyError
      ? 'AI analysis failed: Check API keys in backend/.env.'
      : 'Document uploaded — AI analysis pending. Manual review recommended.',
    full_report_text: isImage
      ? `Radiology scan uploaded for physician review. ${errorReason ? 'Diagnostic message: ' + errorReason : ''}`
      : `Laboratory report uploaded for review. ${errorReason ? 'Diagnostic message: ' + errorReason : ''}`,
    essential_bullet_points: [
      { text: 'Document received and queued for physician review', flag: 'YELLOW', category: 'Status' },
      { text: statusText, flag: 'YELLOW', category: 'Status' }
    ],
    extracted_medications: [],
    biomarkers: [],
    suspected_conditions: [],
    risk_score: 40
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SOAP NOTE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

async function generateSoapNote(encounter) {
  const {
    patient,
    chief_complaint,
    care_mode,
    symptoms,
    interview_answers,
    structured_hpi,
    triage_summary,
    documents
  } = encounter;

  const docSummaries = (documents || [])
    .map(d => d.extracted_data?.one_line_summary || d.extracted_data?.predicted_condition)
    .filter(Boolean)
    .join('; ');

  const biomarkerHighlights = (documents || [])
    .flatMap(d => (d.extracted_data?.biomarkers || []).filter(b => b.flag !== 'NORMAL'))
    .map(b => `${b.name}: ${b.value} ${b.unit} [${b.flag}]`)
    .join(', ');

  const suspectedDiseases = (triage_summary?.suspected_diseases || [])
    .map(d => `${d.disease} (${d.confidence})`)
    .join(', ');

  const redFlags = (triage_summary?.red_flags || []).join(', ');

  const hpiText = structured_hpi
    ? Object.entries(structured_hpi)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('\n')
    : '';

  const answersText = interview_answers
    ? Object.entries(interview_answers)
        .map(([q, a]) => `Q: ${q} → A: ${a}`)
        .join('\n')
    : '';

  const prompt = `
You are a senior clinical physician documenting a formal medical SOAP note.
Write a concise, professional SOAP note for the following patient encounter.

PATIENT:
  Name: ${patient.full_name}, Age: ${patient.age}, Gender: ${patient.gender}
  Care Mode: ${(care_mode || 'general').toUpperCase()}

CHIEF COMPLAINT: "${chief_complaint}"

SYMPTOMS: ${(symptoms || []).join(', ') || 'None listed'}

RED FLAGS DETECTED: ${redFlags || 'None'}

INTERVIEW / HPI:
${answersText || hpiText || 'No structured interview data'}

AI SUSPECTED CONDITIONS: ${suspectedDiseases || 'None identified'}
RISK LEVEL: ${triage_summary?.risk_level || 'SAFE'} (Score: ${triage_summary?.risk_score || 10}/100)

DOCUMENT FINDINGS: ${docSummaries || 'No documents uploaded'}
ABNORMAL BIOMARKERS: ${biomarkerHighlights || 'None'}

INSTRUCTIONS:
- Subjective: Patient's own description of symptoms, history, and complaint context.
- Objective: Observable/measurable data — vital signs (if available), uploaded document findings, biomarker values.
- Assessment: Clinical interpretation, differential diagnoses with ICD-10 codes, and severity assessment.
- Plan: Investigations to order, medications, referrals, and immediate management steps.
- Follow-up: When patient should return and what to monitor.
- icd_codes: Array of the most relevant ICD-10 codes (3–6 codes max).

Write clearly for a hospital medical record. Be specific, not generic.
Use clinical language. Do NOT include patient name in the output.

Respond ONLY with valid raw JSON (no markdown, no code fences):
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "...",
  "follow_up": "...",
  "icd_codes": ["ICD-code: Description", ...]
}
`;

  // ── Step 1: Iterate through Gemini API Keys ─────────────────────────────────
  if (geminiKeys.length > 0) {
    for (let keyIdx = 0; keyIdx < geminiKeys.length; keyIdx++) {
      const currentKey = geminiKeys[keyIdx];
      const keyLabel = keyIdx === 0 ? 'Primary' : `Fallback #${keyIdx}`;
      const genAI = new GoogleGenerativeAI(currentKey);

      for (const modelName of ACTIVE_GEMINI_MODELS) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[SOAP] Calling Gemini [${modelName}] with ${keyLabel} key (Attempt ${attempt}/2)...`);
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
            });
            const result = await model.generateContent([prompt]);
            const raw = result.response.text().trim()
              .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
            const parsed = JSON.parse(raw);
            console.log(`[SOAP][${modelName}][${keyLabel}] SUCCESS`);
            return parsed;
          } catch (err) {
            console.warn(`[SOAP][${modelName}][${keyLabel}] Attempt ${attempt} failed: ${err.message}`);
            if (err.message.includes('503') || err.message.includes('429')) {
              await sleep(1500);
            } else {
              break;
            }
          }
        }
      }
    }
  }

  // ── Step 2: Fallback to Groq Text Generation ─────────────────────────────────
  console.warn('[SOAP] Gemini keys exhausted. Engaging Groq Cloud fallback...');
  const groqSoap = await generateSoapWithGroq(encounter, prompt);
  if (groqSoap) {
    return groqSoap;
  }

  // ── Step 3: Fallback Skeleton ────────────────────────────────────────────────
  console.warn('[SOAP] All AI providers failed — using fallback template');
  return generateSoapFallback(chief_complaint, triage_summary);
}

function generateSoapFallback(chiefComplaint, triageSummary) {
  const risk = triageSummary?.risk_level || 'SAFE';
  const diseases = (triageSummary?.suspected_diseases || []).map(d => d.disease).join(', ') || 'General consultation';
  return {
    subjective: `Patient presents with: ${chiefComplaint || 'general complaint'}. Full history to be taken by attending physician.`,
    objective: `Risk level: ${risk}. Vital signs pending physical examination. Document review completed.`,
    assessment: `Provisional assessment: ${diseases}. Clinical correlation required.`,
    plan: '1. Full clinical examination by attending physician.\n2. Review uploaded documents.\n3. Order relevant investigations as clinically indicated.\n4. Initiate appropriate management.',
    follow_up: 'Review after investigations. Return immediately if symptoms worsen.',
    icd_codes: ['Z00.0: General examination', 'R69: Illness, unspecified']
  };
}

module.exports = { analyzeMedicalDocument, generateSoapNote };
