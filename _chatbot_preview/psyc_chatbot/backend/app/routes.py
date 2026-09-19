"""
API route handlers for all /chat/* endpoints.

Routes are intentionally thin: they validate input (via Pydantic), delegate
to ChatService, convert domain exceptions to HTTP errors, and return
structured responses.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas import (
    DeleteSessionResponse,
    ErrorResponse,
    HistoryResponse,
    MessageRequest,
    MessageResponse,
    StartSessionResponse,
)
from app.services.chat_service import ChatService
from app.services.memory import InMemorySessionStore, get_session_store
from app.services.openrouter import OpenRouterClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


# ── Dependency: ChatService ───────────────────────────────────────────────────

def get_chat_service(
    store: InMemorySessionStore = Depends(get_session_store),
) -> ChatService:
    """
    FastAPI dependency that returns a ChatService wired to the singleton store
    and the lifespan-managed OpenRouter client.

    The OpenRouter client is retrieved from app state, which is set in
    ``app.main`` during startup.
    """
    from app.main import get_openrouter_client  # avoid circular import
    llm: OpenRouterClient = get_openrouter_client()
    return ChatService(store=store, llm=llm)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/start",
    response_model=StartSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new conversation session",
    responses={500: {"model": ErrorResponse}},
)
async def start_session(
    service: ChatService = Depends(get_chat_service),
) -> StartSessionResponse:
    """
    Create a new conversation session.

    Returns a session UUID and the chatbot's opening greeting.
    No request body is required.
    """
    try:
        result = await service.start_session()
        logger.info("Session started: %s", result.session_id)
        return result
    except Exception as exc:
        logger.exception("Unexpected error starting session.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start session.",
        ) from exc


@router.post(
    "/message",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a message and receive a structured reply",
    responses={
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def send_message(
    body: MessageRequest,
    service: ChatService = Depends(get_chat_service),
) -> MessageResponse:
    """
    Process a user message and return the chatbot's reply with metadata.

    - ``session_id``: UUID returned by ``POST /chat/start``.
    - ``message``: The user's text (1–2000 characters).
    """
    try:
        result = await service.handle_message(
            session_id=body.session_id,
            raw_message=body.message,
        )
        return result
    except KeyError as exc:
        logger.warning("Message sent to unknown session: %s", body.session_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception(
            "Unexpected error handling message for session %s.", body.session_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message.",
        ) from exc


@router.get(
    "/history/{session_id}",
    response_model=HistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve full conversation history",
    responses={404: {"model": ErrorResponse}},
)
async def get_history(
    session_id: str,
    service: ChatService = Depends(get_chat_service),
) -> HistoryResponse:
    """
    Return all user and assistant messages for the given session.

    The internal system prompt is excluded from the response.
    """
    try:
        return await service.get_history(session_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{session_id}",
    response_model=DeleteSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a conversation session",
    responses={404: {"model": ErrorResponse}},
)
async def delete_session(
    session_id: str,
    service: ChatService = Depends(get_chat_service),
) -> DeleteSessionResponse:
    """
    Permanently delete a conversation session and all its history.

    Returns ``{"deleted": true}`` even if the session did not exist,
    to make the operation idempotent for the client.
    """
    result = await service.delete_session(session_id)
    if not result.deleted:
        logger.warning("Attempted to delete non-existent session: %s", session_id)
    return result
