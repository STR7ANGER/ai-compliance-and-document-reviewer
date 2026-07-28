# AI Compliance and Document Reviewer — 30-Task Execution Plan

Complete tasks in order unless a dependency is explicitly removed. Each day has 10 active tasks; unfinished work rolls forward before later tasks begin. Keep at most 10 task checkboxes marked `[~]` (in progress) at once; use `[x]` only after verification.

## Day 1 — Foundation and first vertical slice (Tasks 1–10)

- [x] 1. Design workspace, storage, databases, Docker, CI, and data-classification policy; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [x] 2. Implement workspace, storage, databases, Docker, CI, and data-classification policy; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [x] 3. Verify workspace, storage, databases, Docker, CI, and data-classification policy with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [x] 4. Design auth, organizations, matters, RBAC, retention, and audit logs; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [x] 5. Implement auth, organizations, matters, RBAC, retention, and audit logs; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [x] 6. Verify auth, organizations, matters, RBAC, retention, and audit logs with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [x] 7. Design upload, malware boundary, parsing/OCR pipeline, and document viewer; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [x] 8. Implement upload, malware boundary, parsing/OCR pipeline, and document viewer; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [x] 9. Verify upload, malware boundary, parsing/OCR pipeline, and document viewer with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [x] 10. Design chunking, embeddings, pgvector search, citations, and retrieval evaluation; write acceptance criteria, contracts, risks, and the smallest vertical slice.

## Day 2 — Core workflows and integrations (Tasks 11–20)

- [x] 11. Implement chunking, embeddings, pgvector search, citations, and retrieval evaluation; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [x] 12. Verify chunking, embeddings, pgvector search, citations, and retrieval evaluation with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 13. Design Gemini structured extraction, grounding constraints, and prompt/version registry; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 14. Implement Gemini structured extraction, grounding constraints, and prompt/version registry; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 15. Verify Gemini structured extraction, grounding constraints, and prompt/version registry with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 16. Design framework/control library, mappings, scoring, and findings dashboard; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 17. Implement framework/control library, mappings, scoring, and findings dashboard; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 18. Verify framework/control library, mappings, scoring, and findings dashboard with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 19. Design revision suggestions, human review, comments, assignment, and statuses; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 20. Implement revision suggestions, human review, comments, assignment, and statuses; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.

## Day 3 — Advanced behavior and production hardening (Tasks 21–30)

- [ ] 21. Verify revision suggestions, human review, comments, assignment, and statuses with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 22. Design document diff, finding resolution, evidence links, and report export; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 23. Implement document diff, finding resolution, evidence links, and report export; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 24. Verify document diff, finding resolution, evidence links, and report export with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 25. Design redaction, deletion, rate limits, observability, cost metrics, and accessibility; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 26. Implement redaction, deletion, rate limits, observability, cost metrics, and accessibility; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 27. Verify redaction, deletion, rate limits, observability, cost metrics, and accessibility with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 28. Design golden-dataset tests, hallucination review, E2E flow, and deployment docs; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 29. Implement golden-dataset tests, hallucination review, E2E flow, and deployment docs; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 30. Verify golden-dataset tests, hallucination review, E2E flow, and deployment docs with tests, failure cases, telemetry, documentation, and a reviewable demo.

## Task completion checklist

A task is complete only when code is formatted and typed, tests pass, migrations are reproducible, UI states are handled, authorization is enforced, logs contain no secrets, and relevant docs are updated. Track blockers beneath the task instead of silently widening scope.
