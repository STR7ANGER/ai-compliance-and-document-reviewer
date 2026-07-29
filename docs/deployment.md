# Deployment runbook

## Topology

Deploy `apps/web` as a Vercel Next.js project and the root `Dockerfile` as a persistent API/worker service. Set `NEXT_PUBLIC_API_URL` on Vercel to the public API origin and set `WEB_URL` on the API to the Vercel production origin. Vercel's monorepo setup requires selecting the app root directory; shared workspace sources outside that directory must remain enabled. See the [official Vercel monorepo guide](https://vercel.com/docs/monorepos).

## Data services

1. Create Neon Postgres and use its direct connection for `prisma migrate deploy`; use the pooled runtime URL for the deployed API where supported. The first migration enables `vector`, so verify the database role can create the extension. Neon documents the direct-versus-pooled Prisma distinction in its [connection pooling guidance](https://neon.com/docs/changelog/2023-02-06).
2. Create MongoDB Atlas, create a least-privilege database user, and set `MONGODB_URL`. Atlas accepts clients only from its project IP access list; prefer private networking or the narrowest application egress range. See [Atlas connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).
3. Provision managed Redis and S3-compatible private object storage. Use separate credentials per environment and lifecycle rules matching matter retention.

## Release

1. Copy `.env.example` into each secret manager; generate independent high-entropy values and never expose API secrets through `NEXT_PUBLIC_*` variables.
2. Run `npm ci && npm run check && npm run build && npm audit --audit-level=high`.
3. Run `DATABASE_URL="$DIRECT_DATABASE_URL" npx prisma migrate deploy` once from a controlled release job.
4. Deploy the API image, then deploy the Vercel web project with root directory `apps/web`.
5. Run `BASE_URL=https://api.example.com npm run smoke`, verify `/internal/metrics` with the operator token, and exercise upload → scan → index → extract → finding → review → export with a non-production fixture.

Rollback the application image independently. Never roll back destructive database migrations; deploy a forward-compatible corrective migration instead.
