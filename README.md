# Wellbeing Support

Full-stack mental wellbeing support app: React/Vinext frontend, Express API, and Prisma/SQLite database. Anonymous access by default, with a professional care portal and organization codes.

## Quick start

Requirements: Node.js 22.13+.

```bash
# 1) Frontend deps
npm install

# 2) Backend + database
cd backend
npm install
npm run db:setup
npm run dev
```

In another terminal:

```bash
# from repo root — uses .env.local pointing at http://localhost:4000
npm run dev
```

Open `http://localhost:3000`. API health: `http://localhost:4000/api/health`.

### Docker (API + DB)

```bash
docker compose up --build
```

Then run the frontend with `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`.

## Demo credentials

| Role | Value |
|---|---|
| Professional login | `demo@wellbeing.care` / `prototype` |
| Org codes | `CAMPUS-DEMO`, `TEAM-CARE` |

Optional: set `OPENAI_API_KEY` in `backend/.env` for live chat replies (otherwise supportive heuristic replies are used).

## Architecture

| Layer | Path | Stack |
|---|---|---|
| Frontend | `app/`, `features/`, `components/` | React 19, Vinext, Tailwind |
| API client | `services/`, `lib/api.ts` | Typed services; auto anonymous session |
| Backend | `backend/src/` | Express 5, JWT auth, Zod validation |
| Database | `backend/prisma/` | Prisma + SQLite (`dev.db`) |

### Main API routes

- `POST /api/auth/anonymous|signin|signup`, `GET /api/auth/me`
- `GET|POST|DELETE /api/chat/*`
- `GET|POST /api/mood`, `GET|POST|PUT|DELETE /api/journal`
- `GET|PUT /api/safety-plan`, `GET|PUT /api/profile/consent`
- `POST /api/wellbeing/analyze`, voice + risk endpoints
- `GET /api/care/places`, appointments CRUD
- `GET /api/professional/dashboard` (+ query reply/resolve)
- `POST /api/counsellor/request`, notifications, analytics, emergency resources
- `POST /api/organizations/validate`, aggregates

Without `NEXT_PUBLIC_API_BASE_URL`, the UI falls back to local mocks/`localStorage`.

## Routes (frontend)

`/`, `/support`, `/chat`, `/mood`, `/journal`, `/exercises`, `/wellbeing`, `/consultancy`, `/professional`, `/safety-plan`, `/crisis`, `/privacy`, `/settings`, `/access-code`, `/organization-demo`, `/trust`, `/about`, `/faq`, `/offline`.

## Safety and scope

- Keyword risk screening is a demonstration and needs clinical validation before production.
- Phone links require an explicit click; nothing auto-dispatches emergency help.
- Clinical screeners (PHQ-9/GAD-7) remain disabled until approved.
- Notifications default to server logging (`NOTIFICATION_MODE=log`) until a real SMS/email provider is configured.

## Documentation

- [Feature status](docs/FEATURE_STATUS.md)
- [Backend integration map](docs/BACKEND_INTEGRATION.md)
- [Project logs](docs/PROJECT_LOGS.md)
