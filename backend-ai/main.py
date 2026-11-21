from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import os
import shutil
import tempfile
from typing import Dict, Any, List, Optional
from radiology_engine import analyze_uploaded_document
from clinical_engine import predict_differential_diagnosis, generate_clinical_soap

# ── ML Model Manager (lazy-loaded singletons) ────────────────────────────────
from ml_models.model_manager import MLModelManager
_ml = MLModelManager.instance()

app = FastAPI(title="VAIDYcare-AI Python Microservice — ML Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except (OSError, ImportError):
    nlp = None

# ─────────────────────────────────────────────────────────────────────────────
# EXPANDED ML MEDICAL KEYWORD DATABASE
# Each tuple: (pattern, medical_label, suspected_disease, icd_code, organ_system, confidence_weight)
# Priority: RED = emergency/critical, YELLOW = moderate/monitor, GREEN = routine/stable
# ─────────────────────────────────────────────────────────────────────────────

RED_KEYWORDS = [
    # ── Cardiac ──────────────────────────────────────────────────────────────
    ("chest pain",        "Chest Pain",               "Acute Coronary Syndrome / STEMI",       "I21.9",  "Cardiac",        0.95),
    ("chest tightness",   "Chest Tightness",          "Angina Pectoris / ACS",                 "I20.9",  "Cardiac",        0.90),
    ("heart attack",      "Myocardial Infarction",    "Acute MI",                              "I21.9",  "Cardiac",        0.98),
    ("palpitation",       "Palpitations",             "Cardiac Arrhythmia",                    "R00.2",  "Cardiac",        0.82),
    ("irregular heartbeat","Arrhythmia",              "Atrial Fibrillation",                   "I48.91", "Cardiac",        0.88),
    ("left arm pain",     "Left Arm Pain",            "Referred Cardiac Pain",                 "I21.9",  "Cardiac",        0.87),
    # ── Respiratory ──────────────────────────────────────────────────────────
    ("can't breathe",     "Dyspnea (Acute)",          "Respiratory Failure",                   "J96.00", "Respiratory",    0.97),
    ("cannot breathe",    "Acute Dyspnea",            "Respiratory Failure",                   "J96.00", "Respiratory",    0.97),
    ("difficulty breathing","Dyspnea",                "Respiratory Distress",                  "R06.09", "Respiratory",    0.93),
    ("shortness of breath","Dyspnea",                 "COPD / Asthma / Cardiac",               "R06.00", "Respiratory",    0.90),
    ("gasping",           "Acute Dyspnea",            "Respiratory Emergency",                 "R06.09", "Respiratory",    0.96),
    ("breathless at rest","Orthopnoea",               "Heart Failure / COPD",                  "R06.09", "Respiratory",    0.92),
    ("wheezing",          "Wheeze",                   "Bronchial Asthma / COPD",               "J45.901","Respiratory",    0.85),
    # ── Neurological ─────────────────────────────────────────────────────────
    ("seizure",           "Seizure",                  "Epilepsy / Neurological Emergency",     "G40.909","Neurological",   0.97),
    ("unconscious",       "Loss of Consciousness",    "Neurological Emergency",                "R55",    "Neurological",   0.98),
    ("fainted",           "Syncope",                  "Cardiac / Vasovagal Syncope",           "R55",    "Neurological",   0.90),
    ("stroke",            "Stroke",                   "Ischaemic / Haemorrhagic Stroke",       "I63.9",  "Neurological",   0.98),
    ("slurred speech",    "Dysarthria",               "Possible Stroke / TIA",                 "I63.9",  "Neurological",   0.93),
    ("paralysis",         "Paralysis",                "Stroke / Spinal Injury",                "G82.50", "Neurological",   0.96),
    ("sudden weakness",   "Acute Weakness",           "Possible Stroke / TIA",                 "I63.9",  "Neurological",   0.91),
    ("face droop",        "Facial Droop",             "Stroke (FAST Criteria)",                "I63.9",  "Neurological",   0.97),
    ("confusion",         "Acute Confusion",          "Encephalopathy / Sepsis",               "R41.3",  "Neurological",   0.88),
    # ── Haemorrhage ──────────────────────────────────────────────────────────
    ("coughing blood",    "Haemoptysis",              "Pulmonary Haemorrhage / TB / Ca",       "R04.2",  "Respiratory",    0.95),
    ("vomiting blood",    "Haematemesis",             "Upper GI Haemorrhage",                  "K92.0",  "Gastrointestinal",0.96),
    ("blood in stool",    "Melaena / Haematochezia",  "Lower GI Haemorrhage",                  "K92.1",  "Gastrointestinal",0.94),
    ("heavy bleeding",    "Haemorrhage",              "Acute Bleeding Emergency",               "R58",    "Haematological", 0.95),
    ("blood in urine",    "Haematuria",               "Renal Calculus / Bladder Ca / UTI",     "R31.9",  "Urological",     0.88),
    # ── Psychiatric ──────────────────────────────────────────────────────────
    ("suicid",            "Suicidal Ideation",        "Psychiatric Emergency",                  "R45.851","Psychiatric",    1.00),
    ("self harm",         "Self-Harm",                "Psychiatric Emergency",                  "T14.91", "Psychiatric",    1.00),
    ("end my life",       "Suicidal Ideation",        "Psychiatric Emergency",                  "R45.851","Psychiatric",    1.00),
    # ── Acute Abdomen ────────────────────────────────────────────────────────
    ("severe abdominal pain","Severe Abdominal Pain", "Acute Abdomen / Appendicitis / Perforated Viscus","K35.80","Gastrointestinal",0.93),
    ("worst pain of my life","Acute Severe Pain",     "Aortic Dissection / Subarachnoid Haemorrhage","R10.9","Vascular",    0.92),
    # ── Metabolic / Allergic ─────────────────────────────────────────────────
    ("anaphylaxis",       "Anaphylaxis",              "Severe Allergic Reaction",               "T78.2",  "Immunological",  0.99),
    ("allergic reaction", "Allergic Reaction",        "Anaphylaxis Risk",                       "T78.40", "Immunological",  0.88),
    ("high fever",        "Hyperpyrexia",             "Sepsis / Meningitis",                    "A41.9",  "Infectious",     0.87),
    ("diabetic",          "Diabetic Crisis",          "DKA / Hypoglycaemia",                    "E11.9",  "Endocrine",      0.88),
    ("hypoglycemia",      "Hypoglycaemia",            "Diabetic Emergency",                     "E16.0",  "Endocrine",      0.90),
    ("very high bp",      "Hypertensive Crisis",      "Hypertensive Emergency",                 "I16.1",  "Cardiac",        0.92),
    ("eclampsia",         "Eclampsia",                "Obstetric Emergency",                    "O15.9",  "Obstetric",      0.99),
    # ── Critical Diagnostics / Oncology / Imaging ────────────────────────────
    ("brain tumor",       "Brain Tumor",              "Intracranial Neoplasm / Glioma",         "C71.9",  "Neurological",   0.99),
    ("brain mass",        "Intracranial Mass",        "Space Occupying Lesion",                 "C71.9",  "Neurological",   0.98),
    ("tumor",             "Tumor / Neoplasm",         "Malignant / Benign Neoplasm",            "C80.1",  "Oncological",    0.95),
    ("glioma",            "Glioma",                   "Malignant Brain Tumor",                  "C71.9",  "Neurological",   0.99),
    ("glioblastoma",      "Glioblastoma Multiforme",  "High-Grade Brain Malignancy",            "C71.9",  "Neurological",   1.00),
    ("malignan",          "Malignancy",               "Malignant Neoplasm",                     "C80.1",  "Oncological",    0.97),
    ("carcinoma",         "Carcinoma",                "Carcinomatous Neoplasm",                 "C80.1",  "Oncological",    0.97),
    ("cancer",            "Malignant Neoplasm",       "Cancer",                                 "C80.1",  "Oncological",    0.96),
    ("metastasis",        "Metastatic Neoplasm",      "Metastatic Cancer",                      "C79.9",  "Oncological",    0.98),
    ("metastatic",        "Metastatic Disease",       "Metastatic Neoplasm",                    "C79.9",  "Oncological",    0.98),
    ("hemorrhage",        "Acute Hemorrhage",         "Intracranial / Internal Hemorrhage",     "I61.9",  "Vascular",       0.97),
    ("haemorrhage",       "Acute Haemorrhage",        "Intracranial / Internal Haemorrhage",    "I61.9",  "Vascular",       0.97),
    ("midline shift",     "Midline Shift",            "Severe Intracranial Mass Effect",        "G93.5",  "Neurological",   0.99),
    ("mass effect",       "Mass Effect",              "Intracranial Space-Occupying Lesion",    "G93.5",  "Neurological",   0.96),
    ("fracture",          "Bone Fracture",            "Traumatic Skeletal Fracture",            "T14.8",  "Musculoskeletal",0.95),
    ("displaced",         "Displaced Fracture",       "Displaced Bone Fracture",                "T14.8",  "Musculoskeletal",0.96),
    ("pneumothorax",      "Pneumothorax",             "Tension / Acute Pneumothorax",           "J93.9",  "Respiratory",    0.98),
    ("pulmonary embolism","Pulmonary Embolism",       "Acute Pulmonary Embolism",               "I26.99", "Cardiovascular", 0.99),
    ("consolidation",     "Lung Consolidation",       "Pneumonia / Lobar Consolidation",        "J18.9",  "Respiratory",    0.91),
    ("perforat",          "Perforation",              "Viscus Perforation / Acute Abdomen",     "K63.1",  "Gastrointestinal",0.98),
    ("ruptur",            "Rupture",                  "Vascular / Visceral Rupture",            "T14.8",  "Emergency",      0.98),
    ("aneurysm",          "Aneurysm",                 "Vascular Aneurysm Risk",                 "I72.9",  "Cardiovascular", 0.96),
    ("sepsis",            "Sepsis",                   "Systemic Septic Response",               "A41.9",  "Infectious",     0.99),
]

YELLOW_KEYWORDS = [
    # ── Diagnostic Imaging Findings ──────────────────────────────────────────
    ("nodule",            "Nodule",                   "Pulmonary / Tissue Nodule",              "R91.1",  "Radiology",      0.75),
    ("lesion",            "Lesion",                   "Tissue Lesion / Pathological Finding",   "R69",    "Pathology",      0.74),
    ("effusion",          "Effusion",                 "Pleural / Pericardial / Joint Effusion", "J90",    "Radiology",      0.78),
    ("opacity",           "Radiological Opacity",     "Ground Glass / Parenchymal Opacity",     "R91.8",  "Radiology",      0.72),
    ("shadow",            "Radiological Shadow",      "Abnormal Density on Imaging",            "R91.8",  "Radiology",      0.70),
    ("calcification",     "Calcification",            "Tissue Calcification",                   "R93.8",  "Radiology",      0.68),
    ("cardiomegaly",      "Cardiomegaly",             "Cardiomegaly / Enlarged Heart",          "I51.7",  "Cardiovascular", 0.78),
    ("hepatomegaly",      "Hepatomegaly",             "Hepatomegaly / Enlarged Liver",          "R16.0",  "Gastrointestinal",0.75),
    ("splenomegaly",      "Splenomegaly",             "Splenomegaly / Enlarged Spleen",         "R16.1",  "Haematological", 0.75),
    ("edema",             "Edema / Oedema",           "Fluid Retention / Tissue Edema",         "R60.9",  "General",        0.70),
    ("elevated",          "Elevated Finding",         "Abnormal Elevated Parameter",            "R69",    "General",        0.68),
    ("borderline",        "Borderline Value",         "Borderline Lab / Clinical Value",        "R69",    "General",        0.68),
    # ── Fever / Infection ────────────────────────────────────────────────────
    ("fever",             "Pyrexia",                  "Febrile Illness / Infection",            "R50.9",  "Infectious",     0.75),
    ("chills",            "Rigors",                   "Malaria / Sepsis / Pyogenic Infection",  "R68.89", "Infectious",     0.72),
    ("night sweats",      "Night Sweats",             "TB / Lymphoma / Menopause",              "R61",    "Oncological",    0.70),
    ("infection",         "Infection",                "Bacterial / Viral Infection",            "A49.9",  "Infectious",     0.68),
    # ── GI ───────────────────────────────────────────────────────────────────
    ("vomit",             "Emesis / Vomiting",        "GI Illness / Gastroenteritis",           "R11.10", "Gastrointestinal",0.72),
    ("nausea",            "Nausea",                   "GI Disturbance / Pregnancy",             "R11.0",  "Gastrointestinal",0.65),
    ("diarrhea",          "Diarrhoea",                "Infectious Gastroenteritis",             "K59.1",  "Gastrointestinal",0.70),
    ("diarrhoea",         "Diarrhoea",                "Infectious Gastroenteritis",             "K59.1",  "Gastrointestinal",0.70),
    ("loose motions",     "Diarrhoea",                "Acute Gastroenteritis",                  "K59.1",  "Gastrointestinal",0.68),
    ("abdominal pain",    "Abdominal Pain",           "Peptic Ulcer / Appendicitis / IBS",      "R10.9",  "Gastrointestinal",0.73),
    ("abdominal",         "Abdominal Complaint",      "GI System Pathology",                    "R10.9",  "Gastrointestinal",0.65),
    ("constipation",      "Constipation",             "GI Dysfunction / Hypothyroidism",        "K59.00", "Gastrointestinal",0.60),
    ("loss of appetite",  "Anorexia",                 "Systemic / Oncological / GI",            "R63.0",  "Gastrointestinal",0.70),
    # ── Respiratory ──────────────────────────────────────────────────────────
    ("cough",             "Cough",                    "URTI / LRTI / Asthma",                   "R05.9",  "Respiratory",    0.65),
    ("breathlessness",    "Dyspnoea",                 "Respiratory / Cardiac",                  "R06.00", "Respiratory",    0.75),
    ("sputum",            "Sputum Production",        "LRTI / Bronchitis / TB",                 "R09.3",  "Respiratory",    0.70),
    ("phlegm",            "Sputum",                   "LRTI / Bronchitis",                      "R09.3",  "Respiratory",    0.68),
    # ── Neurological ─────────────────────────────────────────────────────────
    ("headache",          "Cephalgia",                "Tension Headache / Migraine / Hypertension","R51.9","Neurological",  0.68),
    ("migraine",          "Migraine",                 "Migraine with / without Aura",           "G43.909","Neurological",   0.75),
    ("dizziness",         "Vertigo / Dizziness",      "BPPV / Vestibular / Cardiac",            "R42",    "Neurological",   0.70),
    ("numbness",          "Paraesthesia",             "Peripheral Neuropathy / TIA",            "R20.2",  "Neurological",   0.73),
    ("tingling",          "Tingling",                 "Peripheral Neuropathy / Cervical Disc",  "R20.2",  "Neurological",   0.68),
    ("memory problem",    "Memory Impairment",        "Dementia / Depression",                   "R41.3",  "Neurological",   0.72),
    # ── Musculoskeletal ──────────────────────────────────────────────────────
    ("back pain",         "Dorsalgia",                "Lumbar Disc Prolapse / Spondylosis",     "M54.50", "Musculoskeletal",0.67),
    ("joint pain",        "Arthralgia",               "Rheumatoid Arthritis / Gout / OA",      "M25.50", "Musculoskeletal",0.70),
    ("muscle pain",       "Myalgia",                  "Viral Myalgia / Fibromyalgia",           "M79.3",  "Musculoskeletal",0.65),
    ("swelling",          "Oedema",                   "Inflammatory / Cardiac / DVT",           "R60.9",  "Vascular",       0.72),
    ("joint swelling",    "Joint Effusion",           "Septic Arthritis / Gout / RA",           "M25.40", "Musculoskeletal",0.75),
    # ── Urological / Renal ───────────────────────────────────────────────────
    ("urinary",           "Urinary Complaint",        "UTI / Renal Stone / BPH",               "R39.9",  "Urological",     0.65),
    ("burning urination", "Dysuria",                  "UTI / Urethritis",                       "R30.0",  "Urological",     0.78),
    ("frequent urination","Frequency",                "UTI / Diabetes / BPH",                  "R35.0",  "Urological",     0.70),
    ("kidney pain",       "Renal / Flank Pain",       "Renal Calculus / Pyelonephritis",        "N23",    "Urological",     0.80),
    # ── Endocrine / Metabolic ────────────────────────────────────────────────
    ("weight loss",       "Weight Loss",              "Diabetes / Malignancy / Thyroid",        "R63.4",  "Endocrine",      0.75),
    ("weight gain",       "Weight Gain",              "Hypothyroidism / PCOS / Cushing",        "R63.5",  "Endocrine",      0.65),
    ("excessive thirst",  "Polydipsia",               "Diabetes Mellitus",                      "E11.65", "Endocrine",      0.80),
    ("excessive urination","Polyuria",                "Diabetes Mellitus / Diabetes Insipidus", "E11.65", "Endocrine",      0.78),
    ("fatigue",           "Fatigue / Asthenia",       "Systemic Illness / Anaemia / Thyroid",   "R53.83", "General",        0.65),
    ("weakness",          "General Weakness",         "Systemic Illness / Anaemia",             "R53.1",  "General",        0.65),
    ("dehydration",       "Dehydration",              "Metabolic Imbalance",                    "E86.0",  "Metabolic",      0.72),
    # ── Psychiatric ──────────────────────────────────────────────────────────
    ("anxiety",           "Anxiety",                  "Generalised Anxiety Disorder",           "F41.1",  "Psychiatric",    0.68),
    ("depression",        "Depression",               "Major Depressive Disorder",              "F32.9",  "Psychiatric",    0.70),
    ("insomnia",          "Insomnia",                 "Primary Insomnia / Psychiatric",         "G47.00", "Psychiatric",    0.65),
    ("panic attack",      "Panic Disorder",           "Panic Disorder",                         "F41.0",  "Psychiatric",    0.78),
    # ── Dermatological ───────────────────────────────────────────────────────
    ("rash",              "Skin Rash",                "Dermatitis / Drug Reaction / Viral Exanthem","L30.9","Dermatological",0.68),
    ("itching",           "Pruritus",                 "Allergic / Dermatological / Systemic",   "L29.9",  "Dermatological", 0.65),
    ("jaundice",          "Jaundice",                 "Hepatitis / Cholestasis / Haemolysis",   "R17",    "Hepatic",        0.82),
    # ── Obstetric / Gynaecological ────────────────────────────────────────────
    ("vaginal bleeding",  "Vaginal Haemorrhage",      "Obstetric / Gynaecological Emergency",   "N93.9",  "Obstetric",      0.85),
    ("menstrual",         "Menstrual Complaint",      "Dysmenorrhoea / PCOS / Endometriosis",   "N94.6",  "Obstetric",      0.65),
    ("pregnancy",         "Pregnancy",                "Obstetric Condition",                    "Z34.00", "Obstetric",      0.70),
    # ── Oncological ──────────────────────────────────────────────────────────
    ("lump",              "Mass / Lump",              "Malignancy / Cyst / Lymphadenopathy",    "R22.9",  "Oncological",    0.78),
    ("lymph node",        "Lymphadenopathy",          "Lymphoma / Infection / Malignancy",      "R59.9",  "Oncological",    0.75),
    ("blood in cough",    "Haemoptysis",              "Lung Carcinoma / TB",                    "R04.2",  "Oncological",    0.85),
    # ── Vascular ─────────────────────────────────────────────────────────────
    ("leg swelling",      "Peripheral Oedema",        "DVT / Heart Failure / CKD",              "R60.0",  "Vascular",       0.75),
    ("pain",              "Pain (Algia)",             "Various Aetiology",                      "R52",    "General",        0.60),
    ("burning",           "Burning Sensation",        "GERD / Neuropathy / UTI",               "R68.89", "General",        0.62),
]

GREEN_KEYWORDS = [
    ("mild cough",        "Mild Cough",               "Upper Respiratory Tract Infection",      "J06.9",  "Respiratory",    0.50),
    ("runny nose",        "Rhinorrhoea",              "Allergic Rhinitis / URTI",               "J30.9",  "Respiratory",    0.45),
    ("sneezing",          "Sneezing",                 "Allergic Rhinitis / Viral URTI",         "J30.9",  "Respiratory",    0.42),
    ("sore throat",       "Pharyngitis",              "Viral / Bacterial Pharyngitis",          "J02.9",  "Respiratory",    0.50),
    ("blocked nose",      "Nasal Congestion",         "Rhinitis / Sinusitis",                   "J34.89", "Respiratory",    0.45),
    ("cold",              "Upper Respiratory",        "Common Cold / Viral URTI",              "J06.9",  "Respiratory",    0.45),
    ("skin dryness",      "Xerosis",                  "Dermatological / Atopic",               "L85.3",  "Dermatological", 0.40),
    ("acne",              "Acne Vulgaris",            "Acne Vulgaris",                         "L70.0",  "Dermatological", 0.42),
    ("dandruff",          "Seborrhoeic Dermatitis",   "Seborrhoeic Dermatitis",                "L21.0",  "Dermatological", 0.38),
    ("hair loss",         "Alopecia",                 "Alopecia / Androgenetic / Thyroid",     "L65.9",  "Dermatological", 0.45),
    ("eye strain",        "Asthenopia",               "Refractive Error / Eye Fatigue",        "H53.14", "Ophthalmological",0.40),
    ("eye redness",       "Conjunctival Injection",   "Conjunctivitis",                        "H10.30", "Ophthalmological",0.48),
    ("bloating",          "Abdominal Bloating",       "IBS / Dyspepsia",                       "R14.0",  "Gastrointestinal",0.45),
    ("gas",               "Flatulence",               "Flatulence / IBS",                      "R14.3",  "Gastrointestinal",0.40),
    ("indigestion",       "Dyspepsia",                "Functional Dyspepsia / GERD",           "K30",    "Gastrointestinal",0.48),
    ("heartburn",         "Pyrosis / GERD",           "Gastro-Oesophageal Reflux Disease",     "K21.0",  "Gastrointestinal",0.52),
    ("mild headache",     "Mild Cephalgia",           "Tension Headache",                      "G44.309","Neurological",   0.45),
    ("stress",            "Stress",                   "Adjustment Disorder / Stress Response", "Z73.3",  "Psychiatric",    0.42),
    ("tiredness",         "Fatigue",                  "General Fatigue / Lifestyle",           "R53.83", "General",        0.40),
    ("muscle ache",       "Myalgia",                  "Post-exercise / Viral Myalgia",         "M79.3",  "Musculoskeletal",0.45),
    ("routine checkup",   "Routine Checkup",          "Preventive Health Screening",           "Z00.00", "Preventive",     0.35),
    ("general checkup",   "General Checkup",          "Preventive Health Screening",           "Z00.00", "Preventive",     0.35),
    ("vaccination",       "Vaccination",              "Preventive Immunization",               "Z23",    "Preventive",     0.35),
    ("follow up",         "Follow-up Visit",          "Continuity of Care",                    "Z09",    "Preventive",     0.35),
    ("prescription refill","Prescription Refill",     "Chronic Disease Management",             "Z76.0",  "Preventive",     0.38),
    ("vitamin",           "Nutritional Supplement",   "Nutritional Deficiency / Preventive",   "Z13.21", "Preventive",     0.38),
    ("wrist pain",        "Wrist Pain",               "Tendinitis / Carpal Tunnel",            "M79.622","Musculoskeletal",0.45),
    ("knee pain",         "Knee Pain",                "OA Knee / Ligament Strain",             "M25.561","Musculoskeletal",0.48),
    ("shoulder pain",     "Shoulder Pain",            "Rotator Cuff / Frozen Shoulder",       "M75.100","Musculoskeletal",0.45),
]


def extract_priority_keywords(text: str) -> tuple:
    """
    ML-style keyword extraction using:
    1. Multi-pass pattern matching with specificity-priority ordering
       (longer/more-specific patterns are tested before shorter ones)
    2. Confidence weighting for priority scoring
    3. SpaCy NLP noun chunk extraction for unlisted symptoms
    4. Returns (flagged_list, overall_condition, overall_color)
    """
    text_lower = text.lower()
    found = {}  # key = medical_label — deduplicates overlapping matches

    def _add(label, priority, priority_score, rationale, pattern,
             disease, icd, system, confidence, color, bg, border, icon):
        key = label
        # Only overwrite if new priority is strictly higher
        if key not in found or found[key]["priority_score"] < priority_score * confidence:
            found[key] = {
                "keyword":         label,
                "priority":        priority,
                "priority_score":  round(priority_score * confidence, 3),
                "medical_label":   label,
                "suspected_disease": disease,
                "icd_code":        icd,
                "organ_system":    system,
                "rationale":       rationale,
                "matched_text":    pattern,
                "confidence":      f"{int(confidence * 100)}%",
                "color":           color,
                "bg_color":        bg,
                "border_color":    border,
                "icon":            icon,
            }

    # Step 1: RED — process longer patterns first for specificity
    sorted_red = sorted(RED_KEYWORDS, key=lambda x: len(x[0]), reverse=True)
    for pattern, label, disease, icd, system, conf in sorted_red:
        if pattern in text_lower:
            _add(label, "RED", 3, disease, pattern, disease, icd, system, conf,
                 "#EF4444", "#FEF2F2", "#FECACA", "!")

    # Step 2: YELLOW — skip if already RED
    sorted_yellow = sorted(YELLOW_KEYWORDS, key=lambda x: len(x[0]), reverse=True)
    for pattern, label, disease, icd, system, conf in sorted_yellow:
        if pattern in text_lower:
            key = label
            if key not in found or found[key]["priority"] not in ("RED",):
                _add(label, "YELLOW", 2, disease, pattern, disease, icd, system, conf,
                     "#D97706", "#FFFBEB", "#FDE68A", "~")

    # Step 3: GREEN — only if not already in found
    sorted_green = sorted(GREEN_KEYWORDS, key=lambda x: len(x[0]), reverse=True)
    for pattern, label, disease, icd, system, conf in sorted_green:
        if pattern in text_lower:
            key = label
            if key not in found:
                _add(label, "GREEN", 1, disease, pattern, disease, icd, system, conf,
                     "#059669", "#ECFDF5", "#A7F3D0", "v")

    # Step 4: SpaCy NLP — extract novel noun chunks not in our DB
    if nlp:
        doc = nlp(text)
        all_patterns = (
            [p for p, *_ in RED_KEYWORDS] +
            [p for p, *_ in YELLOW_KEYWORDS] +
            [p for p, *_ in GREEN_KEYWORDS]
        )
        for chunk in doc.noun_chunks:
            chunk_text = chunk.text.lower().strip()
            if len(chunk_text) > 3 and chunk.root.pos_ == "NOUN":
                already_matched = any(
                    p in chunk_text or chunk_text in p
                    for p in all_patterns
                )
                if not already_matched and chunk_text not in found:
                    found[chunk_text] = {
                        "keyword":           chunk.text.title(),
                        "priority":          "GREEN",
                        "priority_score":    0.40,
                        "medical_label":     chunk.text.title(),
                        "suspected_disease": "Symptom — further evaluation needed",
                        "icd_code":          "R68.89",
                        "organ_system":      "General",
                        "rationale":         "NLP-extracted clinical term",
                        "matched_text":      chunk_text,
                        "confidence":        "40%",
                        "color":             "#059669",
                        "bg_color":          "#ECFDF5",
                        "border_color":      "#A7F3D0",
                        "icon":              "v",
                    }

    # Step 5: Sort by priority score descending
    result = sorted(found.values(), key=lambda x: x["priority_score"], reverse=True)

    # Step 6: Overall condition
    if any(k["priority"] == "RED" for k in result):
        overall, overall_color = "CRITICAL", "RED"
    elif any(k["priority"] == "YELLOW" for k in result):
        overall, overall_color = "MODERATE", "YELLOW"
    else:
        overall, overall_color = "STABLE", "GREEN"

    return result, overall, overall_color


# ─────────────────────────────────────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "status": "VAIDYcare-AI Python ML Engine running",
        "spacy_loaded": nlp is not None,
        "keyword_database": {
            "red": len(RED_KEYWORDS),
            "yellow": len(YELLOW_KEYWORDS),
            "green": len(GREEN_KEYWORDS),
            "total": len(RED_KEYWORDS) + len(YELLOW_KEYWORDS) + len(GREEN_KEYWORDS)
        }
    }


class ComplaintRequest(BaseModel):
    text: str

@app.post("/api/ai/analyze-complaint")
def analyze_complaint(req: ComplaintRequest):
    if not nlp:
        return {"error": "NLP model not loaded", "medical_terms": [], "extracted_symptoms": []}
    doc = nlp(req.text)
    symptoms = [chunk.text for chunk in doc.noun_chunks]
    medical_terms = []
    text_lower = req.text.lower()
    if "pain" in text_lower or "hurts" in text_lower: medical_terms.append("Algia / Pain")
    if "stomach" in text_lower or "belly" in text_lower: medical_terms.append("Abdominal")
    if "fever" in text_lower or "hot" in text_lower: medical_terms.append("Pyrexia")
    if "vomit" in text_lower or "throw up" in text_lower: medical_terms.append("Emesis")
    return {"original_text": req.text, "extracted_symptoms": symptoms, "medical_terms": medical_terms}


class DiagnosisRequest(BaseModel):
    socrates_data: Dict[str, Any] = {}
    chief_complaint: Optional[str] = ""
    symptoms: Optional[List[str]] = []
    document_findings: Optional[List[str]] = []

@app.post("/api/ai/predict-diagnosis")
def predict_diagnosis(req: DiagnosisRequest):
    diagnoses = predict_differential_diagnosis(
        socrates_data=req.socrates_data,
        chief_complaint=req.chief_complaint or "",
        symptoms=req.symptoms or [],
        document_findings=req.document_findings or []
    )
    return {"top_diagnoses": diagnoses}

@app.post("/api/ai/analyze-document")
async def analyze_document_endpoint(file: UploadFile = File(...)):
    """
    Multimodal Medical Document & Radiological Scan Analysis Endpoint.
    Direct local ML replacement for Gemini multimodal API.
    """
    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        content_type = file.content_type or "image/jpeg"
        result = analyze_uploaded_document(tmp_path, content_type)
        return result
    except Exception as e:
        print(f"[analyze-document] Processing error: {e}")
        return {
            "doc_type": "RADIOLOGY_XRAY",
            "category_label": "Radiology / Diagnostic Scan",
            "predicted_condition": "Diagnostic Scan (Pending Manual Review)",
            "one_line_summary": f"Document processed locally. Review required.",
            "full_report_text": f"Error during local ML processing: {str(e)}",
            "essential_bullet_points": [
                {"text": "Scan received — queued for physician review", "flag": "YELLOW", "category": "Status"}
            ],
            "extracted_medications": [],
            "biomarkers": [],
            "suspected_conditions": [],
            "risk_score": 30
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

@app.post("/api/ai/generate-soap")
def generate_soap_endpoint(encounter: Dict[str, Any]):
    """
    Clinical SOAP Note Generation Endpoint.
    Synthesizes Subjective, Objective, Assessment, Plan, and ICD-10 codes.
    Direct local ML replacement for Gemini SOAP generator.
    """
    return generate_clinical_soap(encounter)


# ─────────────────────────────────────────────────────────────────────────────
# ML KEYWORD FLAGGING ENGINE  (full intake submission)
# ─────────────────────────────────────────────────────────────────────────────

class KeywordFlagRequest(BaseModel):
    chief_complaint: str = ""
    interview_answers: Dict[str, Any] = {}
    symptoms: List[str] = []

@app.post("/api/ai/flag-keywords")
def flag_keywords(req: KeywordFlagRequest):
    """
    Master ML keyword extraction + priority flagging endpoint.
    Combines chief complaint + all interview answers into one corpus,
    runs the priority engine, and returns color-coded clinical keywords
    with ICD-10 codes, organ system, suspected disease, and confidence scores.
    """
    all_text_parts = [req.chief_complaint]
    for key, val in req.interview_answers.items():
        if isinstance(val, str):
            all_text_parts.append(val)
        elif isinstance(val, list):
            all_text_parts.extend(val)
    all_text_parts.extend(req.symptoms)
    full_text = " ".join(str(p) for p in all_text_parts if p)

    flagged_keywords, overall_condition, overall_color = extract_priority_keywords(full_text)

    red_flags    = [k for k in flagged_keywords if k["priority"] == "RED"]
    yellow_flags = [k for k in flagged_keywords if k["priority"] == "YELLOW"]
    green_flags  = [k for k in flagged_keywords if k["priority"] == "GREEN"]

    # Group by organ system
    systems: Dict[str, List] = {}
    for k in flagged_keywords:
        sys_name = k.get("organ_system", "General")
        systems.setdefault(sys_name, []).append(k)

    return {
        "overall_condition":   overall_condition,
        "overall_color":       overall_color,
        "total_keywords":      len(flagged_keywords),
        "red_count":           len(red_flags),
        "yellow_count":        len(yellow_flags),
        "green_count":         len(green_flags),
        "flagged_keywords":    flagged_keywords,
        "red_flags":           red_flags,
        "yellow_flags":        yellow_flags,
        "green_flags":         green_flags,
        "by_organ_system":     systems,
        "clinical_summary":    (
            f"Patient presents with {len(red_flags)} critical, "
            f"{len(yellow_flags)} moderate, and {len(green_flags)} routine clinical indicators "
            f"across {len(systems)} organ system(s). Overall: {overall_condition}."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW: REAL-TIME CLASSIFY-INTAKE  (live as patient types)
# ─────────────────────────────────────────────────────────────────────────────

class ClassifyIntakeRequest(BaseModel):
    text: str

@app.post("/api/ai/classify-intake")
def classify_intake(req: ClassifyIntakeRequest):
    """
    Lightweight real-time endpoint for live keyword preview in the Patient Kiosk.
    Accepts a plain text string (chief complaint as the patient types) and returns
    instant keyword flags — optimised for low latency.
    """
    if not req.text or len(req.text.strip()) < 2:
        return {
            "overall_condition": "STABLE",
            "overall_color":     "GREEN",
            "flagged_keywords":  [],
            "red_count":         0,
            "yellow_count":      0,
            "green_count":       0,
        }

    flagged_keywords, overall_condition, overall_color = extract_priority_keywords(req.text)

    return {
        "overall_condition": overall_condition,
        "overall_color":     overall_color,
        "flagged_keywords":  flagged_keywords[:12],   # cap for real-time performance
        "red_count":         sum(1 for k in flagged_keywords if k["priority"] == "RED"),
        "yellow_count":      sum(1 for k in flagged_keywords if k["priority"] == "YELLOW"),
        "green_count":       sum(1 for k in flagged_keywords if k["priority"] == "GREEN"),
    }


@app.post("/api/ai/ocr")
def process_ocr(file: UploadFile = File(...)):
    return {
        "filename": file.filename,
        "extracted_text": "MOCK OCR TEXT: Hemoglobin: 11.5 g/dL, WBC: 8500 cu.mm",
        "biomarkers": {"Hemoglobin": "11.5 g/dL (Low)", "WBC": "8500 cu.mm (Normal)"}
    }


# =============================================================================
#  PRESCRIPTION KEYWORD EXTRACTOR
#  Parses raw OCR/handwritten-prescription text and returns:
#   - Structured medicines (drug, dose, frequency, duration, route, flag)
#   - Extracted diagnosis / provisional findings
#   - Flagged clinical keywords (RED/YELLOW/GREEN) for the doctor panel
#   - Special instructions and allergen warnings
# =============================================================================

# ── Comprehensive drug database ──────────────────────────────────────────────
# Format: (pattern_substring, display_name, drug_class, typical_use, flag)
DRUG_DB = [
    # ── Analgesics / NSAIDs ──────────────────────────────────────────────────
    ("paracetamol",   "Paracetamol (Acetaminophen)", "Analgesic/Antipyretic",   "Pain & Fever",         "GREEN"),
    ("acetaminophen", "Acetaminophen",               "Analgesic/Antipyretic",   "Pain & Fever",         "GREEN"),
    ("ibuprofen",     "Ibuprofen",                   "NSAID",                   "Pain/Inflammation",    "YELLOW"),
    ("diclofenac",    "Diclofenac",                  "NSAID",                   "Pain/Inflammation",    "YELLOW"),
    ("naproxen",      "Naproxen",                    "NSAID",                   "Pain/Inflammation",    "YELLOW"),
    ("aspirin",       "Aspirin",                     "NSAID/Antiplatelet",      "Pain/Cardiac",         "YELLOW"),
    ("tramadol",      "Tramadol",                    "Opioid Analgesic",        "Moderate–Severe Pain", "RED"),
    ("morphine",      "Morphine",                    "Opioid",                  "Severe Pain",          "RED"),
    ("codeine",       "Codeine",                     "Opioid Analgesic",        "Pain/Cough",           "YELLOW"),
    ("ketorolac",     "Ketorolac",                   "NSAID",                   "Acute Pain",           "YELLOW"),
    ("celecoxib",     "Celecoxib",                   "COX-2 Inhibitor",         "Arthritis Pain",       "YELLOW"),
    # ── Antibiotics ──────────────────────────────────────────────────────────
    ("amoxicillin",   "Amoxicillin",                 "Penicillin Antibiotic",   "Bacterial Infection",  "YELLOW"),
    ("amoxyclav",     "Amoxicillin-Clavulanate",     "Penicillin+ Antibiotic",  "Resistant Infections", "YELLOW"),
    ("augmentin",     "Augmentin",                   "Penicillin+ Antibiotic",  "Resistant Infections", "YELLOW"),
    ("azithromycin",  "Azithromycin",                "Macrolide Antibiotic",    "Respiratory/Skin Inf", "YELLOW"),
    ("azithro",       "Azithromycin",                "Macrolide Antibiotic",    "Respiratory/Skin Inf", "YELLOW"),
    ("ciprofloxacin", "Ciprofloxacin",               "Fluoroquinolone",         "UTI/Respiratory Inf",  "YELLOW"),
    ("levofloxacin",  "Levofloxacin",                "Fluoroquinolone",         "Pneumonia/UTI",        "YELLOW"),
    ("doxycycline",   "Doxycycline",                 "Tetracycline",            "Chlamydia/Lyme/Acne",  "YELLOW"),
    ("metronidazole", "Metronidazole",               "Nitroimidazole",          "Anaerobic/Protozoa",   "YELLOW"),
    ("cefixime",      "Cefixime",                    "Cephalosporin",           "Bacterial Infection",  "YELLOW"),
    ("cefpodoxime",   "Cefpodoxime",                 "Cephalosporin",           "Respiratory Inf",      "YELLOW"),
    ("ceftriaxone",   "Ceftriaxone",                 "3rd Gen Cephalosporin",   "Serious Infection",    "RED"),
    ("vancomycin",    "Vancomycin",                  "Glycopeptide Antibiotic", "MRSA/Serious Inf",     "RED"),
    ("meropenem",     "Meropenem",                   "Carbapenem",              "Severe Infection",     "RED"),
    ("fluconazole",   "Fluconazole",                 "Antifungal",              "Fungal Infection",     "YELLOW"),
    # ── Cardiovascular ──────────────────────────────────────────────────────
    ("amlodipine",    "Amlodipine",                  "Ca-Channel Blocker",      "Hypertension/Angina",  "YELLOW"),
    ("atenolol",      "Atenolol",                    "Beta-Blocker",            "Hypertension/Angina",  "YELLOW"),
    ("metoprolol",    "Metoprolol",                  "Beta-Blocker",            "Hypertension/AF",      "YELLOW"),
    ("enalapril",     "Enalapril",                   "ACE Inhibitor",           "Hypertension/HF",      "YELLOW"),
    ("lisinopril",    "Lisinopril",                  "ACE Inhibitor",           "Hypertension/HF",      "YELLOW"),
    ("ramipril",      "Ramipril",                    "ACE Inhibitor",           "Hypertension/HF",      "YELLOW"),
    ("losartan",      "Losartan",                    "ARB",                     "Hypertension",         "YELLOW"),
    ("telmisartan",   "Telmisartan",                 "ARB",                     "Hypertension",         "YELLOW"),
    ("furosemide",    "Furosemide",                  "Loop Diuretic",           "Oedema/Heart Failure", "RED"),
    ("spironolactone","Spironolactone",               "K-Sparing Diuretic",     "HF/Hyperaldosteronism","YELLOW"),
    ("digoxin",       "Digoxin",                     "Cardiac Glycoside",       "HF/AF",                "RED"),
    ("warfarin",      "Warfarin",                    "Anticoagulant",           "DVT/AF/Valve Dis.",    "RED"),
    ("heparin",       "Heparin",                     "Anticoagulant",           "DVT/Thrombosis",       "RED"),
    ("clopidogrel",   "Clopidogrel",                 "Antiplatelet",            "ACS/Stroke Prevention","RED"),
    ("nitroglycer",   "Nitroglycerine",              "Nitrate",                 "Angina",               "RED"),
    ("isosorbide",    "Isosorbide",                  "Nitrate",                 "Angina/HF",            "YELLOW"),
    ("statins",       "Statin",                      "Lipid-Lowering",          "Hyperlipidaemia",      "GREEN"),
    ("atorvastatin",  "Atorvastatin",                "Statin",                  "Hypercholesterolaemia","GREEN"),
    ("rosuvastatin",  "Rosuvastatin",                "Statin",                  "Hypercholesterolaemia","GREEN"),
    # ── Diabetes ─────────────────────────────────────────────────────────────
    ("metformin",     "Metformin",                   "Biguanide",               "Type 2 Diabetes",      "GREEN"),
    ("glimepiride",   "Glimepiride",                 "Sulfonylurea",            "Type 2 Diabetes",      "YELLOW"),
    ("glipizide",     "Glipizide",                   "Sulfonylurea",            "Type 2 Diabetes",      "YELLOW"),
    ("sitagliptin",   "Sitagliptin",                 "DPP-4 Inhibitor",         "Type 2 Diabetes",      "GREEN"),
    ("insulin",       "Insulin",                     "Insulin",                 "Diabetes",             "RED"),
    ("dapagliflozin", "Dapagliflozin",               "SGLT-2 Inhibitor",        "Type 2 Diabetes/HF",  "YELLOW"),
    ("empagliflozin", "Empagliflozin",               "SGLT-2 Inhibitor",        "Type 2 Diabetes/HF",  "YELLOW"),
    # ── Respiratory ──────────────────────────────────────────────────────────
    ("salbutamol",    "Salbutamol (Albuterol)",      "SABA Bronchodilator",     "Asthma/COPD",          "YELLOW"),
    ("albuterol",     "Albuterol",                   "SABA Bronchodilator",     "Asthma/COPD",          "YELLOW"),
    ("salmeterol",    "Salmeterol",                  "LABA Bronchodilator",     "Asthma/COPD",          "YELLOW"),
    ("formoterol",    "Formoterol",                  "LABA Bronchodilator",     "Asthma/COPD",          "YELLOW"),
    ("tiotropium",    "Tiotropium",                  "LAMA Bronchodilator",     "COPD",                 "YELLOW"),
    ("budesonide",    "Budesonide",                  "Inhaled Corticosteroid",  "Asthma/COPD",          "YELLOW"),
    ("montelukast",   "Montelukast",                 "Leukotriene Antagonist",  "Asthma/Rhinitis",      "GREEN"),
    ("dextromethorphan","Dextromethorphan",          "Antitussive",             "Dry Cough",            "GREEN"),
    ("guaifenesin",   "Guaifenesin",                 "Expectorant",             "Productive Cough",     "GREEN"),
    # ── GI / Gastroenterology ────────────────────────────────────────────────
    ("omeprazole",    "Omeprazole",                  "PPI",                     "GERD/Peptic Ulcer",    "GREEN"),
    ("pantoprazole",  "Pantoprazole",                "PPI",                     "GERD/Peptic Ulcer",    "GREEN"),
    ("rabeprazole",   "Rabeprazole",                 "PPI",                     "GERD/Peptic Ulcer",    "GREEN"),
    ("esomeprazole",  "Esomeprazole",                "PPI",                     "GERD/Peptic Ulcer",    "GREEN"),
    ("ranitidine",    "Ranitidine",                  "H2-Blocker",              "Gastric Acidity",      "GREEN"),
    ("ondansetron",   "Ondansetron",                 "5-HT3 Antagonist",        "Nausea/Vomiting",      "GREEN"),
    ("domperidone",   "Domperidone",                 "Prokinetic",              "Nausea/Gastroparesis", "GREEN"),
    ("metoclopramide","Metoclopramide",               "Prokinetic/Antiemetic",   "Nausea/GERD",          "GREEN"),
    ("loperamide",    "Loperamide",                  "Antidiarrhoeal",          "Diarrhoea",            "GREEN"),
    ("lactulose",     "Lactulose",                   "Osmotic Laxative",        "Constipation/HE",      "GREEN"),
    # ── Corticosteroids ──────────────────────────────────────────────────────
    ("prednisolone",  "Prednisolone",                "Corticosteroid",          "Inflammation/Allergy", "YELLOW"),
    ("prednisone",    "Prednisone",                  "Corticosteroid",          "Inflammation/Allergy", "YELLOW"),
    ("dexamethasone", "Dexamethasone",               "Corticosteroid",          "Severe Inflammation",  "RED"),
    ("methylprednisolone","Methylprednisolone",       "Corticosteroid",         "Severe Inflammation",  "RED"),
    ("hydrocortisone","Hydrocortisone",               "Corticosteroid",          "Adrenal Insufficiency","RED"),
    # ── Neuropsychiatric ─────────────────────────────────────────────────────
    ("phenytoin",     "Phenytoin",                   "Antiepileptic",           "Epilepsy",             "RED"),
    ("carbamazepine", "Carbamazepine",               "Antiepileptic",           "Epilepsy/Neuralgia",   "RED"),
    ("valproate",     "Sodium Valproate",             "Antiepileptic",           "Epilepsy/Bipolar",     "RED"),
    ("levetiracetam", "Levetiracetam",               "Antiepileptic",           "Epilepsy",             "RED"),
    ("diazepam",      "Diazepam",                    "Benzodiazepine",          "Anxiety/Seizure",      "RED"),
    ("lorazepam",     "Lorazepam",                   "Benzodiazepine",          "Anxiety/Seizure",      "RED"),
    ("alprazolam",    "Alprazolam",                  "Benzodiazepine",          "Anxiety",              "YELLOW"),
    ("amitriptyline", "Amitriptyline",               "TCA Antidepressant",      "Depression/Neuropathy","YELLOW"),
    ("sertraline",    "Sertraline",                  "SSRI Antidepressant",     "Depression/Anxiety",   "YELLOW"),
    ("escitalopram",  "Escitalopram",                "SSRI Antidepressant",     "Depression/Anxiety",   "YELLOW"),
    ("fluoxetine",    "Fluoxetine",                  "SSRI Antidepressant",     "Depression",           "YELLOW"),
    ("risperidone",   "Risperidone",                 "Antipsychotic",           "Schizophrenia/Bipolar","RED"),
    ("olanzapine",    "Olanzapine",                  "Antipsychotic",           "Schizophrenia/Bipolar","RED"),
    # ── Thyroid ──────────────────────────────────────────────────────────────
    ("levothyroxine", "Levothyroxine",               "Thyroid Hormone",         "Hypothyroidism",       "YELLOW"),
    ("thyroxine",     "Thyroxine",                   "Thyroid Hormone",         "Hypothyroidism",       "YELLOW"),
    ("carbimazole",   "Carbimazole",                 "Antithyroid",             "Hyperthyroidism",      "YELLOW"),
    # ── Antimalarials / Others ───────────────────────────────────────────────
    ("chloroquine",   "Chloroquine",                 "Antimalarial",            "Malaria",              "YELLOW"),
    ("hydroxychloroquine","Hydroxychloroquine",       "Antimalarial/DMARD",     "Malaria/RA/Lupus",     "YELLOW"),
    ("artemether",    "Artemether-Lumefantrine",     "Artemisinin Antimalarial","Falciparum Malaria",   "RED"),
    ("quinine",       "Quinine",                     "Antimalarial",            "Malaria",              "RED"),
    # ── Vitamins / Supplements ──────────────────────────────────────────────
    ("vitamin d",     "Vitamin D3",                  "Supplement",              "Deficiency",           "GREEN"),
    ("vitamin b12",   "Vitamin B12",                 "Supplement",              "Anaemia/Neuropathy",   "GREEN"),
    ("folic acid",    "Folic Acid",                  "Supplement",              "Anaemia/Pregnancy",    "GREEN"),
    ("iron",          "Ferrous Sulphate/Iron",        "Supplement",              "Iron-Deficiency Anaemia","GREEN"),
    ("calcium",       "Calcium",                     "Supplement",              "Bone Health",          "GREEN"),
    ("multivitamin",  "Multivitamin",                "Supplement",              "General Health",       "GREEN"),
    ("zinc",          "Zinc",                        "Supplement",              "Immunity/Wound Healing","GREEN"),
]

# ── Dosage patterns ──────────────────────────────────────────────────────────
DOSAGE_PATTERN = re.compile(
    r'(\d+(?:\.\d+)?)\s*(?:mg|mcg|µg|g|ml|units?|iu|mmol)',
    re.IGNORECASE
)

# ── Frequency mapping (abbreviation → full text) ─────────────────────────────
FREQUENCY_MAP = {
    r'\bod\b': 'Once daily (OD)',
    r'\bbd\b': 'Twice daily (BD)',
    r'\btds\b': 'Three times daily (TDS)',
    r'\bqid\b': 'Four times daily (QID)',
    r'\bprn\b': 'As needed (PRN)',
    r'\bsos\b': 'As needed (SOS)',
    r'\bhs\b':  'At bedtime (HS)',
    r'\bqam\b': 'Every morning',
    r'\bqpm\b': 'Every evening',
    r'\bstat\b':'Immediately (STAT)',
    r'once\s+(?:a\s+)?daily':   'Once daily',
    r'twice\s+(?:a\s+)?daily':  'Twice daily',
    r'three\s+times':           'Three times daily',
    r'every\s+(\d+)\s+hours?':  lambda m: f'Every {m.group(1)} hours',
    r'at\s+bedtime':            'At bedtime',
    r'before\s+(?:food|meals?)':'Before meals',
    r'after\s+(?:food|meals?|eating)': 'After meals',
    r'with\s+(?:food|meals?)':  'With meals',
    r'morning':                 'Morning',
    r'evening':                 'Evening',
    r'night':                   'At night',
}

# ── Duration patterns ────────────────────────────────────────────────────────
DURATION_PATTERN = re.compile(
    r'(?:for\s+)?(\d+)\s*(days?|weeks?|months?|hrs?|hours?)',
    re.IGNORECASE
)

# ── Route of administration ──────────────────────────────────────────────────
ROUTE_MAP = {
    r'\bpo\b|\boral\b':       'Oral (PO)',
    r'\biv\b':                'Intravenous (IV)',
    r'\bim\b':                'Intramuscular (IM)',
    r'\bsc\b|\bsubcut\b':     'Subcutaneous (SC)',
    r'\bsl\b|\bsublingual\b': 'Sublingual (SL)',
    r'\btopical\b':           'Topical',
    r'\binhaled?\b':          'Inhaled',
    r'\bnebulized?\b':        'Nebulised',
    r'\brectal\b':            'Rectal',
    r'\bophthalmic\b|\beye\b':'Ophthalmic (Eye)',
    r'\bear\b|\botic\b':      'Otic (Ear)',
    r'\bnasal\b':             'Nasal',
    r'\bpatch\b':             'Transdermal Patch',
    r'\bdrip\b':              'IV Drip / Infusion',
    r'\binjection\b':         'Injection',
    r'\btablet\b|\btab\b':    'Tablet (Oral)',
    r'\bcapsule\b|\bcap\b':   'Capsule (Oral)',
    r'\bsyrup\b':             'Syrup (Oral)',
    r'\bdrop\b':              'Drops',
}

# ── Diagnosis-line triggers ──────────────────────────────────────────────────
DIAGNOSIS_TRIGGERS = [
    r'dx\s*[:=]?\s*(.+)',
    r'diagnosis\s*[:=]?\s*(.+)',
    r'provisional\s+diagnosis\s*[:=]?\s*(.+)',
    r'impression\s*[:=]?\s*(.+)',
    r'assessment\s*[:=]?\s*(.+)',
    r'case\s+of\s+(.+)',
    r'k/c/o\s+(.+)',         # "known case of"
    r'c/o\s+(.+)',           # "complains of" 
    r'h/o\s+(.+)',           # "history of"
]

# ── Allergen / Warning keywords ──────────────────────────────────────────────
ALLERGEN_PATTERNS = [
    (r'allerg(?:y|ic)\s+to\s+(\w+)', 'ALLERGY'),
    (r'sensitiv(?:e|ity)\s+to\s+(\w+)', 'SENSITIVITY'),
    (r'avoid\s+(\w+)', 'AVOID'),
    (r'not\s+to\s+(?:be\s+)?taken?\s+with\s+(.+)', 'INTERACTION'),
    (r'do\s+not\s+(?:take|give|use)\s+(.+)', 'CONTRAINDICATION'),
]


def extract_frequency(text: str) -> str:
    """Extract dosing frequency from a text fragment."""
    text_l = text.lower()
    for pattern, label in FREQUENCY_MAP.items():
        m = re.search(pattern, text_l, re.IGNORECASE)
        if m:
            return label(m) if callable(label) else label
    return ""


def extract_route(text: str) -> str:
    """Extract route of administration."""
    text_l = text.lower()
    for pattern, label in ROUTE_MAP.items():
        if re.search(pattern, text_l, re.IGNORECASE):
            return label
    return ""


def extract_duration(text: str) -> str:
    """Extract treatment duration."""
    m = DURATION_PATTERN.search(text)
    if m:
        return f"{m.group(1)} {m.group(2).lower()}"
    return ""


def extract_dosage(text: str) -> str:
    """Extract first dosage from a fragment."""
    m = DOSAGE_PATTERN.search(text)
    return m.group(0) if m else ""


def parse_prescription_text(raw_text: str) -> dict:
    """
    Core prescription parser.
    Returns structured medicines, diagnoses, instructions, warnings.
    """
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    medicines = []
    diagnoses = []
    instructions = []
    warnings = []
    seen_drugs = set()

    text_lower = raw_text.lower()

    # ── Step 1: Extract diagnoses ────────────────────────────────────────────
    for pattern in DIAGNOSIS_TRIGGERS:
        for m in re.finditer(pattern, text_lower, re.IGNORECASE | re.MULTILINE):
            dx = m.group(1).strip().title()
            if dx and dx not in diagnoses and len(dx) > 2:
                diagnoses.append(dx)

    # ── Step 2: Match drugs in full text ────────────────────────────────────
    for drug_key, drug_name, drug_class, drug_use, drug_flag in DRUG_DB:
        if drug_key in text_lower and drug_key not in seen_drugs:
            seen_drugs.add(drug_key)

            # Find the line(s) containing this drug for context extraction
            context = ""
            for line in lines:
                if drug_key in line.lower():
                    context = line
                    break
            # If not found line-by-line, use surrounding text
            if not context:
                idx = text_lower.find(drug_key)
                context = raw_text[max(0, idx-20): idx+120]

            dosage    = extract_dosage(context)
            frequency = extract_frequency(context)
            route     = extract_route(context)
            duration  = extract_duration(context)

            # If no frequency in the same line, search wider
            if not frequency:
                start = max(0, text_lower.find(drug_key) - 10)
                end   = min(len(text_lower), text_lower.find(drug_key) + 150)
                frequency = extract_frequency(raw_text[start:end])

            medicines.append({
                "drug_name":   drug_name,
                "drug_class":  drug_class,
                "typical_use": drug_use,
                "dosage":      dosage,
                "frequency":   frequency,
                "route":       route if route else "Oral (PO)",
                "duration":    duration,
                "flag":        drug_flag,
                "raw_context": context.strip()[:120],
            })

    # ── Step 3: Extract allergen / warnings ──────────────────────────────────
    for pattern, warn_type in ALLERGEN_PATTERNS:
        for m in re.finditer(pattern, text_lower, re.IGNORECASE):
            warnings.append({
                "type":    warn_type,
                "detail":  m.group(1).strip().title(),
                "raw":     m.group(0).strip()
            })

    # ── Step 4: Collect special instructions ────────────────────────────────
    instruction_markers = [
        "take with water", "take with food", "avoid alcohol",
        "avoid sun", "do not crush", "do not drive", "finish the course",
        "keep refrigerated", "shake well", "apply externally",
        "rest", "bed rest", "plenty of fluids", "low salt",
        "low sugar", "follow up", "review after", "review in",
        "blood test", "urine test", "ecg", "x-ray", "ultrasound",
        "fasting", "empty stomach"
    ]
    for marker in instruction_markers:
        if marker in text_lower:
            instructions.append(marker.title())

    # ── Step 5: Flag keywords from the full text (reuse existing ML) ─────────
    kw_flagged, overall_cond, overall_color = extract_priority_keywords(raw_text)

    # ── Step 6: Overall prescription risk ────────────────────────────────────
    red_drugs    = [m for m in medicines if m["flag"] == "RED"]
    yellow_drugs = [m for m in medicines if m["flag"] == "YELLOW"]
    rx_risk      = "HIGH" if red_drugs else "MODERATE" if yellow_drugs else "LOW"

    return {
        "medicines":         medicines,
        "diagnoses":         diagnoses,
        "special_instructions": list(set(instructions)),
        "allergen_warnings": warnings,
        "flagged_symptoms":  kw_flagged,
        "overall_symptom_condition": overall_cond,
        "overall_symptom_color":     overall_color,
        "rx_risk_level":     rx_risk,
        "red_drugs_count":   len(red_drugs),
        "yellow_drugs_count": len(yellow_drugs),
        "green_drugs_count": len([m for m in medicines if m["flag"] == "GREEN"]),
        "total_medicines":   len(medicines),
    }


class PrescriptionRequest(BaseModel):
    raw_text: str
    patient_name: Optional[str] = None
    patient_age:  Optional[str] = None

@app.post("/api/ai/parse-prescription")
def parse_prescription(req: PrescriptionRequest):
    """
    Main prescription keyword extraction endpoint.
    Accepts raw OCR text from a handwritten prescription and returns
    structured drug data, diagnoses, flags, and warnings.
    """
    if not req.raw_text or len(req.raw_text.strip()) < 3:
        return {
            "error": "No prescription text provided",
            "medicines": [],
            "diagnoses": [],
            "rx_risk_level": "LOW"
        }

    result = parse_prescription_text(req.raw_text)
    result["patient_name"] = req.patient_name
    result["patient_age"]  = req.patient_age
    return result


# ═════════════════════════════════════════════════════════════════════════════
#  ML MODEL ENDPOINTS  — CheXNet / BioBERT NER / XGBoost Risk Scorer
# ═════════════════════════════════════════════════════════════════════════════

# ── 1. CheXNet Chest X-Ray Classification ────────────────────────────────────
@app.post("/api/ml/chexnet")
async def chexnet_classify(file: UploadFile = File(...)):
    """
    CheXNet DenseNet-121 Chest X-Ray Multi-Label Classifier.

    Detects up to 14 thoracic pathologies:
    Atelectasis, Cardiomegaly, Effusion, Infiltration, Mass, Nodule,
    Pneumonia, Pneumothorax, Consolidation, Edema, Emphysema, Fibrosis,
    Pleural Thickening, Hernia.

    Returns structured clinical findings with per-class confidence scores.
    """
    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        result = _ml.chexnet.predict(tmp_path)
        return result

    except Exception as e:
        return {
            "error": str(e),
            "model": "CheXNet (DenseNet-121)",
            "predicted_condition": "Analysis failed",
            "pathologies": [],
            "risk_score": 25,
            "essential_bullet_points": [{"text": "CheXNet analysis error — physician review required", "flag": "YELLOW", "category": "Status"}],
            "suspected_conditions": [],
            "doc_type": "RADIOLOGY_XRAY"
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


# ── 2. CheXNet + Heuristic Combined Radiology Endpoint ───────────────────────
@app.post("/api/ml/analyze-xray")
async def analyze_xray_full(file: UploadFile = File(...)):
    """
    Full-pipeline chest X-ray analysis combining:
      1. CheXNet DenseNet-121 ML classification
      2. Heuristic bilateral density analysis
      3. Merged, deduplicated clinical output

    Use this endpoint for the highest accuracy radiology analysis
    when the primary Gemini cascade fails.
    """
    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        # Run CheXNet
        chexnet_result = _ml.chexnet.predict(tmp_path)

        # Run heuristic engine for additional findings
        heuristic_result = analyze_uploaded_document(tmp_path, file.content_type or "image/jpeg")

        # Merge bullet points (CheXNet first, heuristic appended)
        merged_bullets = chexnet_result.get("essential_bullet_points", [])
        for bp in heuristic_result.get("essential_bullet_points", []):
            # Avoid duplicating exact same finding text
            if not any(b["text"] == bp["text"] for b in merged_bullets):
                merged_bullets.append(bp)

        # Merge suspected conditions
        merged_conditions = chexnet_result.get("suspected_conditions", [])
        for cond in heuristic_result.get("suspected_conditions", []):
            if not any(c["disease"] == cond["disease"] for c in merged_conditions):
                merged_conditions.append(cond)

        final_risk = max(
            chexnet_result.get("risk_score", 20),
            heuristic_result.get("risk_score", 20)
        )

        return {
            "doc_type": "RADIOLOGY_XRAY",
            "category_label": "Radiology / Chest X-Ray (CheXNet + Heuristic)",
            "predicted_condition": chexnet_result.get("predicted_condition") or heuristic_result.get("predicted_condition"),
            "one_line_summary": chexnet_result.get("one_line_summary") or heuristic_result.get("one_line_summary"),
            "full_report_text": heuristic_result.get("full_report_text", ""),
            "essential_bullet_points": merged_bullets,
            "suspected_conditions": merged_conditions,
            "biomarkers": heuristic_result.get("biomarkers", []),
            "extracted_medications": [],
            "risk_score": final_risk,
            "chexnet_pathologies": chexnet_result.get("pathologies", []),
            "models_used": ["CheXNet (DenseNet-121)", "Heuristic Vision Engine"]
        }

    except Exception as e:
        return {
            "error": str(e),
            "doc_type": "RADIOLOGY_XRAY",
            "predicted_condition": "Analysis failed — physician review required",
            "essential_bullet_points": [{"text": "X-ray analysis error", "flag": "YELLOW", "category": "Status"}],
            "suspected_conditions": [],
            "risk_score": 30
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


# ── 3. BioBERT Clinical Named Entity Recognition ──────────────────────────────
class NERRequest(BaseModel):
    text: str
    include_summary: bool = True

@app.post("/api/ml/ner")
def biobert_ner(req: NERRequest):
    """
    BioBERT Named Entity Recognition endpoint.

    Extracts clinical entities from free-text clinical notes, discharge
    summaries, radiology reports, or patient complaints:
      - Diseases & conditions
      - Drug names & medications
      - Clinical symptoms & signs
      - Anatomical locations
      - Lab markers & biomarkers

    Backend: HuggingFace BioBERT (d4data/biomedical-ner-all) if available,
             else spaCy + Medical Lexicon fallback.
    """
    if not req.text or not req.text.strip():
        return {"error": "No text provided", "entities": {}}

    return _ml.ner.extract_entities(req.text)


# ── 4. XGBoost Clinical Risk Scoring ─────────────────────────────────────────
class RiskScoringRequest(BaseModel):
    biomarkers: List[Dict[str, Any]] = []
    vitals: Dict[str, Any] = {}
    symptoms: List[str] = []
    red_flags: List[str] = []
    age: int = 40
    gender: str = "Male"

@app.post("/api/ml/risk-score")
def xgboost_risk_score(req: RiskScoringRequest):
    """
    XGBoost + NEWS2 Clinical Risk Scoring endpoint.

    Computes a 0-100 risk score from:
      - NEWS2 vital signs (Respiratory Rate, SpO2, BP, Pulse, Temp, Consciousness)
      - Biomarker derangements (CBC, LFT, KFT, Glucose, HbA1c)
      - Red flag symptom presence
      - Patient age
      - XGBoost ML signal (ensemble)

    Returns: Risk level (LOW/MODERATE/HIGH), color (GREEN/YELLOW/RED),
             NEWS2 score, feature contributions, and clinical recommendation.
    """
    return _ml.risk_scorer.score(
        biomarkers=req.biomarkers,
        vitals=req.vitals,
        symptoms=req.symptoms,
        red_flags=req.red_flags,
        age=req.age,
        gender=req.gender
    )


# ── 5. Full ML Triage Pipeline — Combined Endpoint ────────────────────────────
class FullTriageRequest(BaseModel):
    chief_complaint: str = ""
    symptoms: List[str] = []
    biomarkers: List[Dict[str, Any]] = []
    vitals: Dict[str, Any] = {}
    age: int = 40
    gender: str = "Male"
    red_flags: List[str] = []

@app.post("/api/ml/full-triage")
def full_ml_triage(req: FullTriageRequest):
    """
    Combined ML triage pipeline. Runs in sequence:
      1. BioBERT NER on chief complaint + symptoms
      2. XGBoost + NEWS2 Risk Scoring
      3. Clinical Differential Diagnosis (from clinical_engine.py)

    Returns a comprehensive, ML-enriched triage payload.
    """
    # Step 1: NER
    full_text = req.chief_complaint + " " + " ".join(req.symptoms)
    ner_result = _ml.ner.extract_entities(full_text) if full_text.strip() else {
        "diseases": [], "drugs": [], "symptoms": [], "all_entities": []
    }

    # Step 2: XGBoost Risk Scoring
    risk_result = _ml.risk_scorer.score(
        biomarkers=req.biomarkers,
        vitals=req.vitals,
        symptoms=req.symptoms,
        red_flags=req.red_flags,
        age=req.age,
        gender=req.gender
    )

    # Step 3: Differential Diagnosis
    diag_result = predict_differential_diagnosis(
        socrates_data={},
        chief_complaint=req.chief_complaint,
        symptoms=req.symptoms,
        document_findings=[e["text"] for e in ner_result.get("all_entities", [])]
    )

    return {
        "ner_entities":       ner_result,
        "risk_assessment":    risk_result,
        "differential_diag":  diag_result,
        "overall_risk_score": risk_result.get("risk_score", 25),
        "overall_risk_color": risk_result.get("risk_color", "YELLOW"),
        "clinical_recommendation": risk_result.get("clinical_recommendation", ""),
        "ml_summary": (
            f"BioBERT identified {len(ner_result.get('all_entities', []))} clinical entities. "
            f"XGBoost risk score: {risk_result.get('risk_score', 0)}/100 ({risk_result.get('risk_level', 'UNKNOWN')}). "
            f"Top differential: {diag_result[0]['disease'] if diag_result else 'Undetermined'}."
        )
    }


# ── 6. ML Model Health Status ─────────────────────────────────────────────────
@app.get("/api/ml/status")
def ml_model_status():
    """
    Returns the load status of all ML models.
    Use this endpoint to verify CheXNet, BioBERT, and XGBoost are operational.
    """
    return {
        "status": "operational",
        "models": _ml.status(),
        "available_endpoints": [
            "POST /api/ml/chexnet          — CheXNet chest X-ray classification",
            "POST /api/ml/analyze-xray     — CheXNet + heuristic merged analysis",
            "POST /api/ml/ner              — BioBERT clinical NER",
            "POST /api/ml/risk-score       — XGBoost + NEWS2 risk scoring",
            "POST /api/ml/full-triage      — Combined ML triage pipeline",
        ]
    }
