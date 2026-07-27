import { prisma } from "../../db.js";
import type { DocumentRepository } from "./service.js";

const level = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
} as const;
export class PrismaDocumentRepository implements DocumentRepository {
  async reserve(input: Parameters<DocumentRepository["reserve"]>[0]) {
    const matter = await prisma.matter.findFirst({
      where: { id: input.matterId, organizationId: input.organizationId },
    });
    if (!matter) return "MATTER_NOT_FOUND" as const;
    if (level[input.classification] < level[matter.classification])
      return "CLASSIFICATION_DOWNGRADE" as const;
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.uploadReservation.create({
        data: {
          id: input.id,
          organizationId: input.organizationId,
          matterId: matter.id,
          filename: input.filename,
          mediaType: input.mediaType,
          sizeBytes: input.sizeBytes,
          sha256: input.sha256,
          classification: input.classification,
          objectKey: input.objectKey,
          expiresAt: input.expiresAt,
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorId: input.actorId,
          action: "upload.reserved",
          target: "UploadReservation",
          targetId: reservation.id,
          metadata: {
            classification: input.classification,
            sizeBytes: input.sizeBytes,
          },
        },
      });
      return reservation;
    });
  }
  async finalize(input: Parameters<DocumentRepository["finalize"]>[0]) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.uploadReservation.findFirst({
        where: {
          id: input.uploadId,
          organizationId: input.organizationId,
          objectKey: input.objectKey,
          expiresAt: { gt: new Date() },
        },
      });
      if (!reservation) return "NOT_FOUND" as const;
      if (reservation.consumedAt) return "ALREADY_USED" as const;
      const matter = await tx.matter.findFirst({
        where: {
          id: reservation.matterId,
          organizationId: input.organizationId,
        },
      });
      if (!matter) return "NOT_FOUND" as const;
      const document = await tx.document.create({
        data: {
          organizationId: input.organizationId,
          matterId: matter.id,
          filename: reservation.filename,
          classification: reservation.classification,
          retentionUntil: new Date(
            Date.now() + matter.retentionDays * 86_400_000,
          ),
          versions: {
            create: {
              version: 1,
              mediaType: reservation.mediaType,
              sizeBytes: reservation.sizeBytes,
              sha256: reservation.sha256,
              objectKey: reservation.objectKey,
              jobs: { create: { status: "QUEUED" } },
            },
          },
        },
        include: { versions: { include: { jobs: true } } },
      });
      await tx.uploadReservation.update({
        where: { id: reservation.id },
        data: { consumedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorId: input.actorId,
          action: "document.quarantined",
          target: "Document",
          targetId: document.id,
          metadata: { uploadId: reservation.id },
        },
      });
      return document;
    });
  }
  async document(organizationId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, organizationId, deletedAt: null },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          include: { jobs: { orderBy: { createdAt: "desc" }, take: 1 } },
        },
      },
    });
    if (!document) return null;
    const latest = document.versions[0];
    return {
      id: document.id,
      filename: document.filename,
      classification: document.classification,
      status: document.status,
      retentionUntil: document.retentionUntil,
      version: latest?.version,
      pageCount: latest?.pageCount,
      pipeline: latest?.jobs[0]?.status,
      ...(document.status === "READY" && latest
        ? { objectKey: latest.objectKey }
        : {}),
    };
  }
}
