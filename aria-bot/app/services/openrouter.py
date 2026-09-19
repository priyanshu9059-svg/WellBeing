"""
Async OpenRouter API client.

Wraps HTTPX with:
  - Retry logic (3 attempts, exponential backoff)
  - Timeout handling
  - Graceful error responses
  - No API key leakage in logs or exceptions

The client is instantiated once and shared via lifespan context.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

# Sentinel returned when all retries fail, avoiding a hard exception bubble
_FALLBACK_REPLY = (
    "I'm sorry — I'm having trouble reaching my thinking systems right now. "
    "Please try again in a moment. I'm here for you."
)


class OpenRouterClient:
    """
    Async client for the OpenRouter chat-completions endpoint.

    Parameters
    ----------
    settings:
        Application settings (API key, model, timeouts, retries).
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._base_url = settings.openrouter_base_url.rstrip("/")
        self._model = settings.model
        self._timeout = settings.http_timeout
        self._max_retries = settings.http_max_retries
        self._retry_base_delay = settings.http_retry_base_delay

        # Single shared async client — reuses connection pool
        self._client: Optional[httpx.AsyncClient] = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def start(self) -> None:
        """Initialise the underlying HTTPX client. Call once at app startup."""
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=httpx.Timeout(self._timeout),
            headers=self._build_headers(),
        )
        logger.info("OpenRouter HTTP client started (model=%s).", self._model)

    async def close(self) -> None:
        """Close the underlying HTTPX client. Call once at app shutdown."""
        if self._client:
            await self._client.aclose()
            self._client = None
            logger.info("OpenRouter HTTP client closed.")

    # ── Public API ────────────────────────────────────────────────────────────

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.75,
        max_tokens: int = 300,
    ) -> str:
        """
        Send *messages* to the OpenRouter chat-completions endpoint.

        Retries up to ``settings.http_max_retries`` times with exponential
        backoff on transient errors (5xx, network failures, timeouts).

        Parameters
        ----------
        messages:
            Full conversation history including the system message.
        temperature:
            Sampling temperature (0 = deterministic, 1 = creative).
        max_tokens:
            Upper bound on response length in tokens.

        Returns
        -------
        str
            The assistant's reply text, or a graceful fallback string.
        """
        payload = self._build_payload(messages, temperature, max_tokens)

        for attempt in range(1, self._max_retries + 1):
            try:
                reply = await self._post(payload)
                return reply

            except httpx.TimeoutException:
                logger.warning(
                    "OpenRouter request timed out (attempt %d/%d).",
                    attempt,
                    self._max_retries,
                )
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                if status == 429:
                    logger.warning(
                        "OpenRouter rate-limited (attempt %d/%d).",
                        attempt,
                        self._max_retries,
                    )
                elif status < 500:
                    # Other 4xx — do not retry
                    logger.error(
                        "OpenRouter returned client error %d. Not retrying.", status
                    )
                    return _FALLBACK_REPLY
                else:
                    logger.warning(
                        "OpenRouter returned server error %d (attempt %d/%d).",
                        status,
                        attempt,
                        self._max_retries,
                    )
            except httpx.RequestError as exc:
                logger.warning(
                    "OpenRouter network error on attempt %d/%d: %s",
                    attempt,
                    self._max_retries,
                    type(exc).__name__,
                )
            except (KeyError, IndexError, ValueError) as exc:
                logger.error(
                    "Unexpected response structure from OpenRouter: %s", exc
                )
                return _FALLBACK_REPLY

            if attempt < self._max_retries:
                delay = self._retry_base_delay * (2 ** (attempt - 1))
                logger.info("Retrying in %.1f s …", delay)
                await asyncio.sleep(delay)

        logger.error(
            "All %d OpenRouter attempts exhausted. Returning fallback reply.",
            self._max_retries,
        )
        return _FALLBACK_REPLY

    # ── Private helpers ───────────────────────────────────────────────────────

    def _build_headers(self) -> Dict[str, str]:
        """Build auth headers without exposing the key in logs."""
        return {
            "Authorization": f"Bearer {self._settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://psychbot.app",  # OpenRouter attribution
            "X-Title": "PsychBot",
        }

    def _build_payload(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        return {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

    async def _post(self, payload: Dict[str, Any]) -> str:
        """
        Perform the actual HTTP POST and extract the reply text.

        Raises
        ------
        httpx.TimeoutException
            On request timeout.
        httpx.HTTPStatusError
            On non-2xx HTTP status.
        httpx.RequestError
            On connection / network failures.
        KeyError / IndexError
            If the response JSON structure is unexpected.
        """
        assert self._client is not None, "Client not started. Call start() first."

        response = await self._client.post(
            "/chat/completions",
            json=payload,
        )
        response.raise_for_status()

        data: Dict[str, Any] = response.json()
        reply: str = data["choices"][0]["message"]["content"]
        logger.debug("OpenRouter reply received (%d chars).", len(reply))
        return reply.strip()
