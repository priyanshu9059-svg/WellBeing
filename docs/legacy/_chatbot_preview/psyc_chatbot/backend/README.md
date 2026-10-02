# PsychBot API

A production-ready psychological support chatbot backend built with **FastAPI** and **Python 3.12**.

> ⚠️ **Disclaimer**: This chatbot is a supportive conversational companion. It is not a replacement for professional mental-health care, diagnosis, or treatment.

---

## Features

- 🧠 **LLM-powered empathetic responses** via OpenRouter (OpenAI-compatible)
- 🔍 **Rule-based risk analyser** — detects emotion and risk level without LLM dependency
- 🚨 **Crisis protocol** — automatically escalates context for high-risk messages
- 💬 **Rolling conversation memory** — last 20 messages per session
- 🔌 **Redis-ready architecture** — swap the in-memory store with one line of code
- 📦 **Structured JSON responses** — ready for any frontend
- ⚡ **Fully async** — HTTPX, asyncio, Pydantic v2

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app factory + lifespan
│   ├── routes.py            # API route handlers
│   ├── schemas.py           # Pydantic v2 request/response models
│   ├── utils.py             # Pure utility helpers
│   ├── core/
│   │   ├── config.py        # Pydantic-settings configuration
│   │   └── prompts.py       # System prompt + crisis supplement
│   └── services/
│       ├── chat_service.py  # Business logic orchestration
│       ├── openrouter.py    # Async OpenRouter HTTPX client
│       ├── risk_analyzer.py # Keyword-based risk/emotion analyser
│       └── memory.py        # In-memory session store (Redis-ready)
├── .env.example
├── requirements.txt
└── README.md
```

---

## Setup

### 1. Prerequisites

- Python 3.12+
- An [OpenRouter](https://openrouter.ai/) account and API key

### 2. Create a virtual environment

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

```bash
# Copy the example and fill in your API key
cp .env.example .env
```

Edit `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
MODEL=openai/gpt-oss-20b
```

### 5. Run the server

```bash
uvicorn app.main:app --reload
```

The API will be available at **http://localhost:8000**.

Interactive docs: **http://localhost:8000/docs**

---

## API Reference

### `GET /health`

Service health check.

```json
{ "status": "ok", "version": "1.0.0" }
```

---

### `POST /chat/start`

Create a new conversation session.

**Response `201`:**
```json
{
  "session_id": "3f2a1b4c-...",
  "message": "Hello, I'm Aria — I'm here to listen, without judgment. How have you been feeling today?"
}
```

---

### `POST /chat/message`

Send a user message.

**Request:**
```json
{
  "session_id": "3f2a1b4c-...",
  "message": "I haven't slept properly for days."
}
```

**Response `200`:**
```json
{
  "reply": "That sounds exhausting — days without proper sleep can make everything feel heavier. Is the difficulty mainly falling asleep, staying asleep, or waking up too early?",
  "follow_up": true,
  "emotion": "distressed",
  "risk_level": "moderate",
  "confidence": 0.81,
  "conversation_turn": 1
}
```

**Risk levels:** `low` | `moderate` | `high` | `crisis`  
**Emotions:** `happy` | `calm` | `anxious` | `stressed` | `sad` | `distressed` | `angry` | `hopeless` | `neutral`

---

### `GET /chat/history/{session_id}`

Retrieve full conversation history (system prompt excluded).

**Response `200`:**
```json
{
  "session_id": "3f2a1b4c-...",
  "messages": [
    { "role": "assistant", "content": "Hello, I'm Aria…" },
    { "role": "user",      "content": "I haven't slept properly for days." },
    { "role": "assistant", "content": "That sounds exhausting…" }
  ],
  "total_turns": 1
}
```

---

### `DELETE /chat/{session_id}`

Delete a session and its history.

**Response `200`:**
```json
{ "session_id": "3f2a1b4c-...", "deleted": true }
```

---

## cURL Examples

```bash
# 1. Start a session
curl -X POST http://localhost:8000/chat/start

# 2. Send a message (replace SESSION_ID)
curl -X POST http://localhost:8000/chat/message \
  -H "Content-Type: application/json" \
  -d '{"session_id": "SESSION_ID", "message": "I feel so anxious lately, I cannot sleep."}'

# 3. Get history
curl http://localhost:8000/chat/history/SESSION_ID

# 4. Delete session
curl -X DELETE http://localhost:8000/chat/SESSION_ID

# 5. Health check
curl http://localhost:8000/health
```

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | *(required)* | Your OpenRouter API key |
| `MODEL` | `openai/gpt-oss-20b` | OpenRouter model ID |
| `HTTP_TIMEOUT` | `30.0` | Request timeout in seconds |
| `HTTP_MAX_RETRIES` | `3` | Retry attempts on failure |
| `HTTP_RETRY_BASE_DELAY` | `1.0` | Exponential backoff base delay (s) |
| `MAX_HISTORY_MESSAGES` | `20` | Rolling window of messages per session |
| `CORS_ORIGINS` | `["*"]` | Allowed CORS origins |
| `LOG_LEVEL` | `INFO` | Logging level |
| `DEBUG` | `false` | FastAPI debug mode |

---

## Upgrading to Redis (future)

1. Install `redis[asyncio]` and implement a `RedisSessionStore` class with the same public method signatures as `InMemorySessionStore`.
2. In `memory.py`, update `get_session_store()` to return your `RedisSessionStore`.
3. No other code changes are required.

---

## Extending the Platform

The architecture is designed for easy extension:

| Feature | Where to add |
|---|---|
| Voice/audio analysis | New service in `services/` |
| PostgreSQL persistence | Replace `memory.py` with SQLAlchemy async store |
| Distress scoring history | Add to `ChatService.handle_message` |
| User authentication | FastAPI middleware + JWT |
| Rate limiting | `slowapi` middleware in `main.py` |
| Webhook on crisis events | Hook into `chat_service.py` crisis branch |
