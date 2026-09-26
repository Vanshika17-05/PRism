# PRism

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

## Local demo (no credentials required)

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` and sign in with:

```text
demo@prism.dev
prism-demo-2026
```

The checked-in examples default to `USE_MOCKS=true`; local `.env` files are ignored. Mock mode provides realistic repositories, findings, analytics, vector-memory badges, and file complexity values without MongoDB, GitHub, Ollama, or any paid API.

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
- `PORT`

The GitHub App requires **Pull requests: read/write**, **Contents: read**, and **Metadata: read**. Subscribe it to pull request, installation, and installation-repositories events. Point its webhook to `/api/webhooks/github`.

## API

Public:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
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
- Delivery and commit-level idempotency
- Diff size/binary/lockfile filtering and valid-line verification
- 7-day signed JWT sessions and bcrypt password hashes
- Ollama JSON mode and schema validation with no paid API calls
- Graceful degradation when the Python enrichment service is unavailable
- Parallel AI and deterministic lint analysis with explicit source attribution
- Vector suppression is limited to AI judgments; lint violations cannot be dismissed as false positives

Built by Vanshika Sambher.
