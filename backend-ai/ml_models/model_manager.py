# backend-ai/ml_models/model_manager.py
"""
ML Model Manager — Singleton lazy-loader for all VAIDYcare-AI ML engines.

Ensures each model is loaded exactly once at startup, cached in memory,
and served from cache on every subsequent request (zero reload latency).

Models managed:
  - CheXNetClassifier       (DenseNet-121 chest X-ray)
  - BioBERTNEREngine        (clinical entity extraction)
  - ClinicalRiskScorer      (XGBoost + NEWS2 risk scoring)
"""

import logging
import threading
from typing import Optional, Dict, Any

logger = logging.getLogger("model_manager")


class MLModelManager:
    """
    Thread-safe singleton that lazy-loads and caches all ML engines.

    Usage (in main.py):
        manager = MLModelManager.instance()
        chexnet  = manager.chexnet
        ner      = manager.ner
        scorer   = manager.risk_scorer
    """

    _instance = None
    _lock      = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    @classmethod
    def instance(cls) -> "MLModelManager":
        return cls()

    def __init__(self):
        if self._initialized:
            return
        self._chexnet      = None
        self._ner          = None
        self._risk_scorer  = None
        self._load_errors  = {}
        self._initialized  = True

    # ── Lazy Loaders ────────────────────────────────────────────────────────
    @property
    def chexnet(self):
        """Return CheXNet classifier (loaded on first access)."""
        if self._chexnet is None:
            with self._lock:
                if self._chexnet is None:
                    logger.info("[ModelManager] Loading CheXNet DenseNet-121...")
                    try:
                        from ml_models.chexnet import CheXNetClassifier
                        self._chexnet = CheXNetClassifier()
                    except Exception as e:
                        logger.error(f"[ModelManager] CheXNet load failed: {e}")
                        self._load_errors["chexnet"] = str(e)
                        self._chexnet = _NullClassifier("CheXNet")
        return self._chexnet

    @property
    def ner(self):
        """Return BioBERT NER engine (loaded on first access)."""
        if self._ner is None:
            with self._lock:
                if self._ner is None:
                    logger.info("[ModelManager] Loading BioBERT NER engine...")
                    try:
                        from ml_models.biobert_ner import BioBERTNEREngine
                        self._ner = BioBERTNEREngine()
                    except Exception as e:
                        logger.error(f"[ModelManager] BioBERT NER load failed: {e}")
                        self._load_errors["ner"] = str(e)
                        self._ner = _NullNER()
        return self._ner

    @property
    def risk_scorer(self):
        """Return Clinical Risk Scorer (loaded on first access)."""
        if self._risk_scorer is None:
            with self._lock:
                if self._risk_scorer is None:
                    logger.info("[ModelManager] Loading XGBoost Risk Scorer...")
                    try:
                        from ml_models.risk_scorer import ClinicalRiskScorer
                        self._risk_scorer = ClinicalRiskScorer()
                    except Exception as e:
                        logger.error(f"[ModelManager] Risk Scorer load failed: {e}")
                        self._load_errors["risk_scorer"] = str(e)
                        self._risk_scorer = _NullRiskScorer()
        return self._risk_scorer

    def status(self) -> Dict[str, Any]:
        """Return health status of all loaded models."""
        return {
            "chexnet": {
                "loaded": self._chexnet is not None and not isinstance(self._chexnet, _NullClassifier),
                "backend": getattr(getattr(self._chexnet, "_model", None), "__class__", type(None)).__name__,
                "error": self._load_errors.get("chexnet")
            },
            "biobert_ner": {
                "loaded": self._ner is not None and not isinstance(self._ner, _NullNER),
                "backend": getattr(self._ner, "_backend", "unknown"),
                "error": self._load_errors.get("ner")
            },
            "risk_scorer": {
                "loaded": self._risk_scorer is not None and not isinstance(self._risk_scorer, _NullRiskScorer),
                "backend": getattr(self._risk_scorer, "_backend", "unknown"),
                "error": self._load_errors.get("risk_scorer")
            }
        }


# ── Null Object Pattern (graceful degradation) ───────────────────────────────
class _NullClassifier:
    """Returned when CheXNet cannot load. Always returns safe placeholder."""
    def __init__(self, name="Unknown"):
        self._name = name

    def predict(self, image_path: str) -> Dict:
        return {
            "model": f"{self._name} (unavailable)",
            "pathologies": [],
            "predicted_condition": "CheXNet unavailable — physician review required",
            "one_line_summary": "AI chest X-ray classifier could not be loaded.",
            "essential_bullet_points": [{"text": "X-ray scan received; queued for physician review", "flag": "YELLOW", "category": "Status"}],
            "suspected_conditions": [],
            "risk_score": 25,
            "doc_type": "RADIOLOGY_XRAY",
            "category_label": "Radiology / Chest X-Ray"
        }


class _NullNER:
    """Returned when BioBERT cannot load."""
    def extract_entities(self, text: str) -> Dict:
        return {
            "diseases": [], "drugs": [], "symptoms": [], "anatomy": [],
            "lab_markers": [], "all_entities": [],
            "clinical_summary": "NER engine unavailable.",
            "backend": "unavailable"
        }


class _NullRiskScorer:
    """Returned when Risk Scorer cannot load."""
    def score(self, **kwargs) -> Dict:
        return {
            "risk_score": 25,
            "risk_level": "MODERATE",
            "risk_color": "YELLOW",
            "news2": {"news2_total": 0, "news2_level": "GREEN", "news2_urgency": "Routine"},
            "model_backend": "unavailable",
            "clinical_recommendation": "Risk scoring unavailable — standard intake pathway."
        }

