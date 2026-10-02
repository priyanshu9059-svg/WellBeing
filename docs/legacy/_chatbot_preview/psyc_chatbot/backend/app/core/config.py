"""
Application configuration loaded from environment variables.

Uses pydantic-settings for validation and type coercion.
Designed so any field can later be overridden via environment or a .env file.
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object – validated at startup."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── OpenRouter ──────────────────────────────────────────────────────────
    openrouter_api_key: str = Field(..., description="OpenRouter secret API key")
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        description="OpenRouter base URL (OpenAI-compatible)",
    )
    model: str = Field(
        default="openai/gpt-oss-20b",
        description="LLM model identifier on OpenRouter",
    )

    # ── HTTP client ─────────────────────────────────────────────────────────
    http_timeout: float = Field(default=30.0, description="HTTPX request timeout (s)")
    http_max_retries: int = Field(default=3, description="Max retry attempts")
    http_retry_base_delay: float = Field(
        default=1.0, description="Base delay for exponential backoff (s)"
    )

    # ── Memory ──────────────────────────────────────────────────────────────
    max_history_messages: int = Field(
        default=20,
        description="Maximum number of messages kept per session (system excluded)",
    )

    # ── CORS ────────────────────────────────────────────────────────────────
    cors_origins: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins. Restrict in production.",
    )

    # ── Application ─────────────────────────────────────────────────────────
    app_title: str = Field(default="PsychBot API")
    app_version: str = Field(default="1.0.0")
    debug: bool = Field(default=False)
    log_level: str = Field(default="INFO")

    @field_validator("openrouter_api_key")
    @classmethod
    def api_key_must_not_be_empty(cls, v: str) -> str:
        """Fail fast if the API key is missing or blank."""
        if not v or not v.strip():
            raise ValueError(
                "OPENROUTER_API_KEY must be set in .env or environment variables."
            )
        return v.strip()

    @field_validator("log_level")
    @classmethod
    def normalise_log_level(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        if upper not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return upper


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return the singleton Settings instance.

    Cached so the .env file is parsed only once.
    Use ``get_settings.cache_clear()`` in tests to reload.
    """
    return Settings()
