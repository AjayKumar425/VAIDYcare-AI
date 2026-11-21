# VAIDYcare-AI: Clinical Workflows & State Machine Diagrams

This document outlines the end-to-end operational workflows and data flow pipelines within VAIDYcare-AI.

---

## 1. Patient Kiosk Intake & Triage Flow

This sequence depicts a patient arriving at an outpatient or emergency intake kiosk, submitting their demographic information, chief complaints, symptoms, and existing paper or radiographic documents.

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant Kiosk as Patient Kiosk (React)
    participant NodeAPI as Node.js Gateway (:5000)
    participant PyAI as Python AI Service (:8000)
    participant CloudAI as Cloud AI (Gemini/Groq)
    participant DB as MongoDB Atlas

    Patient ->> Kiosk: Enter demographics, chief complaint, & symptoms
    Kiosk ->> NodeAPI: POST /api/ai-proxy/classify-intake (Real-time typing)
    NodeAPI ->> PyAI: POST /api/ai/classify-intake
    PyAI -->> NodeAPI: Triage classification (RED/YELLOW/GREEN flags)
    NodeAPI -->> Kiosk: Live visual feedback & warning prompts

    Patient ->> Kiosk: Upload lab report / X-ray image (Optional)
    Patient ->> Kiosk: Click "Generate Token & Check-In"
    
    Kiosk ->> NodeAPI: POST /api/intake/submit (Multipart FormData)
    Note over NodeAPI: Generate Unique Token (e.g., V-4821)<br/>Generate Patient ID (if walk-in)
    
    NodeAPI ->> NodeAPI: Rule Engine: detectRedFlags(combinedText)
    NodeAPI ->> NodeAPI: Build Structured HPI (SOCRATES + AYUSH)

    opt Document Uploaded
        NodeAPI ->> CloudAI: analyzeMedicalDocument(file.path)
        alt Cloud AI Success
            CloudAI -->> NodeAPI: Biomarkers, Impression, Risk Score
        else Cloud AI Error / Quota Exhaustion
            NodeAPI ->> PyAI: Fallback POST /api/ai/analyze-document
            PyAI -->> NodeAPI: Heuristic & local OCR analysis
        end
    end

    NodeAPI ->> PyAI: POST /api/ai/flag-keywords (NLP Extraction)
    PyAI -->> NodeAPI: Flagged keywords & risk severity

    NodeAPI ->> PyAI: POST /api/ai/predict-diagnosis (Differential Matrix)
    PyAI -->> NodeAPI: Top suspected conditions & ICD codes

    NodeAPI ->> NodeAPI: Aggregate risk score & compute overall triage status
    NodeAPI ->> NodeAPI: Generate QR Code containing encounter token
    NodeAPI ->> DB: Save Encounter document
    DB -->> NodeAPI: Confirmation & ObjectId

    NodeAPI -->> Kiosk: Return Token Number (V-XXXX), QR Code, & Triage Summary
    Kiosk -->> Patient: Display digital token pass & instructions to waiting lounge
```

---

## 2. Multimodal Scan Analysis & Multi-Tier AI Cascade

This sequence illustrates the resilient 4-tier decision cascade when an X-ray, CT scan, MRI, or blood work PDF/image is ingested into the system.

```mermaid
sequenceDiagram
    autonumber
    participant Gateway as Node.js Service (geminiService.js)
    participant Primary as Tier 1: Gemini Primary Key
    participant Fallback as Tier 2: Gemini Secondary Key
    participant Groq as Tier 3: Groq Cloud LPU
    participant Local as Tier 4: Local Python Radiology Engine

    Gateway ->> Primary: analyzeMedicalDocument(imageBuffer, mimeType)
    
    alt Primary Key Valid & Quota Available
        Primary -->> Gateway: 200 OK + JSON (Impression, Bullet Points, Biomarkers)
    else 429 Quota Exceeded / 404 Model Error / 403 Forbidden
        Note over Gateway: Log Warning: Tier 1 Failed. Cascading to Tier 2...
        Gateway ->> Fallback: Retry with FALLBACKE_GEMINI_API_KEY
        
        alt Secondary Key Valid & Quota Available
            Fallback -->> Gateway: 200 OK + JSON
        else 429 Exhausted / Cloud Network Interruption
            Note over Gateway: Log Warning: Tier 2 Failed. Cascading to Tier 3 (Groq)...
            Gateway ->> Groq: POST https://api.groq.com/openai/v1/chat/completions
            
            alt Groq Cloud Online
                Groq -->> Gateway: 200 OK + Extracted Medical Content
            else Groq Offline / Timeout / Vision Payload Rejected
                Note over Gateway: Log Critical: Cloud Providers Unavailable.<br/>Failing over to Tier 4 On-Premise Engine.
                Gateway ->> Local: POST http://localhost:8000/api/ai/analyze-document
                Note over Local: OpenCV / PIL: Modality Detection<br/>Dark Film vs White Paper Report Discriminator<br/>Regex Clinical Negation Parser
                Local -->> Gateway: Safe Structured Diagnostic Payload (Fallback Tagged)
            end
        end
    end

    Gateway ->> Gateway: Normalize Output Schema (predicted_condition, biomarkers, risk_score)
    Gateway -->> Gateway: Commit Analysis to Encounter Record
```

---

## 3. Clinical Diagnostic & SOAP Generation Flow

This sequence demonstrates how a physician interacts with the Doctor Portal to review patient triage queues, examine diagnostic imaging, inspect past electronic health records (EHR), and generate or edit clinical SOAP notes.

```mermaid
sequenceDiagram
    autonumber
    actor Doctor
    participant Portal as Doctor Portal (React)
    participant NodeAPI as Express Gateway (:5000)
    participant PyAI as Python AI Service (:8000)
    participant CloudAI as Cloud AI (Gemini 3.5)
    participant DB as MongoDB Atlas

    Doctor ->> Portal: Open Doctor Dashboard
    Portal ->> NodeAPI: GET /api/doctor/encounters
    NodeAPI ->> DB: Query Encounters sorted by Risk & Timestamp
    DB -->> NodeAPI: Return Encounter List
    NodeAPI -->> Portal: Render prioritized triage queue (RED, YELLOW, GREEN)

    Doctor ->> Portal: Select Patient Encounter (e.g. V-4821)
    Portal ->> NodeAPI: GET /api/doctor/encounter/V-4821
    NodeAPI ->> DB: Find Encounter by token_number
    DB -->> NodeAPI: Encounter Document
    NodeAPI -->> Portal: Display Patient Info, Documents, Biomarkers, AI Suspicions

    Doctor ->> Portal: Click "View Patient History"
    Portal ->> NodeAPI: GET /api/doctor/patient-history?phone=...&abha_id=...
    NodeAPI ->> DB: Query historical encounters matching ABHA or Phone
    DB -->> NodeAPI: Prior Encounters
    NodeAPI -->> Portal: Render EHR Longitudinal Timeline

    Doctor ->> Portal: Click "Generate AI SOAP Note"
    Portal ->> NodeAPI: POST /api/doctor/encounter/V-4821/soap
    
    alt Gemini Cloud Accessible
        NodeAPI ->> CloudAI: generateSoapNotePrompt(EncounterData)
        CloudAI -->> NodeAPI: Formatted SOAP (Subjective, Objective, Assessment, Plan, ICD-10)
    else Fallback to Local AI
        NodeAPI ->> PyAI: POST /api/ai/generate-soap
        PyAI -->> NodeAPI: Synthesized Clinical SOAP Note
    end

    NodeAPI ->> DB: Cache generated SOAP note in Encounter
    NodeAPI -->> Portal: Return SOAP Note JSON
    Doctor ->> Portal: Review, amend dosages, and finalize SOAP note
    Portal ->> NodeAPI: PATCH /api/doctor/encounter/V-4821/soap (is_finalized: true)
    NodeAPI ->> DB: Update Encounter status = "COMPLETED"
    DB -->> NodeAPI: Acknowledged
    NodeAPI -->> Portal: 200 OK (Encounter Finalized)
```

---

## 4. Patient Encounter Lifecycle State Machine

The following state machine governs the status transitions of a patient encounter from kiosk check-in to consultation completion:

```mermaid
stateDiagram-v2
    [*] --> KIOSK_INPUT : Patient starts check-in at Kiosk

    KIOSK_INPUT --> TRIAGING : User submits form & uploads files
    
    state TRIAGING {
        [*] --> RedFlagCheck
        RedFlagCheck --> MultimodalScan : Has uploaded documents
        RedFlagCheck --> NLPKeywordFlagging : Text only
        MultimodalScan --> NLPKeywordFlagging
        NLPKeywordFlagging --> DifferentialScoring
        DifferentialScoring --> RiskLevelAssigned
    }

    TRIAGING --> WAITING : Encounter created with Token Number (e.g. V-4821)
    
    WAITING --> IN_CONSULTATION : Doctor selects patient in portal queue
    
    state IN_CONSULTATION {
        [*] --> ReviewIntake
        ReviewIntake --> InspectImaging : View scans / lab biomarkers
        InspectImaging --> ReviewHistory : Inspect past encounters (ABHA / Phone)
        ReviewHistory --> DraftSOAP : Generate / Edit SOAP note
        DraftSOAP --> DoctorApproval
    }

    IN_CONSULTATION --> WAITING : Deferred or additional labs requested
    IN_CONSULTATION --> COMPLETED : Doctor finalizes SOAP note & signs off
    
    COMPLETED --> [*] : Encrypted & archived in longitudinal EHR
```

