# WellBeing Support

The project is split into two deployable folders:

| Folder | Deploy to | Contents |
| --- | --- | --- |
| [`Frontend/`](Frontend/) | Vercel | Next.js pages, components, styles, public assets, and API client |
| [`Backend/`](Backend/) | Render | Express API, Prisma database schema, Aria chatbot, and ML service |

## Deploy

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, import the repository. Set **Root Directory** to `Frontend`, and keep the detected **Next.js** framework and default build settings. The first deployment can use local mock mode; copy its final Vercel origin.
3. In Render, create a **Blueprint** from the same repository. Render reads [`render.yaml`](render.yaml) at the repository root and creates the API, PostgreSQL database, private Aria service, private ML service, and persistent upload storage. The configured API and private services use paid `starter` instances; check Render's current pricing before approving the Blueprint.
4. During Blueprint setup, enter `FRONTEND_URL` as the Vercel origin (for example, `https://your-project.vercel.app`) and `OPENROUTER_API_KEY` for Aria.
5. In Vercel project environment variables, set `NEXT_PUBLIC_API_BASE_URL` to the Render API origin (for example, `https://your-api.onrender.com`) and `NEXT_PUBLIC_SITE_URL` to the Vercel origin. Redeploy after setting them. The API URL must be available at build time.
6. Confirm `https://your-api.onrender.com/api/health` responds, then test a frontend action that saves data. Set or update Render's `FRONTEND_URL` to the exact Vercel origin if browser API requests are blocked by CORS.

Do not include `/api` or a trailing slash in `NEXT_PUBLIC_API_BASE_URL`. The frontend appends route paths itself. `FRONTEND_URL` is also an origin without a path. Production database tables are created on API startup by Prisma; demo seed accounts are **not** loaded automatically. The old local SQLite file is not migrated to PostgreSQL by this deployment.

The chatbot requires an OpenRouter key for its private Render service. Optional integrations such as live email, OpenAI replies, and ABHA use the variables listed in [`Backend/.env.example`](Backend/.env.example). Uploads use Render's persistent disk at `/var/data/uploads`.

## Run locally

Start PostgreSQL and the API with Docker:

```bash
docker compose up --build
```

In another terminal, start the frontend:

```bash
cd Frontend
npm ci
```

Copy `Frontend/.env.example` to `Frontend/.env.local`, then run:

```bash
npm run dev
```

Open `http://localhost:3000`; the API health endpoint is `http://localhost:4000/api/health`. The Docker setup disables Aria and uses the API's built-in chat fallback. To run all services locally, see [`Backend/README.md`](Backend/README.md).

The app provides mental wellbeing support, not clinical diagnosis. Its risk screening is a demonstration and needs clinical validation before production use.
