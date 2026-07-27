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

export type DataClassification = z.infer<typeof dataClassification>;
