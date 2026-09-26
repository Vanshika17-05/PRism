# PRism

PRism is a GitHub App that reviews pull requests with a locally hosted coding model. GitHub sends signed webhooks, PRism validates and filters the diff, asks Ollama for structured findings, validates every inline comment against real changed lines, and posts a native GitHub review. The dashboard read API exposes review history and repository analytics.

The default architecture uses only free and local components. Ollama runs on your machine, MongoDB Community Edition stores data locally, and GitHub App API access has no usage charge. No OpenAI, Gemini, Stripe, AWS, Redis, or other paid API is used.

```text
GitHub Pull Request
        |
        | signed webhook
        v
Express API -----> MongoDB Community
    |                  |
    | fetch diff       | reviews + stats
    v                  v
GitHub API       Dashboard read API
    |
    | filtered, chunked diff
    v
Local Ollama (qwen2.5-coder)
    |
    | validated findings only
    v
GitHub Pull Request Review
```

## Safety and reliability

- Raw-body HMAC SHA-256 webhook verification with timing-safe comparison
- Idempotency by GitHub delivery ID and repository/PR/head SHA
- Immediate `202` webhook acknowledgement and contained background processing
- File filtering, prompt injection resistance, bounded batches, schema validation, and diff-line validation
- Private keys and webhook signatures redacted from structured logs
- Retry fallback when GitHub rejects an inline line comment
- Indexed, aggregated MongoDB dashboard queries

## Zero-charge local development

Install Node.js 22+, MongoDB Community Edition, and [Ollama](https://ollama.com). Pull the local coding model:

```bash
ollama pull qwen2.5-coder:7b
```

The model download uses disk space and local compute but has no API fee. Keep PRism local or self-host it on hardware you control to guarantee zero hosting charges.

Docker users can start MongoDB, Ollama, and the API with `docker compose up --build`. After the first start, run `docker compose exec ollama ollama pull qwen2.5-coder:7b` once.

### Create the GitHub App

1. Open GitHub **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Set the webhook URL to your smee.io proxy URL during development.
3. Create a strong webhook secret.
4. Repository permissions: **Pull requests: Read & write**, **Contents: Read**, **Metadata: Read**.
5. Subscribe to **Pull request**, **Installation**, and **Installation repositories** events.
6. Generate and download the private key. GitHub App/API access is free, subject to rate limits.

### Configure and run

```bash
cp server/.env.example server/.env
npm install
npm run dev
```

Put the private key in `GITHUB_APP_PRIVATE_KEY` with newlines written as `\n`. Start a free smee proxy:

```bash
npx smee-client --url https://smee.io/YOUR_CHANNEL --target http://localhost:4100/api/webhooks/github
```

## API

- `GET /api/health`
- `POST /api/webhooks/github`
- `GET /api/reviews?repo=&status=&page=`
- `GET /api/reviews/:id`
- `GET /api/repos`
- `GET /api/repos/:id/stats`

## Phase 1 verification

Health check:

```bash
curl http://localhost:4100/api/health
```

Bad signatures must return `401`:

```bash
curl -i -X POST http://localhost:4100/api/webhooks/github -H "Content-Type: application/json" -H "X-GitHub-Event: ping" -H "X-GitHub-Delivery: local-bad-signature" -H "X-Hub-Signature-256: sha256=bad" --data '{}'
```

Create a valid signature and send a safely ignored ping payload:

```bash
node -e "const c=require('node:crypto');const b='{}';console.log('sha256='+c.createHmac('sha256',process.env.GITHUB_WEBHOOK_SECRET).update(b).digest('hex'))"
curl -i -X POST http://localhost:4100/api/webhooks/github -H "Content-Type: application/json" -H "X-GitHub-Event: ping" -H "X-GitHub-Delivery: local-ping-1" -H "X-Hub-Signature-256: PASTE_SIGNATURE" --data '{}'
```
