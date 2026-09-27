# PRism

[![CI](https://github.com/Vanshika17-05/PRism/actions/workflows/ci.yml/badge.svg)](https://github.com/Vanshika17-05/PRism/actions/workflows/ci.yml)

PRism is a portfolio-grade AI pull-request reviewer. A GitHub App receives signed webhook events, Node orchestrates GitHub and free local Ollama review, a Python intelligence service adds vector memory and deterministic code metrics, and a claymorphism React dashboard turns the results into engineering signals.

## Architecture

```text
GitHub webhook -> Express orchestration -> local Ollama structured review
                       |                         |
                       +-> FastAPI/Chroma -------+-> validated GitHub review
                               |
                         Radon + JS/TS metrics

MongoDB <- repositories, users, reviews -> React dashboard
```

Node owns authentication, GitHub App integration, Ollama calls, persistence, API orchestration, and ESLint analysis for JavaScript/TypeScript. Python deliberately owns local vector similarity and Python static metrics: Chroma remembers related findings and learned non-issues; Radon measures complexity and Pyflakes reports deterministic errors. Python enrichment is optional at runtime—if it is unavailable, the GitHub review still completes.

## Run with Docker (recommended)

```bash
docker compose up --build
```

The stack starts MongoDB, Redis, Ollama, the Python intelligence service, the Node API, the Vite client, and the Next.js badge service. Open `http://localhost:4100` for the unified production-style app, `http://localhost:5173` for the standalone client, and `http://localhost:3000/api/badge/<repoId>.svg` for badges. Persistent Docker volumes retain Mongo data, Redis jobs, Chroma memory, SQLite analytics, raw diffs, and reports.

## Run locally from one link

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
pnpm start
```

Open `http://localhost:4100`. Express serves both the compiled React application and `/api` from this single origin. Configure `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, and set the OAuth callback URL to `http://localhost:4100/api/auth/github/callback`. If these credentials are absent, the login page clearly reports that GitHub sign-in is not configured; there is no fake password fallback.

The checked-in examples default to `USE_MOCKS=true`; local `.env` files are ignored. Mock infrastructure mode provides realistic repository and review data, while authentication still uses real GitHub OAuth.

Health check:

```bash
curl http://localhost:4100/api/health
```

## Run the Python intelligence service

```bash
cd python-service
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8100
```

Review memory always uses deterministic local embeddings, so it cannot incur API charges. Chroma data persists under `python-service/data/chroma` by default.

## Real-time review progress

The queue worker publishes `review:started`, `review:analyzing`, `review:completed`, and `review:failed` through authenticated Socket.io repository rooms. Review History and Review Detail display the current file count and path while work is running.

## Provider-agnostic AI

Each repository can select OpenAI, Gemini, or Claude. All strategies normalize to the same review contract. OpenAI mode uses local Ollama when `OPENAI_API_KEY` is absent, so the default setup remains free and cannot make a paid API request. Gemini and Claude require their corresponding keys before they can be selected successfully.

## Reporting, SQL, and object storage

MongoDB remains the source of truth. Completed reviews additionally write flattened rows to SQLite with parameterized SQL for time-series CSV/PDF reporting. Full raw diffs and generated PDFs are stored in S3 when `USE_S3=true`; otherwise they use persistent local disk. S3 report downloads use five-minute signed URLs.

## Suggest-fix agent

An AI finding can run a small agent loop: fetch the current file from GitHub, propose a unified diff, validate that it applies cleanly, and then—only after user confirmation—post a GitHub suggested-change comment. This fetch → propose → validate → act boundary is intentionally more than a single prompt call.

## PRism Score badge

`badge-service/` is an independent Next.js service. Embed a repository score with:

```markdown
![PRism Score](https://YOUR-BADGE-SERVICE.vercel.app/api/badge/REPOSITORY_ID.svg)
```

## Deployment

- Vite React client → Vercel (`client/`).
- Next.js badge service → a separate Vercel project (`badge-service/`).
- Node server and Python intelligence service → Render.
- Redis → Upstash Redis free tier or another Redis-compatible provider.
- MongoDB → Atlas free tier.
- Optional raw-diff/report storage → AWS S3; keep `USE_S3=false` for the free local-disk fallback.

Set `APP_URL`, `CLIENT_URL`, and `PRISM_API_URL` to the deployed URLs. Actual public URLs should replace the placeholders after the corresponding Vercel and Render projects are connected; no paid resource is created automatically by this repository.

## Live integration configuration

Copy `server/.env.example` to `server/.env`, set `USE_MOCKS=false`, and configure:

- `MONGODB_URI`
- `JWT_SECRET`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL` (defaults to `qwen2.5-coder:7b`)
- `PYTHON_SERVICE_URL`
- `REDIS_URL` (local Redis or a Redis Cloud free-tier URL)
- `REVIEW_CONCURRENCY` (defaults to `2`)
- `CLIENT_URL`
- `APP_URL` (the single public origin, such as `http://localhost:4100`)
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `PORT`

The GitHub App requires **Pull requests: read/write**, **Contents: read**, and **Metadata: read**. Subscribe it to pull request, installation, and installation-repositories events. Point its webhook to `/api/webhooks/github`.

## API

Public:

- `GET /api/health`
- `GET /api/auth/config`
- `GET /api/auth/github`
- `GET /api/auth/github/callback`
- `POST /api/webhooks/github`

JWT protected:

- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/reviews`
- `GET /api/reviews/:id`
- `PATCH /api/reviews/:id/findings/:findingId/dismiss`
- `GET /api/repos`
- `GET /api/repos/:id/stats`
- `PATCH /api/repos/:id/settings`
- `GET /api/failed-reviews`
- `POST /api/failed-reviews/:id/retry`
- `DELETE /api/failed-reviews/:id`
- `GET /api/metrics`

Python service:

- `GET /health`
- `POST /embed-and-search`
- `POST /complexity`
- `POST /lint`

## Verification

```bash
pnpm --filter @prism/server test
pnpm --filter @prism/client build
```

Docker Compose is optional and starts MongoDB, Redis, Ollama, the API, and the Python service. Without Docker, install Redis locally or use a Redis Cloud free-tier database and set `REDIS_URL`. Mock mode uses an in-memory queue so the dashboard remains usable without Redis. GitHub App credentials are required for live PR review, but no paid AI API is used.

## Security and reliability

- Raw-body HMAC SHA-256 webhook verification with timing-safe comparison
- Immediate `202` acknowledgement with a BullMQ/Redis review queue
- Three exponential-backoff attempts, MongoDB dead-letter storage, and dashboard retry/dismiss controls
- Configurable worker concurrency and token-bucket limits around GitHub and local-AI calls
- AsyncLocalStorage request IDs across webhook, queue worker, API, and structured logs
- Per-repository monthly token budgets with deterministic-only fallback
- Isolated manifest-only dependency auditing for changed npm lockfiles
- Delivery and commit-level idempotency
- Diff size/binary/lockfile filtering and valid-line verification
- GitHub OAuth with CSRF state validation and 7-day JWTs in HTTP-only cookies
- Ollama JSON mode and schema validation with no paid API calls
- Graceful degradation when the Python enrichment service is unavailable
- Parallel AI and deterministic lint analysis with explicit source attribution
- Vector suppression is limited to AI judgments; lint violations cannot be dismissed as false positives

Built by Vanshika Sambher.
