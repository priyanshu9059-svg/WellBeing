# WellBeing backend

`src/` contains the Express API, `prisma/` the PostgreSQL schema, `aria-bot/` the chatbot, and `ml-service/` the inference service. Render deploys them through the repository's [`render.yaml`](../render.yaml).

## Local API without Docker

Use Node.js 22.13+ and a local PostgreSQL database. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.

```bash
npm ci
npm run db:setup
npm run dev
```

Run the frontend from `../Frontend` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`. `GET /api/health` checks the API. The Aria and ML services are optional for local development; the API has fallback responses when they are unavailable. To run them locally, follow the README and requirements file in each Python service folder, then set `ARIA_BASE_URL` and `ML_BASE_URL` in `.env`.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Session signing secret |
| `FRONTEND_URL` | Exact Vercel origin allowed by CORS |
| `PORT` | API listen port; Render sets this |
| `UPLOAD_DIR` | Directory for voice and chat recordings |
| `ARIA_BASE_URL` | Aria service URL or Render private `host:port` |
| `ML_BASE_URL` | ML service URL or Render private `host:port` |
| `OPENAI_API_KEY` | Optional API reply provider |
| `NOTIFICATION_MODE` | `log` or `live` |

Additional optional variables are listed in [`.env.example`](.env.example). `npm run db:seed` is for disposable local data only: it deletes existing records and installs demo credentials. Never run it against a production database.
