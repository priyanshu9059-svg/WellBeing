"""
General-purpose utility helpers.

All functions are pure / stateless so they can be tested without any I/O.
"""

import re
import uuid
from datetime import datetime, timezone


def generate_session_id() -> str:
    """Return a new random UUID-4 string (hyphenated, lower-case)."""
    return str(uuid.uuid4())


def utc_now_iso() -> str:
    """Return current UTC time as an ISO-8601 string."""
    return datetime.now(tz=timezone.utc).isoformat()


def contains_question(text: str) -> bool:
    """
    Return True if the text appears to contain at least one question.

    Uses a simple heuristic: presence of a '?' or common interrogative
    phrases at sentence boundaries.
    """
    if "?" in text:
        return True
    interrogative_starts = re.compile(
        r"\b(can|could|would|will|do|does|did|is|are|was|were|have|has|had|"
        r"what|when|where|why|how|who|which)\b",
        re.IGNORECASE,
    )
    sentences = re.split(r"[.!]\s+", text)
    for sentence in sentences:
        if interrogative_starts.match(sentence.strip()):
            return True
    return False


def truncate_text(text: str, max_chars: int = 500) -> str:
    """
    Truncate *text* to at most *max_chars* characters, appending '…' if cut.

    Useful for log messages or debug output.
    """
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "…"


def sanitise_user_input(text: str) -> str:
    """
    Light sanitisation of user input.

    - Strips leading/trailing whitespace.
    - Collapses internal runs of whitespace to a single space.
    - Removes null bytes.
    """
    text = text.replace("\x00", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()
