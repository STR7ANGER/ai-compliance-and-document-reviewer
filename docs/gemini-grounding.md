# Gemini extraction boundary

Extraction retrieves tenant-scoped evidence first, sends only non-restricted excerpts, requests structured JSON, validates it with Zod, and rejects every evidence index not present in retrieval results. Each run records model and immutable prompt version; telemetry never includes prompts or document text. Configure `GEMINI_API_KEY` to enable the production adapter.
