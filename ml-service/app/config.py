"""WellBeing ML service config — CareSignal inference weights (no DB)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AI_MODE = 'local'
MODEL_PATH = Path(__import__('os').environ.get('MODEL_PATH', str(ROOT / 'models')))

WEIGHTS = {
    'questionnaire': 0.25,
    'safety': 0.20,
    'nlp': 0.15,
    'trend': 0.15,
    'sleep': 0.10,
    'engagement': 0.05,
    'voice': 0.10,
}
THRESHOLDS = [(85, 'Critical'), (70, 'High'), (50, 'Moderate'), (30, 'Mild'), (0, 'Low')]
