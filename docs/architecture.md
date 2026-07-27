# Architecture and data boundaries

The application is a modular monorepo with separately deployable Next.js web, Hono control API, and Go document processor. PostgreSQL is authoritative for organizations, matters, document metadata, jobs, retention, and audits. Object storage holds immutable quarantined binaries. MongoDB will hold parsed page structure. Redis coordinates bounded background work. Provider calls are adapters behind domain interfaces.

Every tenant-owned query begins with the authenticated organization ID. Uploads land only in a quarantine prefix and cannot be parsed or viewed before malware clearance. No raw document bytes, credentials, bearer headers, or extracted text enter application logs or metric labels.

Classification ordering is `PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED`. Data may move only to an equal or stronger destination. Restricted data cannot be sent to AI providers unless an organization policy explicitly allows it; the default is deny. Legal hold overrides expiration and deletion. Database metadata, object bytes, parsed structures, and later vector records share document/version IDs for deletion and audit reconciliation.
