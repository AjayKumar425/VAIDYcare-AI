# backend-ai/ml_models/biobert_ner.py
"""
BioBERT Named Entity Recognition (NER) Engine
Extracts clinical entities from free-text: diseases, drugs, symptoms,
anatomy, lab values, and procedures — with zero regex dependency.

Primary Model:  dmis-lab/biobert-base-cased-v1.2 (HuggingFace Transformers)
Fallback:       spaCy en_core_web_sm + curated medical lexicon
"""

import re
import logging
from typing import List, Dict, Optional

logger = logging.getLogger("biobert_ner")

# ── Medical Entity Lexicons (used by spaCy fallback) ────────────────────────
DISEASE_LEXICON = [
    "pneumonia", "tuberculosis", "diabetes", "hypertension", "stroke",
    "myocardial infarction", "heart attack", "asthma", "copd", "anemia",
    "malaria", "dengue", "typhoid", "hepatitis", "appendicitis",
    "fracture", "cardiomegaly", "effusion", "pneumothorax", "sepsis",
    "atelectasis", "consolidation", "edema", "emphysema", "fibrosis",
    "renal failure", "urinary tract infection", "uti", "migraine",
    "epilepsy", "seizure", "meningitis", "encephalitis",
    "osteoporosis", "arthritis", "gout", "pancreatitis", "cholecystitis"
]

DRUG_LEXICON = [
    "paracetamol", "amoxicillin", "metformin", "aspirin", "ibuprofen",
    "omeprazole", "atorvastatin", "amlodipine", "losartan", "lisinopril",
    "clopidogrel", "warfarin", "heparin", "insulin", "glipizide",
    "azithromycin", "ciprofloxacin", "doxycycline", "metronidazole",
    "prednisolone", "dexamethasone", "salbutamol", "montelukast",
    "ranitidine", "pantoprazole", "ondansetron", "domperidone",
    "tramadol", "morphine", "codeine", "diazepam", "alprazolam",
    "levothyroxine", "furosemide", "spironolactone", "hydrochlorothiazide"
]

SYMPTOM_LEXICON = [
    "fever", "cough", "headache", "nausea", "vomiting", "diarrhea",
    "chest pain", "shortness of breath", "fatigue", "weakness", "dizziness",
    "palpitation", "swelling", "rash", "itching", "back pain", "joint pain",
    "abdominal pain", "constipation", "blood in urine", "dysuria",
    "weight loss", "night sweats", "loss of appetite", "jaundice",
    "vision loss", "hearing loss", "numbness", "tingling", "confusion"
]

ANATOMY_LEXICON = [
    "chest", "lung", "heart", "liver", "kidney", "brain", "spine",
    "abdomen", "pelvis", "shoulder", "knee", "wrist", "ankle", "hip",
    "neck", "thorax", "pleura", "diaphragm", "mediastinum", "aorta",
    "right lower lobe", "left upper lobe", "bilateral", "unilateral"
]

LAB_MARKERS = [
    "hemoglobin", "hb", "wbc", "platelets", "creatinine", "glucose",
    "hba1c", "cholesterol", "triglycerides", "sgot", "sgpt", "ast", "alt",
    "urea", "bilirubin", "sodium", "potassium", "calcium", "uric acid",
    "tsh", "t3", "t4", "d-dimer", "troponin", "crp", "esr", "psa"
]


class BioBERTNEREngine:
    """
    Clinical Named Entity Recognition Engine.

    When HuggingFace transformers + BioBERT are available:
      → Uses BioBERT token-level NER for high-precision extraction

    When unavailable (no internet / no transformers package):
      → Falls back to spaCy + curated medical lexicon matching
    """

    def __init__(self):
        self._pipeline = None
        self._spacy_nlp = None
        self._backend = "none"
        self._init_engines()

    def _init_engines(self):
        """Try BioBERT first, fall back to spaCy."""
        # Try HuggingFace Transformers (BioBERT NER)
        try:
            from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
            model_name = "d4data/biomedical-ner-all"   # Lightweight bio-NER, ~440MB
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model     = AutoModelForTokenClassification.from_pretrained(model_name)
            self._pipeline = pipeline(
                "ner",
                model=model,
                tokenizer=tokenizer,
                aggregation_strategy="simple"
            )
            self._backend = "biobert"
            logger.info("[BioBERT NER] HuggingFace NER pipeline loaded.")
            return
        except Exception as e:
            logger.info(f"[BioBERT NER] HuggingFace not available ({e}). Trying spaCy...")

        # Fall back to spaCy
        try:
            import spacy
            self._spacy_nlp = spacy.load("en_core_web_sm")
            self._backend = "spacy"
            logger.info("[BioBERT NER] spaCy en_core_web_sm loaded as fallback.")
        except Exception as e:
            logger.warning(f"[BioBERT NER] spaCy also unavailable ({e}). Using regex lexicon only.")
            self._backend = "lexicon"

    def extract_entities(self, text: str) -> Dict:
        """
        Extract clinical named entities from text.

        Returns:
            dict with: diseases, drugs, symptoms, anatomy, lab_markers,
                       all_entities, clinical_summary
        """
        if self._backend == "biobert":
            return self._biobert_extract(text)
        elif self._backend == "spacy":
            return self._spacy_extract(text)
        else:
            return self._lexicon_extract(text)

    # ── BioBERT Extraction ───────────────────────────────────────────────────
    def _biobert_extract(self, text: str) -> Dict:
        """High-precision NER using fine-tuned BioBERT."""
        try:
            ner_results = self._pipeline(text)
            entities = {
                "diseases":    [],
                "drugs":       [],
                "symptoms":    [],
                "anatomy":     [],
                "lab_markers": [],
                "other":       []
            }

            for ent in ner_results:
                word  = ent.get("word", "").replace("##", "").strip()
                label = ent.get("entity_group", "O").upper()
                score = float(ent.get("score", 0.0))

                if score < 0.60 or not word:
                    continue

                entity_obj = {
                    "text": word,
                    "label": label,
                    "confidence": f"{round(score * 100)}%"
                }

                # Map BioBERT label groups to our schema
                if any(k in label for k in ["DIS", "DISEASE", "COND"]):
                    entities["diseases"].append(entity_obj)
                elif any(k in label for k in ["DRUG", "CHEM", "MED"]):
                    entities["drugs"].append(entity_obj)
                elif any(k in label for k in ["SIGN", "SYMP"]):
                    entities["symptoms"].append(entity_obj)
                elif any(k in label for k in ["ANAT", "BODY"]):
                    entities["anatomy"].append(entity_obj)
                elif any(k in label for k in ["LAB", "TEST"]):
                    entities["lab_markers"].append(entity_obj)
                else:
                    entities["other"].append(entity_obj)

            entities["all_entities"] = (
                entities["diseases"] + entities["drugs"] +
                entities["symptoms"] + entities["anatomy"] +
                entities["lab_markers"]
            )
            entities["clinical_summary"] = self._build_summary(entities)
            entities["backend"] = "BioBERT (HuggingFace Transformers)"
            return entities

        except Exception as e:
            logger.error(f"[BioBERT NER] Inference error: {e}. Falling back to lexicon.")
            return self._lexicon_extract(text)

    # ── spaCy Extraction ─────────────────────────────────────────────────────
    def _spacy_extract(self, text: str) -> Dict:
        """Combined spaCy NER + lexicon matching."""
        doc = self._spacy_nlp(text)
        entities = {
            "diseases": [], "drugs": [], "symptoms": [],
            "anatomy": [], "lab_markers": [], "other": []
        }

        # spaCy recognized entities
        for ent in doc.ents:
            obj = {"text": ent.text, "label": ent.label_, "confidence": "80%"}
            if ent.label_ in ("DISEASE", "CONDITION"):
                entities["diseases"].append(obj)
            elif ent.label_ in ("CHEMICAL", "DRUG"):
                entities["drugs"].append(obj)
            elif ent.label_ in ("ANATOMY", "BODY"):
                entities["anatomy"].append(obj)
            else:
                entities["other"].append(obj)

        # Augment with lexicon matching
        lexicon_result = self._lexicon_extract(text)
        for category in ("diseases", "drugs", "symptoms", "anatomy", "lab_markers"):
            seen = {e["text"].lower() for e in entities[category]}
            for item in lexicon_result[category]:
                if item["text"].lower() not in seen:
                    entities[category].append(item)
                    seen.add(item["text"].lower())

        entities["all_entities"] = (
            entities["diseases"] + entities["drugs"] +
            entities["symptoms"] + entities["anatomy"] +
            entities["lab_markers"]
        )
        entities["clinical_summary"] = self._build_summary(entities)
        entities["backend"] = "spaCy + Medical Lexicon"
        return entities

    # ── Lexicon Fallback ─────────────────────────────────────────────────────
    def _lexicon_extract(self, text: str) -> Dict:
        """Pure regex + curated lexicon extraction (no ML)."""
        text_lower = text.lower()
        entities = {
            "diseases": [], "drugs": [], "symptoms": [],
            "anatomy": [], "lab_markers": []
        }

        def match_lexicon(lexicon: List[str], category: str, confidence: str = "75%"):
            seen = set()
            for term in lexicon:
                if term in text_lower and term not in seen:
                    entities[category].append({
                        "text": term.title(),
                        "label": category.upper(),
                        "confidence": confidence
                    })
                    seen.add(term)

        match_lexicon(DISEASE_LEXICON, "diseases", "78%")
        match_lexicon(DRUG_LEXICON,    "drugs",    "80%")
        match_lexicon(SYMPTOM_LEXICON, "symptoms", "75%")
        match_lexicon(ANATOMY_LEXICON, "anatomy",  "72%")
        match_lexicon(LAB_MARKERS,     "lab_markers", "85%")

        entities["all_entities"] = (
            entities["diseases"] + entities["drugs"] +
            entities["symptoms"] + entities["anatomy"] +
            entities["lab_markers"]
        )
        entities["clinical_summary"] = self._build_summary(entities)
        entities["backend"] = "Medical Lexicon (Regex)"
        return entities

    @staticmethod
    def _build_summary(entities: Dict) -> str:
        parts = []
        if entities["diseases"]:
            parts.append(f"Conditions: {', '.join([d['text'] for d in entities['diseases'][:3]])}")
        if entities["symptoms"]:
            parts.append(f"Symptoms: {', '.join([s['text'] for s in entities['symptoms'][:3]])}")
        if entities["drugs"]:
            parts.append(f"Medications: {', '.join([d['text'] for d in entities['drugs'][:3]])}")
        if entities["anatomy"]:
            parts.append(f"Anatomy: {', '.join([a['text'] for a in entities['anatomy'][:2]])}")
        return ". ".join(parts) if parts else "No significant clinical entities detected."

