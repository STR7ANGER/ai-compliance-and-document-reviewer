# Grounded retrieval

Ready document versions are split into deterministic, page-bounded chunks and embedded with the replaceable local hash embedder. PostgreSQL/pgvector stores vectors and performs cosine search under mandatory organization and matter filters. API responses expose citations created only from stored chunks, including document version, page range, quote, and normalized score.

`evaluateRetrieval` reports recall@k, mean reciprocal rank, and page-citation accuracy for golden datasets. Run `npm test -- retrieval.test.ts` for the reviewable demo and failure cases.
