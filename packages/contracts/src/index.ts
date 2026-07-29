import { z } from "zod";

export const dataClassification = z.enum([
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
]);

export const bootstrapInput = z.object({
  organizationName: z.string().trim().min(2).max(120),
  organizationSlug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ownerEmail: z.string().trim().toLowerCase().email().max(254),
});

export const matterCreateInput = z.object({
  name: z.string().trim().min(2).max(160),
  classification: dataClassification.default("CONFIDENTIAL"),
  retentionDays: z.number().int().min(1).max(3650).default(365),
});

export const uploadIntentInput = z.object({
  matterId: z.string().cuid(),
  filename: z.string().trim().min(1).max(240),
  mediaType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(25 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  classification: dataClassification,
});

export const finalizeUploadInput = z.object({
  uploadId: z.string().uuid(),
  objectKey: z.string().min(10).max(500),
});

export const retrievalQueryInput = z.object({
  matterId: z.string().cuid(),
  query: z.string().trim().min(3).max(2000),
  documentIds: z.array(z.string().cuid()).max(50).optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

export const citation = z.object({
  documentId: z.string().cuid(),
  documentVersionId: z.string().cuid(),
  chunkId: z.string().cuid(),
  pageStart: z.number().int().min(1),
  pageEnd: z.number().int().min(1),
  quote: z.string().min(1).max(1200),
  score: z.number().min(0).max(1),
});

export const retrievalIndexInput = z.object({
  documentVersionId: z.string().cuid(),
  pages: z
    .array(
      z.object({
        page: z.number().int().min(1),
        text: z.string().max(100_000),
      }),
    )
    .min(1)
    .max(1000),
});

export const extractionInput = z.object({
  documentVersionId: z.string().cuid(),
  promptKey: z.string().trim().min(2).max(80),
  query: z.string().trim().min(3).max(1000),
});
export const extractedObligations = z.object({
  obligations: z
    .array(
      z.object({
        statement: z.string().min(1).max(1000),
        party: z.string().max(200),
        deadline: z.string().max(200).nullable(),
        evidenceIndex: z.number().int().min(0),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(100),
});
export const frameworkInput = z.object({
  name: z.string().trim().min(2).max(120),
  version: z.string().trim().min(1).max(30),
  controls: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(50),
        title: z.string().trim().min(2).max(200),
        description: z.string().max(2000),
        weight: z.number().positive().max(10).default(1),
      }),
    )
    .min(1)
    .max(500),
});
export const findingAssessmentInput = z.object({
  matterId: z.string().cuid(),
  documentVersionId: z.string().cuid(),
  frameworkId: z.string().cuid(),
  findings: z
    .array(
      z.object({
        controlCode: z.string(),
        title: z.string().min(1).max(200),
        summary: z.string().min(1).max(2000),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        confidence: z.number().min(0).max(1),
        citation,
      }),
    )
    .max(500),
});
export const suggestionInput = z.object({
  findingId: z.string().cuid(),
  proposedText: z.string().trim().min(1).max(10000),
  rationale: z.string().trim().min(1).max(2000),
  assigneeId: z.string().cuid().optional(),
});
export const reviewUpdateInput = z.object({
  expectedRevision: z.number().int().min(0),
  status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED"]),
  assigneeId: z.string().cuid().nullable().optional(),
});
export const commentInput = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const documentDiffInput = z.object({
  beforeVersionId: z.string().cuid(),
  afterVersionId: z.string().cuid(),
});
export const findingResolutionInput = z.object({
  status: z.enum(["RESOLVED", "ACCEPTED_RISK"]),
  note: z.string().trim().min(3).max(2000),
  evidenceChunkIds: z.array(z.string().cuid()).min(1).max(50),
});
export const reportFormat = z.enum(["json", "csv"]);
export const redactionInput = z.object({
  text: z.string().min(1).max(100_000),
  terms: z.array(z.string().trim().min(2).max(200)).max(100).default([]),
});

export type DataClassification = z.infer<typeof dataClassification>;
