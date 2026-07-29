# Citewise AI Compliance Reviewer

A service-oriented TypeScript/Go workspace for secure document intake, grounded Gemini extraction, compliance findings, and evidence-backed human review.

## Local development

```sh
cp .env.example .env
docker compose up -d
npm ci
npm run db:generate
npm run db:migrate
npm run check
npm run dev:api
```

The Next.js frontend is separate from the Hono API. PostgreSQL/pgvector stores transactional and retrieval data; MongoDB, Redis, and S3-compatible storage are independently configured boundaries. See [architecture](docs/architecture.md), [security hardening](docs/production-hardening.md), and the [deployment runbook](docs/deployment.md).
