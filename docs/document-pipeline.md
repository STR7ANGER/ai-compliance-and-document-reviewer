# Quarantine, malware scanning, parsing, and viewing

The browser requests a five-minute upload intent after shared validation and RBAC. The API creates a random object key under `quarantine/<organization>/<uuid>` and signs a size-, type-, and checksum-bound PUT. User filenames never become object keys.

Finalization consumes the reservation exactly once and transactionally creates document/version metadata plus a processing job. The Go worker checks media magic, invokes the malware scanner before parsing, rejects infected or mismatched bytes, parses pages, and delegates image-only pages to an OCR capability. Retries use the durable job record; repeated terminal failures move to dead letter.

Documents remain `QUARANTINED`, `SCANNING`, or `PROCESSING` until each boundary succeeds. Only `READY` documents receive a short-lived inline download URL. Viewer queries are organization scoped and never expose quarantine keys. Parsed page structure belongs in MongoDB keyed by document version; PostgreSQL stores lifecycle metadata.

Acceptance covers unsupported type/size, classification downgrade, expired/reused reservations, malware, wrong magic bytes, OCR fallback, cross-tenant lookup, viewer upload denial, and absence of download URLs before readiness.
