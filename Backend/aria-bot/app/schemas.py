"""
Pydantic v2 schemas for all request/response bodies.

Keeps FastAPI route handlers thin and makes the API contract explicit.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ── Shared types ─────────────────────────────────────────────────────────────

EmotionType = Literal[
    "happy", "calm", "anxious", "stressed", "sad",
    "distressed", "angry", "hopeless", "neutral"
]

RiskLevelType = Literal["low", "moderate", "high", "crisis"]


# ── Chat message (internal history entry) ────────────────────────────────────

class ChatMessage(BaseModel):
    """Single turn in the raw conversation history sent to the LLM."""

    role: Literal["system", "user", "assistant"]
    content: str


# ── /chat/start ──────────────────────────────────────────────────────────────

class StartSessionResponse(BaseModel):
    """Returned when a new session is created."""

    session_id: str = Field(..., description="UUID identifying this conversation session")
    message: str = Field(..., description="Opening greeting from the chatbot")


# ── /chat/message ────────────────────────────────────────────────────────────

class MessageRequest(BaseModel):
    """Payload sent by the frontend to continue the conversation."""

    session_id: str = Field(..., min_length=36, max_length=36, description="Session UUID")
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's message text",
    )

    @field_validator("message")
    @classmethod
    def strip_message(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("message must not be blank")
        return stripped


class MessageResponse(BaseModel):
    """Structured reply returned to the frontend after each user turn."""

    reply: str = Field(..., description="Chatbot's response text")
    follow_up: bool = Field(
        ...,
        description="True when the reply contains a follow-up question",
    )
    emotion: EmotionType = Field(..., description="Detected primary emotion")
    risk_level: RiskLevelType = Field(..., description="Assessed risk level")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Risk analyser confidence score"
    )
    conversation_turn: int = Field(
        ..., ge=1, description="Turn index (user messages only)"
    )


# ── /chat/history/{session_id} ───────────────────────────────────────────────

class HistoryEntry(BaseModel):
    """One turn as returned in the history endpoint."""

    role: Literal["user", "assistant"]
    content: str


class HistoryResponse(BaseModel):
    """Full conversation history for a session."""

    session_id: str
    messages: List[HistoryEntry]
    total_turns: int = Field(..., description="Number of user turns so far")


# ── /chat/{session_id} DELETE ────────────────────────────────────────────────

class DeleteSessionResponse(BaseModel):
    """Confirmation that a session was removed."""

    session_id: str
    deleted: bool


# ── Error envelope ───────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """Standardised error body returned on 4xx / 5xx."""

    error: str
    detail: Optional[str] = None
    session_id: Optional[str] = None


# ── Risk analysis result (internal) ─────────────────────────────────────────

class RiskResult(BaseModel):
    """Output of the lightweight rule-based risk analyser."""

    emotion: EmotionType
    risk_level: RiskLevelType
    confidence: float = Field(..., ge=0.0, le=1.0)
