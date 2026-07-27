# ADR 001: Tenant-safe retrieval and page citations

Status: accepted for Tasks 11–12.

## Decision

Chunk normalized page text deterministically after parsing. Target roughly 800 tokens with 120-token overlap, but never merge across document versions or classification boundaries. Each chunk stores organization, matter, document, version, stable ordinal, page range, normalized-text checksum, text, embedding-model version, and a fixed-dimension pgvector value. PostgreSQL remains authoritative; parsed page geometry stays in MongoDB.

Retrieval always starts with authenticated `organizationId` and required `matterId`, optionally narrows to at most 50 document IDs, and returns at most 20 candidates. Use vector similarity to gather candidates, then deterministic lexical/risk boosts to rerank. SQL must apply tenant and matter predicates before ordering by distance. Cache keys include organization, matter, document-version checksums, embedding version, and normalized query hash.

Every result includes a page-addressable citation with document/version/chunk IDs, page start/end, a bounded verbatim quote, and normalized score. The API rejects generated claims without at least one retrieved citation. Quotes are sliced only from stored chunk text; model-supplied quotes are never trusted.

## Evaluation and acceptance

The smallest slice indexes the two golden clauses in `tests/fixtures/retrieval-golden.json`, searches within one matter, and renders a citation that opens the correct page. On the committed golden set, recall@5 must be at least 0.90, mean reciprocal rank at least 0.80, citation page accuracy 1.00, and cross-tenant recall exactly 0. Evaluation records embedding/prompt versions and fails closed on vector dimension mismatch.

Tests must cover repeated headers, tables crossing pages, OCR noise, deleted/expired versions, document filters, classification isolation, empty queries, embedding timeout, stale cache invalidation, and adversarial instructions embedded in documents.

## Risks and controls

- Prompt injection: retrieved text is evidence, never system instruction; delimit and label it as untrusted.
- Leakage: tenant/matter predicates are mandatory repository inputs and integration-tested with identical text in two tenants.
- Citation drift: chunks bind immutable document-version checksum and pages.
- Cost and latency: deduplicate by normalized-text checksum, batch embeddings, cap candidates, and record tokens/latency without text labels.
- Model changes: registry pins provider, model, dimension, normalization, and created time; reindex into a new version before switching reads.
