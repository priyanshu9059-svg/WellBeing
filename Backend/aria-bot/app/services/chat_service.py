"""
Chat service — orchestrates session management, LLM calls, and risk analysis.

This is the central business-logic layer.  Routes call only this module;
all I/O and coordination happens here.
"""

import logging
from typing import Dict, List

from app.core.prompts import CRISIS_SUPPLEMENT, GREETING_MESSAGE, SYSTEM_PROMPT
from app.schemas import (
    DeleteSessionResponse,
    HistoryEntry,
    HistoryResponse,
    MessageResponse,
    RiskResult,
    StartSessionResponse,
)
from app.services.memory import InMemorySessionStore
from app.services.openrouter import OpenRouterClient
from app.services.risk_analyzer import analyze_risk
from app.utils import contains_question, generate_session_id, sanitise_user_input

logger = logging.getLogger(__name__)


class ChatService:
    """
    Orchestrates the full lifecycle of a chat conversation.

    Parameters
    ----------
    store:
        Session store (in-memory or Redis-backed).
    llm:
        OpenRouter async client.
    """

    def __init__(
        self,
        store: InMemorySessionStore,
        llm: OpenRouterClient,
    ) -> None:
        self._store = store
        self._llm = llm

    # ── Public operations ─────────────────────────────────────────────────────

    async def start_session(self) -> StartSessionResponse:
        """
        Create a new conversation session.

        Returns a unique session ID and the chatbot's opening greeting.
        """
        session_id = generate_session_id()
        await self._store.create_session(
            session_id=session_id,
            system_prompt=SYSTEM_PROMPT,
        )
        # Seed the assistant's greeting so the LLM has context from message 1
        await self._store.append_message(
            session_id=session_id,
            role="assistant",
            content=GREETING_MESSAGE,
        )
        logger.info("New session started: %s", session_id)
        return StartSessionResponse(
            session_id=session_id,
            message=GREETING_MESSAGE,
        )

    async def handle_message(
        self,
        session_id: str,
        raw_message: str,
    ) -> MessageResponse:
        """
        Process one user turn and return a structured reply.

        Steps
        -----
        1. Validate session.
        2. Sanitise input.
        3. Run rule-based risk analyser.
        4. If crisis: inject supplementary system context.
        5. Append user message to history.
        6. Call LLM.
        7. Append assistant reply to history.
        8. Detect whether reply contains a follow-up question.
        9. Return structured response.

        Raises
        ------
        KeyError
            If *session_id* is not found.
        """
        exists = await self._store.session_exists(session_id)
        if not exists:
            raise KeyError(f"Session '{session_id}' not found.")

        message = sanitise_user_input(raw_message)

        # ── 1. Risk analysis (always runs, independent of LLM) ─────────────
        risk: RiskResult = analyze_risk(message)
        logger.info(
            "Session %s | risk=%s emotion=%s confidence=%.2f",
            session_id,
            risk.risk_level,
            risk.emotion,
            risk.confidence,
        )

        # ── 2. Append user message ──────────────────────────────────────────
        await self._store.append_message(session_id, "user", message)

        # ── 3. Build message list for LLM ───────────────────────────────────
        history = await self._store.get_history(session_id)
        assert history is not None  # we just validated session existence

        if risk.risk_level == "crisis":
            messages_for_llm = self._inject_crisis_context(history)
            logger.warning(
                "Crisis detected in session %s — injecting crisis supplement.",
                session_id,
            )
        else:
            messages_for_llm = history

        # ── 4. LLM call ─────────────────────────────────────────────────────
        reply_text = await self._llm.chat(
            messages=messages_for_llm,
            temperature=0.72,
            max_tokens=300,
        )

        # ── 5. Append assistant reply ───────────────────────────────────────
        await self._store.append_message(session_id, "assistant", reply_text)

        # ── 6. Determine conversation turn (count user messages) ────────────
        turn = await self._store.get_conversation_turn(session_id)

        # ── 7. Detect follow-up question ────────────────────────────────────
        has_follow_up = contains_question(reply_text)

        return MessageResponse(
            reply=reply_text,
            follow_up=has_follow_up,
            emotion=risk.emotion,
            risk_level=risk.risk_level,
            confidence=risk.confidence,
            conversation_turn=turn,
        )

    async def get_history(self, session_id: str) -> HistoryResponse:
        """
        Return the public conversation history for *session_id*.

        The system message is stripped from the response — it is an internal
        implementation detail and should not be exposed to clients.

        Raises
        ------
        KeyError
            If *session_id* is not found.
        """
        history = await self._store.get_history(session_id)
        if history is None:
            raise KeyError(f"Session '{session_id}' not found.")

        visible: List[HistoryEntry] = [
            HistoryEntry(role=m["role"], content=m["content"])  # type: ignore[arg-type]
            for m in history
            if m["role"] != "system"
        ]
        user_turns = sum(1 for m in visible if m.role == "user")

        return HistoryResponse(
            session_id=session_id,
            messages=visible,
            total_turns=user_turns,
        )

    async def delete_session(self, session_id: str) -> DeleteSessionResponse:
        """
        Delete *session_id* from the store.

        Returns a response indicating whether the session existed.
        """
        deleted = await self._store.delete_session(session_id)
        return DeleteSessionResponse(session_id=session_id, deleted=deleted)

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _inject_crisis_context(
        history: List[Dict[str, str]],
    ) -> List[Dict[str, str]]:
        """
        Build a modified message list that injects the crisis supplement
        immediately after the system message.

        This augments the LLM's guidance without mutating the stored history.
        """
        if not history:
            return history

        system_msg = history[0]
        augmented_system = {
            "role": "system",
            "content": system_msg["content"] + "\n\n" + CRISIS_SUPPLEMENT,
        }
        return [augmented_system] + history[1:]
