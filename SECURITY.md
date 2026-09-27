# PRism Security Operations

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Contact the repository owner privately with reproduction steps, impact, and the affected commit. Never include live credentials or customer source code.

## GitHub App private-key rotation

1. In the GitHub App settings, generate a second private key. GitHub allows the old and new keys to coexist.
2. Store the new PEM in the deployment secret manager and update `GITHUB_APP_PRIVATE_KEY` without committing it.
3. Restart or roll the API/worker instances one at a time so queued work continues on the remaining instances.
4. Trigger a test pull request and confirm installation authentication, file reads, and review posting work with the new key.
5. Revoke the old key in GitHub only after the new deployment is confirmed. Remove its secret-manager version according to the organization's retention policy.

This sequence provides no-downtime private-key rotation because both keys remain valid during the rollout.

## Webhook-secret rotation

PRism currently accepts one `GITHUB_WEBHOOK_SECRET`. GitHub also exposes one active webhook secret, so changing it can briefly cause signature failures while the two systems roll over.

For the shortest interruption, prepare the new deployment first, change the GitHub App webhook secret, immediately update the deployment secret, and restart the API. Watch 401 responses and redeliver any failed GitHub deliveries after the new secret is active.

True zero-downtime rotation requires a future dual-secret window: configure old and new secrets, accept a signature matching either, rotate GitHub, then remove the old secret. This is a documented known limitation rather than an implied guarantee.

## General secret handling

- Keep `.env` files out of version control and use a secret manager in production.
- Rotate `JWT_SECRET` with a planned session invalidation, because changing it signs out existing sessions.
- Restrict Redis and MongoDB to private networks with authentication and TLS in hosted deployments.
- Review dependency-audit findings before merging and keep base container images patched.
