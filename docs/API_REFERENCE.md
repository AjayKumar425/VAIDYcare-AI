# VAIDYcare-AI: API Specification & Reference

Base Gateways:
- **Node.js Express Gateway**: `http://localhost:5000`
- **Python FastAPI AI Microservice**: `http://localhost:8000`

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Register User
- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Dr. Ramesh Patel",
  "email": "dr.ramesh@vaidycare.ai",
  "password": "SecurePassword123!",
  "role": "DOCTOR",
  "phone": "+919876543210",
  "specialization": "General Physician",
  "licenseNumber": "MCI-48291"
}
```
*Note*: For patients (`role: "PATIENT"`), `abhaId` can be supplied; a unique `patientId` (e.g. `P-20241104-5821`) is automatically assigned.
- **Success Response (201 Created)**:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6728a1c9ef0011b",
    "name": "Dr. Ramesh Patel",
    "email": "dr.ramesh@vaidycare.ai",
    "role": "DOCTOR"
  }
}
```

### 1.2 User Login
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "dr.ramesh@vaidycare.ai",
  "password": "SecurePassword123!"
}
```
- **Success Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6728a1c9ef0011b",
    "name": "Dr. Ramesh Patel",
    "email": "dr.ramesh@vaidycare.ai",
    "role": "DOCTOR",
    "specialization": "General Physician"
  }
}
```

---

## 2. Kiosk Intake Endpoints (`/api/intake`)

### 2.1 Submit Kiosk Intake Session
Submits a patient's self-reported symptoms, interview questionnaire, and up to 5 uploaded medical documents/scans.
- **Method**: `POST`
- **Path**: `/api/intake/submit`
- **Headers**: `Content-Type: multipart/form-data`
- **Form Fields**:
  - `fullName` (String, Required): e.g. `"Sunita Sharma"`
  - `age` (Number, Required): e.g. `45`
  - `gender` (String): `"Female"` | `"Male"` | `"Other"`
  - `phone` (String): e.g. `"+919811223344"`
  - `abhaId` (String, Optional): e.g. `"91-2345-6789-0123"`
  - `patientId` (String, Optional): Registered Patient ID if available
  - `careMode` (String): `"general"` | `"ayush"` | `"emergency"`
  - `chiefComplaint` (String, Required): e.g. `"Severe dry cough and chest tightness for 4 days"`
  - `symptoms` (JSON Array String): `'["Cough", "Chest Pain", "Shortness of breath"]'`
  - `interviewAnswers` (JSON Object String): `'{"Site": "Chest", "Onset": "Sudden", "Severity": "7/10"}'`
  - `documents` (Files, Optional, up to 5 files): Binary image/PDF files
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "token_number": "V-5832",
  "encounter_id": "6728b9f1a23e59001b",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "triage_summary": {
    "risk_level": "MODERATE",
    "risk_score": 50,
    "suspected_diseases": [
      {
        "disease": "Acute Bronchitis / Pneumonia",
        "confidence": "85%",
        "severity": "MODERATE",
        "trigger": "Multimodal document analysis"
      }
    ],
    "highlighted_keywords": ["Cough", "Chest tightness", "Dyspnea"],
    "red_flags": [],
    "clinical_note": "Immediate clinical examination recommended."
  }
}
```

---

## 3. Doctor Portal Endpoints (`/api/doctor`)

### 3.1 Get All Encounters
Fetches all waiting and in-progress encounters sorted by risk priority.
- **Method**: `GET`
- **Path**: `/api/doctor/encounters`
- **Success Response (200 OK)**:
```json
[
  {
    "_id": "6728b9f1a23e59001b",
    "token_number": "V-5832",
    "patient": {
      "full_name": "Sunita Sharma",
      "age": 45,
      "gender": "Female",
      "phone": "+919811223344"
    },
    "chief_complaint": "Severe dry cough and chest tightness",
    "triage_summary": {
      "risk_level": "MODERATE",
      "risk_score": 50
    },
    "status": "WAITING",
    "created_at": "2026-11-04T10:15:30.000Z"
  }
]
```

### 3.2 Get Encounter by Token
Retrieves full encounter details including documents, biomarkers, and triage insights.
- **Method**: `GET`
- **Path**: `/api/doctor/encounter/:token`
- **URL Parameter**: `token` (e.g. `V-5832`)
- **Success Response (200 OK)**:
```json
{
  "_id": "6728b9f1a23e59001b",
  "token_number": "V-5832",
  "patient": {
    "patient_id": "P-20241104-5821",
    "full_name": "Sunita Sharma",
    "age": 45,
    "gender": "Female",
    "phone": "+919811223344",
    "abha_id": "91-2345-6789-0123"
  },
  "chief_complaint": "Severe dry cough and chest tightness",
  "symptoms": ["Cough", "Chest Pain"],
  "structured_hpi": {
    "site": "Chest",
    "severity": "7/10"
  },
  "triage_summary": {
    "risk_level": "MODERATE",
    "risk_score": 50,
    "suspected_diseases": [...],
    "highlighted_keywords": [...]
  },
  "documents": [
    {
      "filename": "doc-1730704530-xray.jpg",
      "file_path": "/uploads/doc-1730704530-xray.jpg",
      "doc_type": "RADIOLOGY_XRAY",
      "extracted_data": {
        "doc_type": "RADIOLOGY_XRAY",
        "predicted_condition": "Right Lower Lobe Consolidation",
        "risk_score": 65,
        "overall_urgency": "MODERATE",
        "one_line_summary": "Infiltrate noted in right basal field suspicious of pneumonia.",
        "essential_bullet_points": [
          {"text": "Right lower lobe opacity noted", "flag": "YELLOW"},
          {"text": "No acute pleural effusion or pneumothorax", "flag": "GREEN"}
        ],
        "biomarkers": []
      }
    }
  ],
  "soap_note": {
    "subjective": "",
    "objective": "",
    "assessment": "",
    "plan": "",
    "is_finalized": false
  },
  "status": "WAITING"
}
```

### 3.3 Generate AI SOAP Note
Synthesizes a structured clinical note based on encounter data via Gemini / Local fallback.
- **Method**: `POST`
- **Path**: `/api/doctor/encounter/:token/soap`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "soap_note": {
    "subjective": "45-year-old female presents with dry cough and chest tightness for 4 days. Denies fever or haemoptysis.",
    "objective": "Chest X-ray shows right lower lobe consolidation. Hemodynamics stable.",
    "assessment": "Community-Acquired Pneumonia (CAP) - Moderate Risk (ICD-10: J18.9).",
    "plan": "1. Prescribe Amoxicillin-Clavulanate 625mg PO TID for 7 days.\n2. Supportive antitussive therapy.\n3. Return if dyspnea worsens.",
    "icd_codes": ["J18.9", "R05.9"],
    "follow_up": "Review in 5 days with repeat examination.",
    "generated_at": "2026-11-04T10:20:00.000Z",
    "is_finalized": false
  }
}
```

### 3.4 Save or Finalize SOAP Note
Persists physician edits and optionally finalizes the consultation.
- **Method**: `PATCH`
- **Path**: `/api/doctor/encounter/:token/soap`
- **Request Body**:
```json
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "...",
  "icd_codes": ["J18.9"],
  "follow_up": "Review in 5 days",
  "is_finalized": true
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "SOAP note updated successfully",
  "soap_note": { ... }
}
```

### 3.5 Patient Longitudinal History
Fetches prior encounters using ABHA ID or phone number.
- **Method**: `GET`
- **Path**: `/api/doctor/patient-history?phone=+919811223344&abha_id=91-2345-6789-0123&exclude_token=V-5832`
- **Success Response (200 OK)**:
```json
{
  "encounters": [
    {
      "token_number": "V-1204",
      "created_at": "2026-08-14T09:30:00.000Z",
      "chief_complaint": "Seasonal allergic rhinitis",
      "soap_note": {
        "assessment": "Allergic Rhinitis (ICD-10: J30.9)"
      }
    }
  ]
}
```

---

## 4. AI Gateway Proxy Endpoints (`/api/ai-proxy/*`)

The Node.js gateway forwards these requests to the internal Python FastAPI microservice:

| Route | Method | Payload | Function |
| :--- | :--- | :--- | :--- |
| `/api/ai-proxy/classify-intake` | `POST` | `{ "text": "chest pain and sweating" }` | Real-time intake typing classification (RED/YELLOW/GREEN). |
| `/api/ai-proxy/analyze-complaint` | `POST` | `{ "text": "patient reports persistent migraine" }` | SpaCy NLP extraction of medical terms and symptoms. |
| `/api/ai-proxy/flag-keywords` | `POST` | `{ "chief_complaint": "...", "symptoms": [...] }` | Evaluates expanded red-flag dictionary and computes risk scores. |
| `/api/ai-proxy/predict-diagnosis` | `POST` | `{ "socrates_data": {...}, "symptoms": [...] }` | Differential diagnosis matrix calculation with ICD-10 suggestions. |
| `/api/ai-proxy/parse-prescription`| `POST` | `{ "ocr_text": "Tab Paracetamol 500mg TDS" }` | Extracts dosages, routes, frequencies, and flags drug interactions. |
| `/api/ai-proxy/analyze-document`  | `POST` | `multipart/form-data (file: binary)` | Analyzes radiographs and lab reports via local vision heuristics. |
| `/api/ai-proxy/generate-soap`     | `POST` | Full encounter payload | Synthesizes a clinical SOAP note offline. |

