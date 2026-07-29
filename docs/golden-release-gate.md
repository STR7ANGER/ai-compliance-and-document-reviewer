# Golden dataset and hallucination gate

`testdata/retrieval-golden.json` is a small, reviewable release fixture. CI requires recall@3 ≥ 0.95, mean reciprocal rank ≥ 0.8, and page accuracy = 1. Structured extraction separately computes a grounding score and rejects any obligation whose evidence index was not returned by tenant-scoped retrieval. Human reviewers must inspect fixture changes and all rejected model outputs before thresholds are adjusted.

The production smoke command validates the public health contract after deployment. The manual release flow then covers upload, quarantine, parsing, vector indexing, grounded extraction, finding creation, review approval, resolution evidence, export, and deletion/legal-hold behavior.
