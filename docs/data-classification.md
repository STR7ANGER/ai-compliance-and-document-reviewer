# Data-classification policy

| Level | Example | Storage and processing |
| --- | --- | --- |
| Public | Published policy | Encrypted managed stores; approved AI processing allowed |
| Internal | Procedures | Tenant-scoped stores; approved provider only |
| Confidential | Contracts | Default level; no cross-tenant cache; redacted AI request |
| Restricted | Privileged or regulated data | Provider processing denied by default; explicit policy required |

Files are encrypted in transit and at rest. Object keys are random and never include user filenames. Presigned operations expire after five minutes. Retention is set on the matter from 1–3650 days; legal hold blocks automated expiry. Audit events store identifiers and bounded metadata, not extracted document text.

Acceptance: startup fails without independent secrets; unsupported media and files above 25 MiB fail contract validation; classification downgrade fails; metrics require a separate operator token; Compose validates; migrations apply to an empty pgvector PostgreSQL database; and health responses disclose no credentials or topology.
