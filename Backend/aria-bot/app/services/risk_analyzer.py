"""
Lightweight, rule-based psychological risk analyser.

This module operates entirely independently of the LLM.  It uses keyword
matching and weighted heuristics to:

  1. Detect the primary emotion expressed in user text.
  2. Assign a risk level: ``low`` | ``moderate`` | ``high`` | ``crisis``.
  3. Return a confidence score in [0, 1].

Design notes
------------
* No machine-learning dependencies — fast and deterministic.
* Intended as a *safety net* and *routing signal*, not a clinical assessment.
* Crisis keywords take absolute priority over all other scoring.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from app.schemas import RiskResult

logger = logging.getLogger(__name__)


# ── Keyword tables ────────────────────────────────────────────────────────────

# Each entry: (pattern, weight)
# Weights are additive within an emotion category.

_EMOTION_KEYWORDS: Dict[str, List[Tuple[str, float]]] = {
    "happy": [
        (r"\bhappy\b", 0.8),
        (r"\bjoyful\b", 0.8),
        (r"\bgreat\b", 0.6),
        (r"\bexcited\b", 0.7),
        (r"\bthankful\b", 0.7),
        (r"\bgrateful\b", 0.7),
        (r"\bblissful\b", 0.8),
        (r"\bcheerful\b", 0.7),
        (r"\belated\b", 0.8),
        (r"\bwonderful\b", 0.6),
        (r"\bfantastic\b", 0.6),
        (r"\boverjoyed\b", 0.9),
        (r"\bpleased\b", 0.6),
    ],
    "calm": [
        (r"\bcalm\b", 0.8),
        (r"\bpeaceful\b", 0.8),
        (r"\brelaxed\b", 0.7),
        (r"\bserene\b", 0.8),
        (r"\bquiet\b", 0.5),
        (r"\bstill\b", 0.4),
        (r"\bcontented?\b", 0.7),
        (r"\bat ease\b", 0.7),
        (r"\btranquil\b", 0.8),
        (r"\bfine\b", 0.4),
        (r"\bokay\b", 0.4),
        (r"\balright\b", 0.4),
    ],
    "anxious": [
        (r"\banxious\b", 0.9),
        (r"\bnervous\b", 0.8),
        (r"\bworried\b", 0.8),
        (r"\bworrying\b", 0.7),
        (r"\bpanic(king)?\b", 0.9),
        (r"\bpanicked\b", 0.9),
        (r"\buneasy\b", 0.7),
        (r"\bapprehensive\b", 0.8),
        (r"\bscared\b", 0.7),
        (r"\bfrightened\b", 0.7),
        (r"\bfearful\b", 0.8),
        (r"\bterri(fied|ble)\b", 0.8),
        (r"\bcan'?t stop thinking\b", 0.7),
        (r"\boverwhelm(ed|ing)\b", 0.6),
        (r"\bon edge\b", 0.7),
    ],
    "stressed": [
        (r"\bstress(ed|ful|ing)?\b", 0.9),
        (r"\bburn(t|ed)? ?out\b", 0.9),
        (r"\bexhaust(ed|ing)\b", 0.7),
        (r"\btired\b", 0.5),
        (r"\boverwhelm(ed|ing)\b", 0.7),
        (r"\bpressure\b", 0.7),
        (r"\bdeadline\b", 0.5),
        (r"\btoo much\b", 0.6),
        (r"\bcan'?t cope\b", 0.8),
        (r"\bcan'?t handle\b", 0.8),
        (r"\bstuck\b", 0.5),
        (r"\bdrained\b", 0.7),
        (r"\bno energy\b", 0.6),
        (r"\btensed?\b", 0.6),
    ],
    "sad": [
        (r"\bsad\b", 0.9),
        (r"\bunhappy\b", 0.8),
        (r"\bdepressed?\b", 0.8),
        (r"\bdown\b", 0.5),
        (r"\bgloomy\b", 0.7),
        (r"\bmiserable\b", 0.8),
        (r"\bcry(ing)?\b", 0.7),
        (r"\btear(s|ful)\b", 0.7),
        (r"\bheartbroken\b", 0.8),
        (r"\blonely\b", 0.7),
        (r"\balone\b", 0.5),
        (r"\bisolated\b", 0.7),
        (r"\bgrie(f|ving)\b", 0.8),
        (r"\blost\b", 0.5),
        (r"\bempty\b", 0.7),
    ],
    "distressed": [
        (r"\bdistressed?\b", 0.9),
        (r"\bdesperate\b", 0.9),
        (r"\bfrantic\b", 0.8),
        (r"\bdistraught\b", 0.9),
        (r"\bagitated\b", 0.7),
        (r"\bshaking\b", 0.7),
        (r"\bcan'?t breathe\b", 0.8),
        (r"\bhysterical\b", 0.8),
        (r"\bbreaking down\b", 0.9),
        (r"\bfalling apart\b", 0.9),
        (r"\bfalling to pieces\b", 0.9),
        (r"\bno way out\b", 0.9),
        (r"\btrapped\b", 0.8),
        (r"\bcan'?t go on\b", 0.9),
    ],
    "angry": [
        (r"\bangry\b", 0.9),
        (r"\bfurious\b", 0.9),
        (r"\brage\b", 0.9),
        (r"\brage(ful|ing)\b", 0.9),
        (r"\bresentful\b", 0.8),
        (r"\bbittern?ess\b", 0.7),
        (r"\birritatd?\b", 0.7),
        (r"\bannoy(ed|ing)\b", 0.6),
        (r"\bfrustrat(ed|ing)\b", 0.7),
        (r"\bhate\b", 0.7),
        (r"\bhateful\b", 0.8),
        (r"\bfed up\b", 0.7),
        (r"\bengraged?\b", 0.9),
        (r"\boutraged?\b", 0.8),
    ],
    "hopeless": [
        (r"\bhopeless\b", 1.0),
        (r"\bgive up\b", 0.8),
        (r"\bgiven up\b", 0.8),
        (r"\bno hope\b", 1.0),
        (r"\bno point\b", 0.8),
        (r"\bpointless\b", 0.8),
        (r"\bnothing matters\b", 0.9),
        (r"\bworthless\b", 0.9),
        (r"\buseless\b", 0.7),
        (r"\bfailure\b", 0.6),
        (r"\bnever get better\b", 0.9),
        (r"\balways be this way\b", 0.8),
        (r"\bnumb\b", 0.7),
        (r"\bvoid\b", 0.7),
        (r"\bburden\b", 0.8),
    ],
}

# Crisis triggers — any single match immediately escalates risk to "crisis".
_CRISIS_PATTERNS: List[str] = [
    r"\bi want to die\b",
    r"\bwant to end (my |this )?life\b",
    r"\bkill myself\b",
    r"\bkilling myself\b",
    r"\bsuicid(e|al)\b",
    r"\bend my life\b",
    r"\bend it all\b",
    r"\bno reason to live\b",
    r"\bnot worth living\b",
    r"\blife is not worth\b",
    r"\bbetter off dead\b",
    r"\bbetter off without me\b",
    r"\bwish i was dead\b",
    r"\bwish i were dead\b",
    r"\bdon'?t want to be here\b",
    r"\bdon'?t want to live\b",
    r"\bslit (my )?wrists?\b",
    r"\boverdose\b",
    r"\bself[- ]harm(ing)?\b",
    r"\bcutting myself\b",
    r"\bhurt(ing)? myself\b",
]

# Risk escalation thresholds per emotion (base risk level)
_EMOTION_BASE_RISK: Dict[str, str] = {
    "happy":      "low",
    "calm":       "low",
    "neutral":    "low",
    "anxious":    "moderate",
    "stressed":   "moderate",
    "sad":        "moderate",
    "angry":      "moderate",
    "distressed": "high",
    "hopeless":   "high",
}

_RISK_ORDER = ["low", "moderate", "high", "crisis"]


def _escalate(current: str, to: str) -> str:
    """Return the higher of two risk levels."""
    return to if _RISK_ORDER.index(to) > _RISK_ORDER.index(current) else current


@dataclass
class _EmotionScore:
    emotion: str
    raw_score: float = 0.0
    match_count: int = 0

    def normalised(self) -> float:
        """Normalise score to [0, 1] via a simple sigmoid-like cap."""
        return min(1.0, self.raw_score / (self.raw_score + 1.0))


def analyze_risk(text: str) -> RiskResult:
    """
    Analyse *text* for emotional content and psychological risk level.

    This function is fully synchronous and CPU-bound; call it from a thread
    pool if latency is a concern in high-throughput contexts.

    Parameters
    ----------
    text:
        Raw user message string.

    Returns
    -------
    RiskResult
        Contains ``emotion``, ``risk_level``, and ``confidence``.
    """
    lowered = text.lower()

    # ── 1. Crisis check (takes absolute priority) ─────────────────────────
    for pattern in _CRISIS_PATTERNS:
        if re.search(pattern, lowered):
            logger.warning("Crisis keyword detected in user message.")
            return RiskResult(
                emotion="hopeless",
                risk_level="crisis",
                confidence=0.97,
            )

    # ── 2. Score each emotion category ───────────────────────────────────
    scores: List[_EmotionScore] = []
    for emotion, patterns in _EMOTION_KEYWORDS.items():
        es = _EmotionScore(emotion=emotion)
        for pattern, weight in patterns:
            if re.search(pattern, lowered):
                es.raw_score += weight
                es.match_count += 1
        scores.append(es)

    # Sort descending
    scores.sort(key=lambda s: s.raw_score, reverse=True)
    top = scores[0]

    # ── 3. Determine emotion ──────────────────────────────────────────────
    if top.raw_score == 0.0:
        # No keywords matched
        emotion = "neutral"
        risk_level = "low"
        confidence = 0.45
    else:
        emotion = top.emotion
        confidence = round(min(0.97, 0.50 + top.normalised() * 0.47), 2)

        # ── 4. Determine risk level ───────────────────────────────────────
        risk_level = _EMOTION_BASE_RISK.get(emotion, "low")

        # Boost risk if distress/hopeless score is very high
        if emotion in ("distressed", "hopeless") and top.raw_score >= 1.5:
            risk_level = _escalate(risk_level, "high")

        # Boost risk if multiple negative emotions appear together
        negative_emotions = {"anxious", "stressed", "sad", "distressed", "angry", "hopeless"}
        active_negatives = [s for s in scores if s.emotion in negative_emotions and s.raw_score > 0]
        if len(active_negatives) >= 3:
            risk_level = _escalate(risk_level, "high")
        elif len(active_negatives) >= 2 and risk_level == "low":
            risk_level = "moderate"

    logger.debug(
        "Risk analysis → emotion=%s, risk=%s, confidence=%.2f",
        emotion,
        risk_level,
        confidence,
    )

    return RiskResult(
        emotion=emotion,  # type: ignore[arg-type]
        risk_level=risk_level,  # type: ignore[arg-type]
        confidence=confidence,
    )
