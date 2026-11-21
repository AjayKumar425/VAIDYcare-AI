# backend-ai/clinical_engine.py
"""
VAIDYcare-AI Clinical Diagnostic & SOAP Note Reasoning Engine
Self-hosted, private expert system and clinical reasoning pipeline.
Replaces cloud Gemini dependencies with local deterministic clinical ontologies,
ICD-10 mapping, and structured SOAP note synthesis.
"""

from typing import Dict, Any, List, Optional
import json

# Comprehensive Disease Profiles with Clinical Trigger Rules & ICD-10 Ontologies
DISEASE_PROFILES = [
    {
        "disease": "Acute Coronary Syndrome / Myocardial Infarction",
        "icd_code": "I21.9",
        "organ_system": "Cardiovascular",
        "urgency": "RED",
        "triggers": ["chest pain", "chest tightness", "heart attack", "left arm pain", "jaw pain", "angina"],
        "needs_any": ["sweat", "breath", "radiat", "nausea", "crushing", "pressure"],
        "hpi_keys": {"radiation": ["back / arm / neck", "chest"], "character": ["Pressure / Tightness", "Sharp / Stabbing"]},
        "base_prob": 0.95
    },
    {
        "disease": "Angina Pectoris (Stable / Unstable)",
        "icd_code": "I20.9",
        "organ_system": "Cardiovascular",
        "urgency": "RED",
        "triggers": ["chest pain", "chest tightness", "heaviness in chest"],
        "needs_any": ["walking", "exertion", "movement", "rest"],
        "hpi_keys": {"aggravating": ["Movement / Walking"], "character": ["Pressure / Tightness"]},
        "base_prob": 0.88
    },
    {
        "disease": "Congestive Heart Failure / Cardiomegaly",
        "icd_code": "I50.9",
        "organ_system": "Cardiovascular",
        "urgency": "YELLOW",
        "triggers": ["breathless at rest", "shortness of breath", "swelling in legs", "orthopnea", "cardiomegaly"],
        "needs_any": ["night", "exertion", "ctr", "heart"],
        "hpi_keys": {"timing": ["Worse at night"]},
        "base_prob": 0.84
    },
    {
        "disease": "Acute Ischemic Stroke / TIA",
        "icd_code": "I63.9",
        "organ_system": "Neurological",
        "urgency": "RED",
        "triggers": ["stroke", "slurred speech", "face droop", "sudden weakness", "numbness on one side", "paralysis"],
        "needs_any": [],
        "hpi_keys": {"timing": ["Constant"], "onset": ["Today"]},
        "base_prob": 0.98
    },
    {
        "disease": "Community-Acquired Lobar Pneumonia",
        "icd_code": "J18.9",
        "organ_system": "Respiratory",
        "urgency": "RED",
        "triggers": ["cough with phlegm", "high fever", "fever with chills", "consolidation", "pneumonia", "difficulty breathing"],
        "needs_any": ["shivering", "chills", "chest", "opacity", "infiltrat"],
        "hpi_keys": {"ros_fever": ["High fever", "Fever with chills"], "ros_respiratory": ["Cough with phlegm", "Chest pain"]},
        "base_prob": 0.92
    },
    {
        "disease": "Acute Bronchial Asthma Exacerbation",
        "icd_code": "J45.901",
        "organ_system": "Respiratory",
        "urgency": "RED",
        "triggers": ["wheezing", "cannot breathe", "shortness of breath", "asthma"],
        "needs_any": ["cold", "dust", "night", "morning"],
        "hpi_keys": {"timing": ["Worse in morning", "Worse at night"], "aggravating": ["Cold weather"]},
        "base_prob": 0.90
    },
    {
        "disease": "Chronic Obstructive Pulmonary Disease (COPD)",
        "icd_code": "J44.1",
        "organ_system": "Respiratory",
        "urgency": "YELLOW",
        "triggers": ["shortness of breath on exertion", "chronic cough", "smoker", "hyperinflated", "emphysema"],
        "needs_any": ["smoking", "tobacco", "exertion"],
        "hpi_keys": {"smoking_history": ["Current smoker", "Ex-smoker"]},
        "base_prob": 0.86
    },
    {
        "disease": "Acute Gastroenteritis / Infectious Diarrhea",
        "icd_code": "A09",
        "organ_system": "Gastrointestinal",
        "urgency": "YELLOW",
        "triggers": ["loose motions", "diarrhea", "vomiting", "nausea", "stomach pain", "food poisoning"],
        "needs_any": ["eating", "water", "cramp"],
        "hpi_keys": {"ros_gi": ["Diarrhea / Loose motions", "Nausea / Vomiting"]},
        "base_prob": 0.89
    },
    {
        "disease": "Gastroesophageal Reflux Disease (GERD) / Peptic Ulcer",
        "icd_code": "K21.9",
        "organ_system": "Gastrointestinal",
        "urgency": "GREEN",
        "triggers": ["acidity", "heartburn", "burning", "stomach burning"],
        "needs_any": ["eating", "food", "spicy", "night"],
        "hpi_keys": {"character": ["Burning"], "timing": ["After eating"], "ros_gi": ["Acidity / Heartburn"]},
        "base_prob": 0.85
    },
    {
        "disease": "Acute Appendicitis / Acute Abdomen",
        "icd_code": "K35.80",
        "organ_system": "Gastrointestinal",
        "urgency": "RED",
        "triggers": ["severe abdominal pain", "worst pain of my life", "sharp stomach pain", "right lower stomach"],
        "needs_any": ["vomit", "fever", "sharp", "acute"],
        "hpi_keys": {"character": ["Sharp / Stabbing"], "severity": ["7-9 (Severe)", "10 (Worst Possible)"]},
        "base_prob": 0.93
    },
    {
        "disease": "Thrombocytopenia / Dengue Differential",
        "icd_code": "A97.9",
        "organ_system": "Infectious / Hematological",
        "urgency": "RED",
        "triggers": ["platelet", "thrombocytopenia", "dengue", "high fever with chills", "bleeding gums"],
        "needs_any": ["fever", "shiver", "body ache", "headache"],
        "hpi_keys": {"ros_fever": ["High fever", "Fever with chills"]},
        "base_prob": 0.91
    },
    {
        "disease": "Type 2 Diabetes Mellitus / Hyperglycemia",
        "icd_code": "E11.9",
        "organ_system": "Endocrine / Metabolic",
        "urgency": "YELLOW",
        "triggers": ["high blood sugar", "diabetes", "hyperglycemia", "excessive thirst", "frequent urination"],
        "needs_any": ["glucose", "fbs", "sugar"],
        "hpi_keys": {"past_medical_history": ["Diabetes"]},
        "base_prob": 0.92
    },
    {
        "disease": "Acute Bone Fracture / Cortical Disruption",
        "icd_code": "S82.9",
        "organ_system": "Musculoskeletal",
        "urgency": "RED",
        "triggers": ["fracture", "fall", "injury", "bone pain", "cortical step-off", "deformity"],
        "needs_any": ["accident", "hit", "trauma", "swelling", "inability to walk"],
        "hpi_keys": {"character": ["Sharp / Stabbing"], "aggravating": ["Movement / Walking"]},
        "base_prob": 0.94
    },
    {
        "disease": "Migraine with / without Aura",
        "icd_code": "G43.909",
        "organ_system": "Neurological",
        "urgency": "YELLOW",
        "triggers": ["headache", "throbbing head", "one side headache", "vomiting with headache"],
        "needs_any": ["light", "sound", "pulsing", "nausea"],
        "hpi_keys": {"character": ["Throbbing / Pulsing"], "ros_neuro": ["Headache"]},
        "base_prob": 0.87
    },
    {
        "disease": "Acute Viral Upper Respiratory Infection",
        "icd_code": "J06.9",
        "organ_system": "Infectious",
        "urgency": "GREEN",
        "triggers": ["fever", "runny nose", "sore throat", "cough", "body ache"],
        "needs_any": ["mild", "2-3 days", "cold"],
        "hpi_keys": {"ros_fever": ["Low grade fever"], "ros_respiratory": ["Cough (dry)"]},
        "base_prob": 0.80
    }
]


def predict_differential_diagnosis(
    socrates_data: Dict[str, Any],
    chief_complaint: str = "",
    symptoms: List[str] = None,
    document_findings: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Evaluates patient symptoms, SOCRATES interview data, and document findings
    against clinical disease profiles, generating ranked differential diagnoses.
    """
    symptoms = symptoms or []
    document_findings = document_findings or []
    
    # Flatten all text parts for clinical token matching
    corpus_parts = [chief_complaint] + symptoms + document_findings
    if socrates_data:
        hpi = socrates_data.get("history_of_present_illness", {})
        ros = socrates_data.get("review_of_systems", {})
        past = socrates_data.get("past_medical_history", "")
        personal = socrates_data.get("personal_history", {})
        
        corpus_parts.extend(str(v) for v in hpi.values() if v)
        corpus_parts.extend(str(v) for v in ros.values() if v)
        corpus_parts.append(str(past))
        corpus_parts.extend(str(v) for v in personal.values() if v)

    full_corpus = " ".join(corpus_parts).lower()

    scored_diagnoses = []

    for profile in DISEASE_PROFILES:
        score = 0.0
        match_triggers = []

        # Check triggers
        for trig in profile["triggers"]:
            if trig in full_corpus:
                score += 3.0
                match_triggers.append(trig)

        # Check secondary qualifiers
        for need in profile.get("needs_any", []):
            if need in full_corpus:
                score += 1.5

        # Check structured HPI selections
        hpi_matches = 0
        for section, expected_opts in profile.get("hpi_keys", {}).items():
            for opt in expected_opts:
                if opt.lower() in full_corpus:
                    score += 2.0
                    hpi_matches += 1

        if score > 0:
            # Normalize probability to 0.50 - 0.98 range
            calculated_prob = min(profile["base_prob"], 0.50 + (score * 0.06))
            rationale_text = f"Triggered by {', '.join(match_triggers[:3])}" if match_triggers else "Clinical pattern correlation"
            if hpi_matches > 0:
                rationale_text += f"; corroborated by structured HPI indicators"

            scored_diagnoses.append({
                "disease": profile["disease"],
                "probability": round(calculated_prob, 2),
                "rationale": rationale_text,
                "icd_code": profile["icd_code"],
                "organ_system": profile["organ_system"],
                "urgency": profile["urgency"]
            })

    # Sort descending by probability
    scored_diagnoses.sort(key=lambda x: x["probability"], reverse=True)

    # Fallback if no specific condition triggered
    if not scored_diagnoses:
        scored_diagnoses = [
            {
                "disease": "Acute Undifferentiated Febrile Illness / Malaise" if "fever" in full_corpus else "General Outpatient Clinical Presentation",
                "probability": 0.55,
                "rationale": "Symptom presentation requires bedside physician correlation",
                "icd_code": "R69",
                "organ_system": "General",
                "urgency": "GREEN"
            }
        ]

    return scored_diagnoses[:4]


def generate_clinical_soap(encounter: Dict[str, Any]) -> Dict[str, Any]:
    """
    Synthesizes a structured, formal clinical SOAP note from patient encounter data.
    Direct drop-in replacement for Gemini SOAP generator.
    """
    patient = encounter.get("patient", {})
    full_name = patient.get("full_name", "Patient")
    age = patient.get("age", "Unknown")
    gender = patient.get("gender", "Unspecified")
    care_mode = encounter.get("care_mode", "general").upper()
    chief_complaint = encounter.get("chief_complaint", "General consultation")
    symptoms = encounter.get("symptoms", [])
    if isinstance(symptoms, str):
        try:
            symptoms = json.loads(symptoms)
        except Exception:
            symptoms = [symptoms]

    hpi = encounter.get("structured_hpi", {})
    triage = encounter.get("triage_summary", {})
    docs = encounter.get("documents", [])
    risk_level = triage.get("risk_level", "SAFE")
    risk_score = triage.get("risk_score", 20)
    red_flags = triage.get("red_flags", [])

    # Extract document findings and biomarkers
    doc_findings = []
    biomarkers_list = []
    for d in docs:
        ext = d.get("extracted_data", {})
        if ext.get("predicted_condition"):
            doc_findings.append(f"{ext.get('doc_type', 'Scan')}: {ext.get('predicted_condition')}")
        if ext.get("one_line_summary"):
            doc_findings.append(ext.get("one_line_summary"))
        for b in ext.get("biomarkers", []):
            if b.get("flag") != "NORMAL":
                biomarkers_list.append(f"{b.get('name')}: {b.get('value')} {b.get('unit')} [{b.get('flag')}]")

    # Predict differentials using local clinical engine
    hpi_data = hpi if isinstance(hpi, dict) else {}
    diagnoses = predict_differential_diagnosis(
        socrates_data=hpi_data,
        chief_complaint=chief_complaint,
        symptoms=symptoms,
        document_findings=doc_findings
    )

    primary_dx = diagnoses[0]["disease"] if diagnoses else "Acute Clinical Presentation"
    icd_list = [f"{d['icd_code']}: {d['disease']}" for d in diagnoses if "icd_code" in d]

    # --- 1. SUBJECTIVE ---
    hpi_details = []
    if isinstance(hpi, dict) and "history_of_present_illness" in hpi:
        hpi_obj = hpi["history_of_present_illness"]
        if hpi_obj.get("onset"): hpi_details.append(f"Onset: {hpi_obj['onset']}")
        if hpi_obj.get("character"): hpi_details.append(f"Quality: {hpi_obj['character']}")
        if hpi_obj.get("radiation"): hpi_details.append(f"Radiation: {hpi_obj['radiation']}")
        if hpi_obj.get("severity"): hpi_details.append(f"Severity: {hpi_obj['severity']}")
        if hpi_obj.get("aggravating_factors"): hpi_details.append(f"Aggravating: {hpi_obj['aggravating_factors']}")
        if hpi_obj.get("relieving_factors"): hpi_details.append(f"Relieving: {hpi_obj['relieving_factors']}")

    symptom_str = ", ".join(symptoms) if symptoms else "None formally recorded"
    hpi_narrative = "; ".join(hpi_details) if hpi_details else "Detailed chronology reviewed during intake interview."
    subjective_text = (
        f"Patient presents for {care_mode} outpatient evaluation with chief complaint of '{chief_complaint}'. "
        f"Reported symptoms: {symptom_str}. "
        f"Chronology & Characteristics: {hpi_narrative}. "
        f"{'Red flag alert triggers noted at intake: ' + ', '.join(red_flags) + '.' if red_flags else 'No acute catastrophic red flags declared during kiosk interview.'}"
    )

    # --- 2. OBJECTIVE ---
    obj_points = [
        f"Triage Priority: {risk_level} (Calculated Risk Index: {risk_score}/100)",
        f"Demographics: {age} year old {gender}",
        f"Care Modality: {care_mode}"
    ]
    if doc_findings:
        obj_points.append(f"Diagnostic Scan / Document Findings: {'; '.join(doc_findings)}")
    else:
        obj_points.append("Imaging / Diagnostic Uploads: None uploaded at kiosk")

    if biomarkers_list:
        obj_points.append(f"Abnormal Biomarkers: {', '.join(biomarkers_list)}")

    objective_text = "\n".join([f"- {p}" for p in obj_points])

    # --- 3. ASSESSMENT ---
    diff_strings = [f"{i+1}. {d['disease']} (Confidence: {int(d['probability']*100)}%) — {d['rationale']}" for i, d in enumerate(diagnoses)]
    assessment_text = (
        f"Primary Clinical Impression: {primary_dx}.\n"
        f"Clinical Risk Stratification: {risk_level} priority presentation.\n"
        f"Differential Diagnoses:\n" + "\n".join(diff_strings)
    )

    # --- 4. PLAN ---
    plan_steps = [
        f"1. Detailed bedside clinical examination and vital signs recording (BP, Pulse, SpO2, Temp).",
        f"2. Confirm primary differential ({primary_dx}) with focused clinical evaluation.",
        f"3. Diagnostic Investigations: Review uploaded diagnostic materials; order CBC, ECG, or targeted imaging as clinically indicated.",
        f"4. Pharmacotherapy & Management: Initiate appropriate therapeutic regimen based on physician confirmation; provide symptom relief.",
        f"5. Patient Counseling: Advise on hydration, rest, and lifestyle precautions pertinent to presentation."
    ]
    plan_text = "\n".join(plan_steps)

    # --- 5. FOLLOW UP ---
    follow_up_text = (
        "Review in OPD in 48-72 hours with investigation reports. "
        "Instructed to return to emergency triage immediately if worsening dyspnea, acute chest pain, persistent high fever, or altered mental status occurs."
    )

    return {
        "subjective": subjective_text,
        "objective": objective_text,
        "assessment": assessment_text,
        "plan": plan_text,
        "follow_up": follow_up_text,
        "icd_codes": icd_list
    }

