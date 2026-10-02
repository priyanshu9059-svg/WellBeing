"""
In-memory session store for conversation histories.

Design contract
---------------
All public methods mirror the interface a Redis-backed implementation would
expose, making a future drop-in replacement straightforward.

The store maps session_id (str) → list of raw message dicts
({"role": ..., "content": ...}).

Thread safety: asyncio is single-threaded; no locks are required for the
in-memory store.  A Redis implementation would use async redis-py commands
which are already coroutine-safe.
"""

import logging
from typing import Dict, List, Optional

from app.schemas import ChatMessage

logger = logging.getLogger(__name__)


class InMemorySessionStore:
    """
    Lightweight in-memory session store.

    Stores conversation histories as lists of ``ChatMessage``-compatible dicts.
    The system prompt is stored as the first element of each session's list
    so it is always sent to the LLM without counting toward the rolling window.
    """

    def __init__(self, max_history: int = 20) -> None:
        """
        Parameters
        ----------
        max_history:
            Maximum number of non-system messages to retain per session.
            Older messages are dropped from the front of the list when the
            limit is exceeded.
        """
        self._store: Dict[str, List[Dict[str, str]]] = {}
        self._max_history = max_history

    # ── Session lifecycle ────────────────────────────────────────────────────

    async def create_session(
        self, session_id: str, system_prompt: str
    ) -> None:
        """
        Initialise a new session with the provided system prompt.

        If a session with the same ID already exists it is overwritten.
        """
        self._store[session_id] = [
            {"role": "system", "content": system_prompt}
        ]
        logger.info("Session created: %s", session_id)

    async def session_exists(self, session_id: str) -> bool:
        """Return True if *session_id* is present in the store."""
        return session_id in self._store

    async def delete_session(self, session_id: str) -> bool:
        """
        Remove a session.

        Returns True if the session existed and was deleted, False otherwise.
        """
        existed = session_id in self._store
        if existed:
            del self._store[session_id]
            logger.info("Session deleted: %s", session_id)
        return existed

    # ── Message management ───────────────────────────────────────────────────

    async def append_message(
        self, session_id: str, role: str, content: str
    ) -> None:
        """
        Append one message to the session history, enforcing the rolling window.

        The system message (index 0) is never evicted.

        Parameters
        ----------
        session_id:
            Target session.
        role:
            ``"user"`` or ``"assistant"``.
        content:
            Message text.

        Raises
        ------
        KeyError
            If *session_id* does not exist.
        """
        if session_id not in self._store:
            raise KeyError(f"Session '{session_id}' not found.")

        history = self._store[session_id]
        history.append({"role": role, "content": content})

        # Keep system message + at most max_history non-system messages.
        non_system = [m for m in history if m["role"] != "system"]
        if len(non_system) > self._max_history:
            # Drop the oldest non-system message.
            system_msgs = [m for m in history if m["role"] == "system"]
            excess = len(non_system) - self._max_history
            non_system = non_system[excess:]
            self._store[session_id] = system_msgs + non_system
            logger.debug(
                "Session %s: trimmed %d old message(s).", session_id, excess
            )

    async def get_history(
        self, session_id: str
    ) -> Optional[List[Dict[str, str]]]:
        """
        Return the full message list (including the system message) for *session_id*.

        Returns None if the session does not exist.
        """
        return self._store.get(session_id)

    async def get_conversation_turn(self, session_id: str) -> int:
        """
        Return the number of **user** turns recorded for *session_id*.

        Returns 0 if the session does not exist.
        """
        history = self._store.get(session_id, [])
        return sum(1 for m in history if m["role"] == "user")

    async def count_sessions(self) -> int:
        """Return the total number of active sessions (for observability)."""
        return len(self._store)


# ── Singleton ────────────────────────────────────────────────────────────────

# Instantiated once at import time; injected via FastAPI dependency injection.
# Replace with a Redis-backed class and update the dependency in routes.py.
_session_store: Optional[InMemorySessionStore] = None


def get_session_store() -> InMemorySessionStore:
    """
    FastAPI dependency that returns the singleton session store.

    To swap in a Redis store, change the implementation returned here.
    """
    global _session_store
    if _session_store is None:
        from app.core.config import get_settings
        settings = get_settings()
        _session_store = InMemorySessionStore(
            max_history=settings.max_history_messages
        )
    return _session_store
