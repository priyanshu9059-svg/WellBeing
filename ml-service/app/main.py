"""
WellBeing ML service — CareSignal text + voice + fusion inference.
Runs on :8010. Express proxies here; chatbot (Aria) stays on :8000.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.ai import analyze_text, audio_features, calculate

app = FastAPI(title="WellBeing ML", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

THEME_HINTS = {
    "threats_intimidation": "I feel threatened and intimidated.",
    "court_legal_stress": "Court hearings and legal process are stressful.",
    "investigation_delays": "Investigation and trial delays are weighing on me.",
    "social_ostracism": "I feel socially ostracised and isolated.",
    "economic_hardship": "Economic hardship and money stress are hard.",
    "rehabilitation_housing": "I need rehabilitation and housing support.",
    "sleep_daily": "Sleep and daily functioning are affected.",
    "family_safety": "I worry about family safety.",
    "counselling_support": "I need counselling or psychological support.",
    "general_wellbeing": "",
}


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    language: str = "en"
    theme: Optional[str] = None


class CheckinRequest(BaseModel):
    text: str = ""
    language: str = "en"
    theme: Optional[str] = None
    need: Optional[str] = None


def _compose_text(text: str, theme: Optional[str]) -> str:
    hint = THEME_HINTS.get(theme or "", "")
    parts = [p for p in (hint, text.strip()) if p]
    return " ".join(parts).strip()


def _pack_result(result: dict[str, Any]) -> dict[str, Any]:
    scores = result.get("scores") or {}
    sentiment = result.get("sentiment") or {}
    voice = result.get("voice") or {}
    signals = result.get("signals") or {}
    factors = [
        k.replace("_", " ")
        for k, v in signals.items()
        if v and k not in ("trained_text_model",)
    ][:8]
    return {
        "distress": scores.get("distress"),
        "safety_risk": scores.get("safety_risk"),
        "escalation_risk": scores.get("escalation_risk"),
        "priority": result.get("priority"),
        "sentiment_label": sentiment.get("label"),
        "sentiment_score": sentiment.get("score"),
        "stress_score": voice.get("stress_score") if isinstance(voice, dict) else None,
        "emotion_label": voice.get("emotion") if isinstance(voice, dict) else None,
        "emotions": result.get("emotions"),
        "signals": signals,
        "factors": factors,
        "recommendations": result.get("recommendations") or [],
        "method": result.get("method"),
        "fallback": result.get("fallback"),
        "voice": voice if isinstance(voice, dict) else None,
        "explanation": result.get("explanation") or [],
        "limitations": result.get("limitations"),
        "raw": {
            "scores": scores,
            "priority": result.get("priority"),
            "prediction": result.get("prediction"),
            "missing_inputs": result.get("missing_inputs"),
        },
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "wellbeing-ml", "version": "1.0.0"}


@app.post("/analyze/text")
def analyze_text_route(body: TextRequest) -> dict:
    composed = _compose_text(body.text, body.theme)
    if not composed:
        raise HTTPException(400, "text is required")
    nlp = analyze_text(composed, body.language)
    # Light fusion without questionnaire using calculate
    result = calculate(
        responses={"need": body.theme or ""},
        text=composed,
        language=body.language,
        history=[],
        conditions={},
        at=datetime.now(timezone.utc),
        voice=None,
    )
    return _pack_result(result)


@app.post("/analyze/voice")
async def analyze_voice_route(
    file: UploadFile = File(...),
    transcript: str = Form(""),
    language: str = Form("en"),
    theme: Optional[str] = Form(None),
    text: str = Form(""),
) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "empty audio")
    try:
        voice = audio_features(raw, transcript or text)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    composed = _compose_text(text or transcript, theme)
    result = calculate(
        responses={"need": theme or ""},
        text=composed,
        language=language,
        history=[],
        conditions={},
        at=datetime.now(timezone.utc),
        voice=voice,
    )
    return _pack_result(result)


@app.post("/analyze/checkin")
def analyze_checkin_route(body: CheckinRequest) -> dict:
    composed = _compose_text(body.text, body.theme)
    if not composed:
        raise HTTPException(400, "text or theme context required")
    result = calculate(
        responses={"need": body.need or body.theme or ""},
        text=composed,
        language=body.language,
        history=[],
        conditions={},
        at=datetime.now(timezone.utc),
        voice=None,
    )
    return _pack_result(result)
