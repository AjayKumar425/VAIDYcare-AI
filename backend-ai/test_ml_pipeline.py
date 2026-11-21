# backend-ai/test_ml_pipeline.py
"""
End-to-end verification test for local ML diagnostic and radiology engine.
"""

import os
import sys
from PIL import Image, ImageDraw

sys.path.append(os.path.dirname(__file__))
from radiology_engine import (
    RadiologyFilmAnalyzer,
    PathologyReportAnalyzer,
    inspect_image_characteristics,
    parse_radiology_report_text,
    analyze_uploaded_document
)
from clinical_engine import predict_differential_diagnosis, generate_clinical_soap

def run_tests():
    print("==================================================")
    print("  VAIDYcare-AI Local ML Engine Verification")
    print("==================================================")

    test_dir = os.path.join(os.path.dirname(__file__), "test_assets")
    os.makedirs(test_dir, exist_ok=True)

    # 1. Generate dark radiograph scan film
    xray_path = os.path.join(test_dir, "test_chest_film.png")
    img_xray = Image.new("L", (512, 512), color=20)
    draw_xray = ImageDraw.Draw(img_xray)
    draw_xray.ellipse([60, 40, 452, 480], outline=90, width=6)
    img_xray.save(xray_path)

    print(f"\n[Test 1] Image Characteristics Detection for '{os.path.basename(xray_path)}':")
    img_type, lum, var = inspect_image_characteristics(xray_path)
    print(f" -> Result: {img_type} (Lum: {lum:.1f})")
    assert img_type == "DARK_FILM"

    print(f"\n[Test 2] Radiograph Film Analysis:")
    analyzer = RadiologyFilmAnalyzer()
    scan_result = analyzer.analyze_film(xray_path)
    print(f" -> Predicted Condition: {scan_result['predicted_condition']}")
    print(f" -> One-line Summary:   {scan_result['one_line_summary']}")
    print(f" -> Risk Score:         {scan_result['risk_score']}")
    assert "doc_type" in scan_result and scan_result["doc_type"] == "RADIOLOGY_XRAY"

    # 2. Test Written Radiology Report NLP (Normal vs Abnormal)
    print(f"\n[Test 3] Radiology Written Report Parsing (Negation Handling):")
    sample_normal_text = "CHEST PA VIEW: Both lung fields are clear. Hilar shadows normal. Cardiac silhouette within normal limits. No focal consolidation, pneumothorax, or effusion seen. IMPRESSION: Normal study."
    norm_result = parse_radiology_report_text(sample_normal_text)
    print(f" -> Normal Report Predicted: {norm_result['predicted_condition']} (Risk: {norm_result['risk_score']})")
    assert norm_result['risk_score'] == 15
    assert "Normal" in norm_result['predicted_condition']

    sample_abnormal_text = "CHEST PA VIEW: Opacity noted in right lower lobe. Air bronchograms present. IMPRESSION: Right lower lobe consolidation consistent with pneumonia."
    abn_result = parse_radiology_report_text(sample_abnormal_text)
    print(f" -> Abnormal Report Predicted: {abn_result['predicted_condition']} (Risk: {abn_result['risk_score']})")
    assert abn_result['risk_score'] >= 75
    assert "Pneumonia" in abn_result['predicted_condition']

    # 3. Test Pathology / Lab Report Extraction
    print(f"\n[Test 4] Pathology / Blood Report Pattern Extraction:")
    lab_analyzer = PathologyReportAnalyzer()
    sample_lab_text = """
    PATIENT CBC LAB REPORT:
    Hemoglobin (Hb): 9.2 g/dL
    Total Leukocyte Count (WBC): 16400 /uL
    Platelet Count: 85000 /uL
    Fasting Blood Sugar: 142 mg/dL
    Serum Creatinine: 1.1 mg/dL
    """
    lab_result = lab_analyzer.analyze_lab_report("", raw_text=sample_lab_text)
    print(f" -> Extracted Biomarkers: {len(lab_result['biomarkers'])}")
    for b in lab_result['biomarkers']:
        print(f"    * {b['name']}: {b['value']} {b['unit']} [{b['flag']}]")
    assert len(lab_result['biomarkers']) >= 4

    # 4. Test Differential Diagnosis Prediction
    print(f"\n[Test 5] Clinical Differential Diagnosis Engine:")
    socrates_data = {
        "history_of_present_illness": {
            "onset": "Last 2-3 days",
            "character": "Pressure / Tightness",
            "radiation": "Spreads to back / arm / neck",
            "severity": "7-9 (Severe)",
            "aggravating_factors": "Movement / Walking"
        },
        "review_of_systems": {"respiratory": "Chest pain or tightness"}
    }
    dx_results = predict_differential_diagnosis(
        socrates_data=socrates_data,
        chief_complaint="Severe central chest pain radiating to left arm",
        symptoms=["Chest Pain", "Shortness of breath"]
    )
    print(f" -> Top Diagnosis: {dx_results[0]['disease']} ({int(dx_results[0]['probability']*100)}%)")
    assert "Coronary" in dx_results[0]["disease"] or "Angina" in dx_results[0]["disease"]

    # 5. Clean up
    if os.path.exists(xray_path):
        os.remove(xray_path)
    if os.path.exists(test_dir):
        os.rmdir(test_dir)

    print("\n==================================================")
    print("  ALL 5 LOCAL ML PIPELINE TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
