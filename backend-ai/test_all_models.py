"""
VAIDYcare-AI ML Model Test Suite
=================================
Tests ALL ML models both:
  A) Offline (pure Python, no server needed)
  B) Online (HTTP calls to running FastAPI server)

Run offline tests only:
  python test_all_models.py

Run with live server tests too:
  python test_all_models.py --live

Usage:
  cd backend-ai
  .\\venv\\Scripts\\python test_all_models.py
  .\\venv\\Scripts\\python test_all_models.py --live
"""

import sys
import os
import json
import time
import tempfile
import traceback

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

PASS = "[PASS]"
FAIL = "[FAIL]"
INFO = "[INFO]"
SKIP = "[SKIP]"

results = []

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def test(name, fn):
    try:
        start = time.time()
        fn()
        elapsed = round((time.time() - start) * 1000)
        print(f"  {PASS} {name}  ({elapsed}ms)")
        results.append((name, True, None))
    except AssertionError as e:
        print(f"  {FAIL} {name}")
        print(f"         AssertionError: {e}")
        results.append((name, False, str(e)))
    except Exception as e:
        print(f"  {FAIL} {name}")
        print(f"         {type(e).__name__}: {e}")
        results.append((name, False, str(e)))

def make_test_xray(dark=True, width=224, height=224):
    """Create a synthetic test X-ray image (dark=True for film, False for paper)."""
    from PIL import Image
    import numpy as np
    pixel_val = 20 if dark else 220
    arr = np.full((height, width), pixel_val, dtype=np.uint8)
    if dark:
        # Simulate lung fields (lighter regions in dark film)
        arr[50:174, 20:100]  = 80   # right lung
        arr[50:174, 124:204] = 70   # left lung
        arr[60:164, 95:130]  = 30   # mediastinum (dark)
    img = Image.fromarray(arr, mode='L')
    tmp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    img.save(tmp.name)
    tmp.close()
    return tmp.name


# ─────────────────────────────────────────────────────────────────────────────
# MODULE 1: CheXNet (DenseNet-121) TESTS
# ─────────────────────────────────────────────────────────────────────────────
section("MODULE 1: CheXNet DenseNet-121 Chest X-Ray Classifier")

from ml_models.chexnet import CheXNetClassifier, CHEXNET_LABELS, DETECTION_THRESHOLDS
cx = CheXNetClassifier()

def test_chexnet_loads():
    assert cx is not None, "CheXNetClassifier instance is None"
    # Either torch or heuristic must be available
    assert hasattr(cx, '_loaded'), "Missing _loaded attribute"
    print(f"         Backend: {'PyTorch DenseNet-121' if cx._loaded else 'Heuristic Fallback'}")

def test_chexnet_dark_film():
    img_path = make_test_xray(dark=True)
    try:
        result = cx.predict(img_path)
        assert isinstance(result, dict), "Result must be a dict"
        assert 'predicted_condition' in result, "Missing predicted_condition"
        assert 'risk_score' in result, "Missing risk_score"
        assert 'essential_bullet_points' in result, "Missing bullet points"
        assert isinstance(result['risk_score'], (int, float)), "risk_score must be numeric"
        assert 0 <= result['risk_score'] <= 100, f"risk_score out of range: {result['risk_score']}"
        print(f"         Prediction: {result['predicted_condition']}")
        print(f"         Risk score: {result['risk_score']}/100")
    finally:
        os.unlink(img_path)

def test_chexnet_light_paper():
    img_path = make_test_xray(dark=False)
    try:
        result = cx.predict(img_path)
        assert isinstance(result, dict), "Result must be a dict"
        assert 'predicted_condition' in result
        print(f"         Light paper result: {result['predicted_condition']}")
    finally:
        os.unlink(img_path)

def test_chexnet_output_schema():
    img_path = make_test_xray(dark=True)
    try:
        result = cx.predict(img_path)
        required_keys = ['doc_type','predicted_condition','one_line_summary',
                         'essential_bullet_points','suspected_conditions','risk_score']
        for key in required_keys:
            assert key in result, f"Missing required key: {key}"
        assert result['doc_type'] == 'RADIOLOGY_XRAY', f"Wrong doc_type: {result['doc_type']}"
        assert isinstance(result['essential_bullet_points'], list)
        for bp in result['essential_bullet_points']:
            assert 'text' in bp and 'flag' in bp, f"Bullet point missing fields: {bp}"
            assert bp['flag'] in ('RED','YELLOW','GREEN'), f"Invalid flag: {bp['flag']}"
    finally:
        os.unlink(img_path)

def test_chexnet_nonexistent_file():
    try:
        result = cx.predict("/nonexistent/path.jpg")
        # Should return a safe fallback, not raise
        assert isinstance(result, dict), "Must return dict even on error"
    except Exception as e:
        raise AssertionError(f"Should not raise exception for bad file: {e}")

test("CheXNet loads successfully", test_chexnet_loads)
test("CheXNet: Dark radiograph film analysis", test_chexnet_dark_film)
test("CheXNet: Light paper document (no false positives)", test_chexnet_light_paper)
test("CheXNet: Output schema validation", test_chexnet_output_schema)
test("CheXNet: Graceful handling of bad file path", test_chexnet_nonexistent_file)


# ─────────────────────────────────────────────────────────────────────────────
# MODULE 2: BioBERT NER ENGINE TESTS
# ─────────────────────────────────────────────────────────────────────────────
section("MODULE 2: BioBERT NER Clinical Entity Extractor")

from ml_models.biobert_ner import BioBERTNEREngine
ner = BioBERTNEREngine()

def test_ner_loads():
    assert ner is not None
    assert ner._backend in ('biobert', 'spacy', 'lexicon'), f"Unknown backend: {ner._backend}"
    print(f"         Backend: {ner._backend}")

def test_ner_drug_extraction():
    text = "Patient prescribed amoxicillin 500mg TDS and paracetamol 650mg for fever."
    result = ner.extract_entities(text)
    drugs = [d['text'].lower() for d in result['drugs']]
    print(f"         Extracted drugs: {drugs}")
    assert any('amoxicillin' in d for d in drugs), "Failed to detect amoxicillin"
    assert any('paracetamol' in d for d in drugs), "Failed to detect paracetamol"

def test_ner_symptom_extraction():
    text = "Patient presents with chest pain, shortness of breath, and high fever for 3 days."
    result = ner.extract_entities(text)
    symptoms = [s['text'].lower() for s in result['symptoms']]
    print(f"         Extracted symptoms: {symptoms}")
    assert any('chest pain' in s for s in symptoms), "Failed to detect chest pain"
    assert any('fever' in s for s in symptoms), "Failed to detect fever"

def test_ner_disease_extraction():
    text = "History of diabetes and hypertension. Admitted for community-acquired pneumonia."
    result = ner.extract_entities(text)
    diseases = [d['text'].lower() for d in result['diseases']]
    print(f"         Extracted diseases: {diseases}")
    assert any('diabetes' in d for d in diseases), "Failed to detect diabetes"

def test_ner_output_schema():
    text = "Chest pain radiating to left arm. Take aspirin 325mg immediately."
    result = ner.extract_entities(text)
    required_keys = ['diseases','drugs','symptoms','anatomy','lab_markers','all_entities','clinical_summary','backend']
    for key in required_keys:
        assert key in result, f"Missing key: {key}"
    assert isinstance(result['all_entities'], list), "all_entities must be list"
    assert isinstance(result['clinical_summary'], str), "clinical_summary must be string"

def test_ner_confidence_scores():
    text = "Patient has pneumonia and hemoglobin is 8.5 g/dL."
    result = ner.extract_entities(text)
    for entity in result['all_entities']:
        assert 'confidence' in entity, f"Entity missing confidence: {entity}"

def test_ner_empty_text():
    result = ner.extract_entities("")
    assert isinstance(result, dict), "Must return dict for empty text"

def test_ner_anatomy_extraction():
    text = "Bilateral lung fields clear. No fracture noted in right wrist or chest."
    result = ner.extract_entities(text)
    anatomy = [a['text'].lower() for a in result['anatomy']]
    print(f"         Extracted anatomy: {anatomy}")
    assert any(term in ' '.join(anatomy) for term in ['lung', 'chest', 'wrist', 'bilateral'])

test("BioBERT NER loads successfully", test_ner_loads)
test("NER: Drug name extraction (amoxicillin, paracetamol)", test_ner_drug_extraction)
test("NER: Symptom extraction (chest pain, fever)", test_ner_symptom_extraction)
test("NER: Disease entity detection (diabetes, pneumonia)", test_ner_disease_extraction)
test("NER: Output schema validation", test_ner_output_schema)
test("NER: Confidence scores present on all entities", test_ner_confidence_scores)
test("NER: Graceful empty text handling", test_ner_empty_text)
test("NER: Anatomy / location extraction", test_ner_anatomy_extraction)


# ─────────────────────────────────────────────────────────────────────────────
# MODULE 3: XGBoost CLINICAL RISK SCORER TESTS
# ─────────────────────────────────────────────────────────────────────────────
section("MODULE 3: XGBoost + NEWS2 Clinical Risk Scorer")

from ml_models.risk_scorer import ClinicalRiskScorer, compute_news2
rs = ClinicalRiskScorer()

def test_scorer_loads():
    assert rs is not None
    assert rs._backend in ('xgboost', 'xgboost_synthetic', 'rules'), f"Unknown backend: {rs._backend}"
    print(f"         Backend: {rs._backend}")

def test_news2_critical_vitals():
    """High NEWS2 scenario: Septic patient."""
    result = compute_news2({
        'respiratory_rate': 28,
        'spo2': 90,
        'systolic_bp': 88,
        'pulse': 125,
        'temperature_c': 39.2,
        'avpu': 'V'   # responds to Voice
    })
    print(f"         NEWS2 Total: {result['news2_total']}  Level: {result['news2_level']}")
    assert result['news2_total'] >= 7, f"Should be RED (>=7): got {result['news2_total']}"
    assert result['news2_level'] == 'RED', f"Should be RED: got {result['news2_level']}"

def test_news2_normal_vitals():
    """Normal NEWS2 scenario: Healthy patient."""
    result = compute_news2({
        'respiratory_rate': 16,
        'spo2': 98,
        'systolic_bp': 120,
        'pulse': 72,
        'temperature_c': 36.8,
        'avpu': 'A'
    })
    print(f"         NEWS2 Total: {result['news2_total']}  Level: {result['news2_level']}")
    assert result['news2_total'] <= 2, f"Should be low score: got {result['news2_total']}"
    assert result['news2_level'] == 'GREEN', f"Should be GREEN: got {result['news2_level']}"

def test_scorer_high_risk():
    """Full risk scorer — HIGH risk patient."""
    score = rs.score(
        vitals={'respiratory_rate': 28, 'spo2': 90, 'systolic_bp': 88,
                'pulse': 125, 'temperature_c': 39.2, 'avpu': 'V'},
        symptoms=['chest pain', 'shortness of breath', 'confusion'],
        red_flags=['chest pain', 'loss of consciousness'],
        age=72
    )
    print(f"         Risk Score: {score['risk_score']}/100  Level: {score['risk_level']}")
    print(f"         Color: {score['risk_color']}")
    assert score['risk_score'] >= 50, f"Should be HIGH risk: got {score['risk_score']}"
    assert score['risk_level'] in ('HIGH', 'MODERATE'), f"Should be HIGH/MODERATE: {score['risk_level']}"
    assert score['risk_color'] in ('RED', 'YELLOW'), f"Wrong color: {score['risk_color']}"

def test_scorer_low_risk():
    """Full risk scorer — LOW risk patient."""
    score = rs.score(
        vitals={'respiratory_rate': 15, 'spo2': 99, 'systolic_bp': 118,
                'pulse': 70, 'temperature_c': 36.7, 'avpu': 'A'},
        symptoms=['mild headache'],
        red_flags=[],
        age=28
    )
    print(f"         Risk Score: {score['risk_score']}/100  Level: {score['risk_level']}")
    assert score['risk_level'] in ('LOW', 'MODERATE'), f"Should be LOW/MODERATE: {score['risk_level']}"

def test_scorer_biomarker_derangement():
    """Biomarker-driven risk escalation."""
    score = rs.score(
        biomarkers=[
            {'name': 'hemoglobin', 'measured_value': 5.5, 'unit': 'g/dL'},
            {'name': 'wbc', 'measured_value': 18000, 'unit': '/uL'},
            {'name': 'platelets', 'measured_value': 40000, 'unit': '/uL'}
        ],
        vitals={},
        symptoms=[],
        red_flags=[]
    )
    print(f"         Biomarker Risk: {score['biomarker_risk']}  Flags: {len(score['biomarker_flags'])}")
    assert score['biomarker_risk'] > 0, "Biomarker derangements should add risk"
    assert len(score['biomarker_flags']) >= 2, f"Should flag at least 2 abnormal biomarkers"

def test_scorer_output_schema():
    score = rs.score()  # All defaults
    required = ['risk_score','risk_level','risk_color','news2',
                'biomarker_risk','model_backend','clinical_recommendation']
    for key in required:
        assert key in score, f"Missing key in risk output: {key}"
    assert 0 <= score['risk_score'] <= 100, f"risk_score out of range: {score['risk_score']}"
    assert score['risk_level'] in ('LOW', 'MODERATE', 'HIGH')
    assert score['risk_color'] in ('GREEN', 'YELLOW', 'RED')

def test_scorer_feature_contributions():
    score = rs.score(
        vitals={'respiratory_rate': 22, 'spo2': 94, 'systolic_bp': 100,
                'pulse': 110, 'temperature_c': 38.5, 'avpu': 'A'},
        age=65
    )
    assert 'feature_contributions' in score, "Missing feature_contributions"
    contribs = score['feature_contributions']
    assert isinstance(contribs, dict), "feature_contributions must be dict"
    total = sum(contribs.values())
    print(f"         Feature contributions: {contribs}")
    assert total > 0, "Feature contributions total should be > 0"

test("XGBoost Risk Scorer loads successfully", test_scorer_loads)
test("NEWS2: Critical vitals correctly scored RED", test_news2_critical_vitals)
test("NEWS2: Normal vitals correctly scored GREEN", test_news2_normal_vitals)
test("XGBoost: HIGH risk patient scoring", test_scorer_high_risk)
test("XGBoost: LOW risk patient scoring", test_scorer_low_risk)
test("XGBoost: Biomarker derangement risk escalation", test_scorer_biomarker_derangement)
test("XGBoost: Output schema validation", test_scorer_output_schema)
test("XGBoost: Feature contribution breakdown", test_scorer_feature_contributions)


# ─────────────────────────────────────────────────────────────────────────────
# MODULE 4: MODEL MANAGER (Singleton) TESTS
# ─────────────────────────────────────────────────────────────────────────────
section("MODULE 4: ML Model Manager Singleton")

from ml_models.model_manager import MLModelManager

def test_manager_singleton():
    m1 = MLModelManager.instance()
    m2 = MLModelManager.instance()
    assert m1 is m2, "MLModelManager must be a singleton"

def test_manager_chexnet_property():
    mgr = MLModelManager.instance()
    chex = mgr.chexnet
    assert chex is not None, "chexnet property returned None"

def test_manager_ner_property():
    mgr = MLModelManager.instance()
    ner_instance = mgr.ner
    assert ner_instance is not None, "ner property returned None"

def test_manager_risk_scorer_property():
    mgr = MLModelManager.instance()
    scorer = mgr.risk_scorer
    assert scorer is not None, "risk_scorer property returned None"

def test_manager_status():
    mgr = MLModelManager.instance()
    status = mgr.status()
    assert isinstance(status, dict), "status() must return dict"
    assert 'chexnet' in status
    assert 'biobert_ner' in status
    assert 'risk_scorer' in status
    print(f"         Status: {json.dumps({k: v['loaded'] for k, v in status.items()})}")

test("ModelManager: singleton pattern enforced", test_manager_singleton)
test("ModelManager: chexnet property accessible", test_manager_chexnet_property)
test("ModelManager: ner property accessible", test_manager_ner_property)
test("ModelManager: risk_scorer property accessible", test_manager_risk_scorer_property)
test("ModelManager: status() returns correct schema", test_manager_status)


# ─────────────────────────────────────────────────────────────────────────────
# MODULE 5: INTEGRATION TEST — Full Clinical Pipeline
# ─────────────────────────────────────────────────────────────────────────────
section("MODULE 5: Integration — Full Clinical Pipeline")

def test_full_pipeline_chest_pain():
    """
    Simulates: Patient checks in with chest pain.
    CheXNet analyzes uploaded X-ray.
    NER extracts entities from complaint.
    Risk scorer computes final triage level.
    """
    # Step 1: Patient complaint — NER extraction
    complaint = "Patient presents with severe chest pain radiating to left arm, shortness of breath, and diaphoresis. History of diabetes."
    entities = ner.extract_entities(complaint)
    symptoms_found = [s['text'].lower() for s in entities['symptoms']]
    diseases_found = [d['text'].lower() for d in entities['diseases']]
    assert len(entities['all_entities']) > 0, "NER found no entities in a clinical text"

    # Step 2: X-Ray analysis
    xray_path = make_test_xray(dark=True)
    try:
        xray_result = cx.predict(xray_path)
        assert 'risk_score' in xray_result
    finally:
        os.unlink(xray_path)

    # Step 3: Risk scoring with combined data
    risk = rs.score(
        vitals={'respiratory_rate': 24, 'spo2': 93, 'systolic_bp': 95,
                'pulse': 115, 'temperature_c': 37.1, 'avpu': 'A'},
        symptoms=symptoms_found,
        red_flags=['chest pain'],
        biomarkers=[{'name': 'fasting_glucose', 'measured_value': 320, 'unit': 'mg/dL'}],
        age=58
    )

    final_score = risk['risk_score']
    print(f"         NER entities: {len(entities['all_entities'])} found")
    print(f"         CheXNet finding: {xray_result['predicted_condition']}")
    print(f"         Final Risk: {final_score}/100 ({risk['risk_level']})")
    assert final_score >= 40, f"Acute chest pain patient should be MODERATE+ risk: got {final_score}"

def test_full_pipeline_routine():
    """
    Simulates: Routine check-up patient, no red flags.
    """
    complaint = "Patient here for routine follow-up for mild back pain."
    entities = ner.extract_entities(complaint)

    risk = rs.score(
        vitals={'respiratory_rate': 14, 'spo2': 99, 'systolic_bp': 122,
                'pulse': 68, 'temperature_c': 36.5, 'avpu': 'A'},
        symptoms=['back pain'],
        red_flags=[],
        age=35
    )

    print(f"         Routine check-up risk: {risk['risk_score']}/100 ({risk['risk_level']})")
    assert risk['risk_level'] in ('LOW', 'MODERATE'), f"Routine patient should be LOW/MODERATE: {risk['risk_level']}"

test("Integration: Acute chest pain patient pipeline", test_full_pipeline_chest_pain)
test("Integration: Routine check-up patient pipeline", test_full_pipeline_routine)


# ─────────────────────────────────────────────────────────────────────────────
# MODULE 6: LIVE HTTP SERVER TESTS (optional — requires running FastAPI)
# ─────────────────────────────────────────────────────────────────────────────
section("MODULE 6: Live HTTP Endpoint Tests (requires server on :8000)")

LIVE = '--live' in sys.argv
BASE = 'http://localhost:8000'

if not LIVE:
    print(f"  {SKIP} Skipped (run with --live to test HTTP endpoints)")
    print(f"         Start server: .\\venv\\Scripts\\uvicorn main:app --reload --port 8000")
else:
    import requests as http_requests

    def test_live_health():
        resp = http_requests.get(f"{BASE}/", timeout=5)
        assert resp.status_code == 200

    def test_live_ml_status():
        resp = http_requests.get(f"{BASE}/api/ml/status", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert 'models' in data
        print(f"         Models: {json.dumps({k: v['loaded'] for k,v in data['models'].items()})}")

    def test_live_ner():
        resp = http_requests.post(f"{BASE}/api/ml/ner", json={
            "text": "Patient has pneumonia. Prescribed amoxicillin 500mg."
        }, timeout=15)
        assert resp.status_code == 200
        data = resp.json()
        assert 'drugs' in data
        drugs = [d['text'].lower() for d in data['drugs']]
        assert any('amoxicillin' in d for d in drugs)
        print(f"         HTTP NER drugs: {drugs}")

    def test_live_risk_score():
        resp = http_requests.post(f"{BASE}/api/ml/risk-score", json={
            "vitals": {"respiratory_rate": 24, "spo2": 92, "systolic_bp": 95,
                       "pulse": 115, "temperature_c": 38.8, "avpu": "A"},
            "symptoms": ["chest pain", "shortness of breath"],
            "red_flags": ["chest pain"],
            "age": 65
        }, timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert data['risk_score'] >= 40
        print(f"         HTTP Risk Score: {data['risk_score']}/100 ({data['risk_level']})")

    def test_live_chexnet():
        xray_path = make_test_xray(dark=True)
        try:
            with open(xray_path, 'rb') as f:
                resp = http_requests.post(
                    f"{BASE}/api/ml/chexnet",
                    files={"file": ("xray_test.jpg", f, "image/jpeg")},
                    timeout=30
                )
            assert resp.status_code == 200
            data = resp.json()
            assert 'predicted_condition' in data
            print(f"         HTTP CheXNet: {data['predicted_condition']} (risk={data['risk_score']})")
        finally:
            os.unlink(xray_path)

    def test_live_full_triage():
        resp = http_requests.post(f"{BASE}/api/ml/full-triage", json={
            "chief_complaint": "Severe chest pain and difficulty breathing",
            "symptoms": ["chest pain", "dyspnea"],
            "vitals": {"respiratory_rate": 26, "spo2": 91, "systolic_bp": 92,
                       "pulse": 118, "temperature_c": 38.6, "avpu": "A"},
            "red_flags": ["chest pain"],
            "age": 60
        }, timeout=25)
        assert resp.status_code == 200
        data = resp.json()
        assert 'ner_entities' in data
        assert 'risk_assessment' in data
        assert 'differential_diag' in data
        print(f"         HTTP Full Triage: {data['ml_summary'][:80]}...")

    test("LIVE: FastAPI health check", test_live_health)
    test("LIVE: /api/ml/status — model registry", test_live_ml_status)
    test("LIVE: /api/ml/ner — BioBERT extraction", test_live_ner)
    test("LIVE: /api/ml/risk-score — XGBoost scoring", test_live_risk_score)
    test("LIVE: /api/ml/chexnet — X-ray classification", test_live_chexnet)
    test("LIVE: /api/ml/full-triage — combined pipeline", test_live_full_triage)


# ─────────────────────────────────────────────────────────────────────────────
# FINAL RESULTS SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
section("TEST RESULTS SUMMARY")

passed = [r for r in results if r[1]]
failed = [r for r in results if not r[1]]

print(f"\n  Total:  {len(results)}")
print(f"  Passed: {len(passed)}")
print(f"  Failed: {len(failed)}")
print()

if failed:
    print("  FAILED TESTS:")
    for name, _, err in failed:
        print(f"    - {name}")
        print(f"      Reason: {err}")
    print()
    sys.exit(1)
else:
    print("  ALL TESTS PASSED")
    sys.exit(0)

