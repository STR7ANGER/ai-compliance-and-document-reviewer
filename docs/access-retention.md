# Access, matters, retention, and audit

Bootstrap is a one-time operator-authorized route that creates an organization owner and returns a random API key once. Only its SHA-256 peppered digest is stored. Authentication derives organization and role from the key; callers never supply organization IDs.

Owners and administrators can read audits and run retention sweeps. Reviewers can create matters and later upload documents. Viewers are read-only. Matters define classification and retention; document expiry is calculated when a version is accepted. Legal hold always wins over retention and sweep queries enforce it transactionally.

Audit records contain actor, action, target identifiers, timestamps, and bounded metadata—never API keys or document text. Acceptance tests cover invalid authentication, viewer denial, organization scoping, admin-only audits, matter conflicts, and legal-hold-safe retention behavior.
