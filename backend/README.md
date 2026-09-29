# WellBeing API

Express + Prisma + SQLite backend for the WellBeing Support app.

## Setup

```bash
npm install
cp .env.example .env   # if needed
npm run db:setup
npm run dev
```

Listens on `http://localhost:4000`.

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma SQLite path (`file:./dev.db`) |
| `JWT_SECRET` | JWT signing secret |
| `PORT` | HTTP port (default 4000) |
| `CORS_ORIGIN` | Additional allowed frontend origins, comma separated |
| `FRONTEND_URL` | Deployed frontend origin, for example `https://your-project.vercel.app` (no trailing path) |
| `OPENAI_API_KEY` | Optional live chat replies |
| `NOTIFICATION_MODE` | `log` (default) or provider hook |

## Seed accounts

- Professional: `demo@wellbeing.care` / `prototype`
- Org codes: `CAMPUS-DEMO`, `TEAM-CARE`
