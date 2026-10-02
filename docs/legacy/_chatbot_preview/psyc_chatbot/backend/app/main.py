"""
FastAPI application entry point.

Responsibilities:
  - Create the FastAPI app instance.
  - Register the lifespan context (startup / shutdown).
  - Configure CORS middleware.
  - Configure structured logging.
  - Include routers.
  - Provide a global accessor for the OpenRouter client (used by routes.py).
"""

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routes import router
from app.services.openrouter import OpenRouterClient

# ── Logging setup ─────────────────────────────────────────────────────────────

def _configure_logging(level: str) -> None:
    """Configure root logger with a consistent format."""
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
        force=True,
    )


# ── Global OpenRouter client (module-level singleton) ─────────────────────────

_openrouter_client: Optional[OpenRouterClient] = None


def get_openrouter_client() -> OpenRouterClient:
    """
    Return the application-wide OpenRouter client.

    Called by the dependency in ``routes.py``.  Raises RuntimeError if
    accessed before the lifespan startup has completed.
    """
    if _openrouter_client is None:
        raise RuntimeError(
            "OpenRouter client is not initialised. "
            "Ensure the FastAPI lifespan has started."
        )
    return _openrouter_client


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Async context manager that manages the app's startup and shutdown.

    Startup:
      - Validate settings (fails fast if OPENROUTER_API_KEY is missing).
      - Initialise the OpenRouter HTTPX client.

    Shutdown:
      - Gracefully close the HTTPX client (flushes connections).
    """
    global _openrouter_client

    settings = get_settings()
    _configure_logging(settings.log_level)
    logger = logging.getLogger(__name__)

    logger.info("PsychBot API starting up …")
    logger.info("Model: %s", settings.model)
    logger.info("Debug mode: %s", settings.debug)

    _openrouter_client = OpenRouterClient(settings=settings)
    await _openrouter_client.start()
    logger.info("OpenRouter client ready.")

    yield  # ← application runs here

    logger.info("PsychBot API shutting down …")
    await _openrouter_client.close()
    _openrouter_client = None
    logger.info("OpenRouter client closed. Goodbye.")


# ── App factory ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """
    Construct and configure the FastAPI application.

    Separated from module-level instantiation so the app can be imported in
    tests without triggering side effects.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.app_title,
        version=settings.app_version,
        description=(
            "A production-ready psychological support chatbot API. "
            "Provides empathetic conversation, risk detection, and structured "
            "JSON responses for frontend integration."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routes ────────────────────────────────────────────────────────────────
    app.include_router(router)

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["meta"], summary="Service health check")
    async def health() -> dict:
        """Returns 200 OK when the service is running."""
        return {"status": "ok", "version": settings.app_version}

    return app


# ── Module-level app instance (used by Uvicorn) ───────────────────────────────

app: FastAPI = create_app()
