require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const apiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

let currentKeyIndex = 0;

function getAiClient() {
  if (apiKeys.length === 0) return null;
  const key = apiKeys[currentKeyIndex % apiKeys.length];
  return new GoogleGenAI({ apiKey: key });
}

function rotateKey() {
  if (apiKeys.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.pdf': return 'application/pdf';
    default: return 'image/jpeg';
  }
}

exports.analyzeMedicalDocumentWithGemini = async (filePath) => {
  const defaultFallback = {
    detected_type: 'CLINICAL_REPORT',
    primary_condition: 'Medical Record Attached',
    risk_level: 'SAFE',
    key_points: ['Scan uploaded successfully', 'Pending doctor clinical evaluation'],
    highlighted_keywords: ['UPLOADED_RECORD'],
    biomarkers: [],
    suspected_conditions: []
  };

  try {
    const ai = getAiClient();
    if (!ai) return defaultFallback;

    const fileBuffer = fs.readFileSync(filePath);
    const filePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: getMimeType(filePath)
      }
    };

    const promptText = `
      You are an expert diagnostic AI.
      1. Classify document type into exactly one: "CHEST_XRAY", "ORTHO_XRAY", "BLOOD_CBC", "BIOCHEMISTRY", "HANDWRITTEN_RX", or "CLINICAL_REPORT".
      2. Extract 2-3 concise bullet points with essential medical keywords in UPPERCASE.
      3. Set exact condition title and risk level (SAFE, MODERATE, or SEVERE).
      4. If blood report, extract biomarkers array.
      Return ONLY valid JSON matching this schema:
      {
        "detected_type": "ORTHO_XRAY",
        "primary_condition": "Displaced Bone Fracture",
        "risk_level": "SEVERE",
        "key_points": [
          "Displaced, comminuted fracture observed",
          "Joint space distortion noted",
          "Requires orthopedic reduction"
        ],
        "highlighted_keywords": ["FRACTURE", "DISPLACEMENT"],
        "biomarkers": [
          { "name": "Hemoglobin", "measured_value": 14, "unit": "g/dL", "ref_min": 12, "ref_max": 16, "status": "NORMAL" }
        ],
        "suspected_conditions": [
          { "condition": "Bone Fracture", "confidence": "95%", "severity": "SEVERE", "trigger": "Radiographic cortical break" }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [filePart, { text: promptText }],
      config: { responseMimeType: 'application/json' }
    });

    let raw = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(raw);

    return {
      detected_type: parsed.detected_type || 'CLINICAL_REPORT',
      primary_condition: parsed.primary_condition || 'Diagnostic Scan Uploaded',
      risk_level: parsed.risk_level || 'SAFE',
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : ['Scan recorded for consultation.'],
      highlighted_keywords: Array.isArray(parsed.highlighted_keywords) ? parsed.highlighted_keywords : [],
      biomarkers: Array.isArray(parsed.biomarkers) ? parsed.biomarkers : [],
      suspected_conditions: Array.isArray(parsed.suspected_conditions) ? parsed.suspected_conditions : []
    };
  } catch (err) {
    console.warn('[Gemini API Fallback triggered]:', err.message);
    if (err.message.includes('429')) rotateKey();

    return {
      ...defaultFallback,
      key_points: [
        'Scan recorded and attached',
        'AI rate-limit encountered (Review scan directly via image viewer)'
      ],
      highlighted_keywords: ['RATE_LIMITED', 'MANUAL_REVIEW']
    };
  }
};