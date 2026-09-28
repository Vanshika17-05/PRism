# PRism production deployment

PRism uses one public Vercel origin while keeping its stateful workloads on
Render:

- `client/`: Vercel static Vite project.
- `prism-api`: Render web service using `server/Dockerfile`.
- `prism-worker`: Render background worker using `server/Dockerfile.worker`.
- `prism-python`: Render web service using `python-service/Dockerfile`.
- MongoDB Atlas: application database.
- Upstash Redis: BullMQ, sessions, and API rate limits.

## 1. Create the data services

Create an Atlas M0 database user with a unique generated password. Prefer
allowlisting Render's published outbound ranges. For a portfolio deployment,
`0.0.0.0/0` is an acceptable documented compromise only when the database
password is strong, TLS remains enabled, and the database user has access only
to the PRism database.

Create an Upstash Redis database with TLS. Copy its `rediss://` endpoint for
`REDIS_URL`. BullMQ requires this standard Redis protocol endpoint; the REST
URL/token are only needed by the independently deployed badge service.

## 2. Deploy Render services

Create a Render Blueprint from `render.yaml`. It creates `prism-api`,
`prism-worker`, and `prism-python`. Enter secrets only in Render's Environment
UI. Values marked `sync: false` are deliberately absent from source control.

Set the following on both `prism-api` and `prism-worker`:

- `MONGODB_URI`, `REDIS_URL`, `PYTHON_SERVICE_URL`
- `JWT_SECRET`
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`
- `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG`
- Provider keys/models only for providers intentionally enabled
- AWS variables only when `USE_S3=true`

Set `PYTHON_SERVICE_URL` to the public HTTPS URL of `prism-python`. Set
`CLIENT_URL` and `APP_URL` to the exact production Vercel origin, with no
trailing slash. Production CORS accepts only `CLIENT_URL`.

Render background workers are not available on every free plan. Confirm the
selected plan before deployment; never enter payment details or select a paid
plan unintentionally.

## 3. Deploy the Vercel frontend

Import the GitHub repository into Vercel and choose `client` as the Root
Directory. `client/vercel.json` builds the workspace package and proxies
`/api/*` to `https://prism-api.onrender.com`.

For the one-domain proxy design, leave `VITE_API_URL` unset in Production so
the Axios client uses same-origin `/api` requests. Setting it to the Render URL
would bypass the proxy and expose a second browser-facing origin. It may be set
on a local or preview environment when intentionally testing an API directly.

If Render assigns an API hostname other than `prism-api.onrender.com`, update
only the rewrite destination in `client/vercel.json` and redeploy.

## 4. Rotate and install secrets

Create fresh values at deployment time. Do not reuse anything previously
shown in chat, screenshots, terminal recordings, or local configuration.

```sh
openssl rand -hex 32       # GITHUB_WEBHOOK_SECRET
openssl rand -base64 48    # JWT_SECRET
```

Rotate provider keys in their respective vendor consoles. Generate a new
GitHub App client secret. Put the webhook secret in both GitHub App settings
and the Render API/worker environment exactly as generated. Never paste secret
values into an issue, commit, build argument, or Vercel client variable—every
`VITE_*` variable is public in the browser bundle.

## 5. Update the GitHub App

- Homepage URL: the Vercel production origin.
- Callback URL: `https://YOUR-PROJECT.vercel.app/api/auth/github/callback`.
- Setup URL: `https://YOUR-PROJECT.vercel.app/dashboard/repos?installed=true`.
- Webhook URL: `https://YOUR-PROJECT.vercel.app/api/webhooks/github`.
- Webhook secret: the newly rotated value also installed on Render.

Keep localhost callback URLs only when GitHub permits the required additional
URL and local OAuth testing is still needed.

## 6. End-to-end verification

1. Open the Vercel URL and sign in with GitHub.
2. Connect a dedicated test repository.
3. Confirm the installation webhook creates the repository in PRism.
4. Open a PR containing a harmless test issue.
5. Confirm Render receives the webhook, BullMQ hands it to `prism-worker`, and
   a review is posted to the PR.
6. Check that `/api/health` works through Vercel and that a browser request
   from an unrelated origin does not receive an allowed CORS header.

Do not claim this test passed until all three Render services and the Vercel
project are deployed with real account credentials.
