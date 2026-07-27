import { prisma } from "../../db.js";
import type { AccessRepository } from "./service.js";

export class PrismaAccessRepository implements AccessRepository {
  async bootstrap(input: Parameters<AccessRepository["bootstrap"]>[0]) {
    const existing = await prisma.organization.findUnique({
      where: { slug: input.organizationSlug },
    });
    if (existing) return "EXISTS" as const;
    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: input.organizationName, slug: input.organizationSlug },
      });
      const user = await tx.user.upsert({
        where: { email: input.ownerEmail },
        create: { email: input.ownerEmail },
        update: {},
      });
      await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "OWNER",
        },
      });
      await tx.apiKey.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          tokenHash: input.tokenHash,
          prefix: input.prefix,
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: organization.id,
          actorId: user.id,
          action: "organization.bootstrapped",
          target: "Organization",
          targetId: organization.id,
          metadata: {},
        },
      });
      return { organizationId: organization.id, userId: user.id };
    });
  }
  async principalForHash(hash: string) {
    const key = await prisma.apiKey.findFirst({
      where: {
        tokenHash: hash,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { user: { include: { memberships: true } } },
    });
    if (!key) return null;
    const membership = key.user.memberships.find(
      (item) => item.organizationId === key.organizationId,
    );
    if (!membership) return null;
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });
    return {
      userId: key.userId,
      organizationId: key.organizationId,
      role: membership.role,
    };
  }
  async createMatter(input: Parameters<AccessRepository["createMatter"]>[0]) {
    const existing = await prisma.matter.findUnique({
      where: {
        organizationId_name: {
          organizationId: input.organizationId,
          name: input.name,
        },
      },
    });
    if (existing) return "EXISTS" as const;
    return prisma.$transaction(async (tx) => {
      const matter = await tx.matter.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          classification: input.classification,
          retentionDays: input.retentionDays,
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorId: input.actorId,
          action: "matter.created",
          target: "Matter",
          targetId: matter.id,
          metadata: {
            classification: matter.classification,
            retentionDays: matter.retentionDays,
          },
        },
      });
      return matter;
    });
  }
  async matters(organizationId: string) {
    return prisma.matter.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }
  async audit(organizationId: string) {
    return prisma.auditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        actorId: true,
        action: true,
        target: true,
        targetId: true,
        metadata: true,
        createdAt: true,
      },
    });
  }
  async expire(organizationId: string, actorId: string, now: Date) {
    return prisma.$transaction(async (tx) => {
      const documents = await tx.document.findMany({
        where: {
          organizationId,
          retentionUntil: { lte: now },
          deletedAt: null,
          matter: { legalHold: false },
        },
        select: { id: true },
      });
      if (documents.length) {
        await tx.document.updateMany({
          where: { id: { in: documents.map((item) => item.id) } },
          data: { status: "DELETED", deletedAt: now },
        });
        await tx.auditEvent.createMany({
          data: documents.map((item) => ({
            organizationId,
            actorId,
            action: "document.retention.expired",
            target: "Document",
            targetId: item.id,
            metadata: {},
          })),
        });
      }
      return { expired: documents.length };
    });
  }
}
