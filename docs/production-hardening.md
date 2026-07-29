# Production hardening

- Redaction masks email addresses, likely credentials, long payment-style numbers, and reviewer-supplied terms before downstream use.
- Document deletion is administrator-only, blocked by legal hold, audited, removes vectors, and deletes every stored version object.
- API requests use a fixed-window limiter keyed by a one-way digest; raw credentials are never retained.
- Prometheus metrics expose HTTP outcomes, AI input/output tokens, exports, deletion, and redaction without document text or secrets.
- The web UI includes a keyboard skip link, visible focus treatment, live status regions, semantic labels, and reduced-motion behavior.

Operational metrics require the operator bearer token at `/internal/metrics`. Alerts should cover sustained 5xx responses, rate-limit saturation, model failures, dead-letter jobs, and token-budget anomalies.
