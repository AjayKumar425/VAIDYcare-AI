from ml_models.chexnet import CheXNetClassifier
from ml_models.biobert_ner import BioBERTNEREngine
from ml_models.risk_scorer import ClinicalRiskScorer

print("=== Loading CheXNet ===")
cx = CheXNetClassifier()
backend = "PyTorch DenseNet-121" if cx._loaded else "Heuristic Fallback"
print(f"  Backend: {backend}")

print("=== Loading BioBERT NER ===")
ner = BioBERTNEREngine()
print(f"  Backend: {ner._backend}")

print("=== Loading Risk Scorer ===")
rs = ClinicalRiskScorer()
print(f"  Backend: {rs._backend}")

print("=== Testing BioBERT NER ===")
result = ner.extract_entities("Patient presents with chest pain and shortness of breath. Prescribed amoxicillin 500mg.")
diseases = [d["text"] for d in result["diseases"]]
drugs    = [d["text"] for d in result["drugs"]]
symptoms = [s["text"] for s in result["symptoms"]]
print(f"  Diseases: {diseases}")
print(f"  Drugs:    {drugs}")
print(f"  Symptoms: {symptoms}")

print("=== Testing Risk Scorer ===")
score = rs.score(
    vitals={"respiratory_rate": 22, "spo2": 94, "systolic_bp": 100, "pulse": 110, "temperature_c": 38.5, "avpu": "A"},
    symptoms=["chest pain", "shortness of breath"],
    red_flags=["chest pain"],
    age=65
)
print(f"  Risk Score: {score['risk_score']}/100  Level: {score['risk_level']}  NEWS2: {score['news2']['news2_total']}")
print(f"  Recommendation: {score['clinical_recommendation']}")

print("=== Testing CheXNet Heuristic ===")
# Test with a small synthetic image
from PIL import Image
import tempfile, os
img = Image.new("L", (224, 224), color=30)
tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
img.save(tmp.name)
tmp.close()
cx_result = cx.predict(tmp.name)
os.unlink(tmp.name)
print(f"  CheXNet result: {cx_result['predicted_condition']}")
print(f"  Risk score: {cx_result['risk_score']}")

print()
print("ALL ML MODELS LOADED AND TESTED SUCCESSFULLY")

