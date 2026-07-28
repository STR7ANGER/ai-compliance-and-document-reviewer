import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import type { RetrievalRepository, SearchHit } from "./service.js";

const literal = (embedding: number[]) => `[${embedding.join(",")}]`;
export class PrismaRetrievalRepository implements RetrievalRepository {
  async versionScope(organizationId: string, versionId: string) {
    const version = await prisma.documentVersion.findFirst({
      where: { id: versionId, document: { organizationId, status: "READY" } },
      select: { document: { select: { id: true, matterId: true } } },
    });
    return version
      ? { matterId: version.document.matterId, documentId: version.document.id }
      : null;
  }

  async replace(input: Parameters<RetrievalRepository["replace"]>[0]) {
    await prisma.$transaction(async (transaction) => {
      await transaction.chunk.deleteMany({
        where: { documentVersionId: input.documentVersionId },
      });
      for (const chunk of input.chunks)
        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO "Chunk" (
            "id", "organizationId", "matterId", "documentId",
            "documentVersionId", "ordinal", "pageStart", "pageEnd", "text",
            "textChecksum", "embeddingModel", "embedding", "createdAt"
          ) VALUES (
            ${crypto.randomUUID()}, ${input.organizationId}, ${input.matterId},
            ${input.documentId}, ${input.documentVersionId}, ${chunk.ordinal},
            ${chunk.pageStart}, ${chunk.pageEnd}, ${chunk.text},
            ${chunk.checksum}, ${input.model}, ${literal(chunk.embedding)}::vector,
            NOW()
          )
        `);
    });
    return { indexed: input.chunks.length };
  }

  async search(input: Parameters<RetrievalRepository["search"]>[0]) {
    const documentFilter = input.documentIds?.length
      ? Prisma.sql`AND "documentId" IN (${Prisma.join(input.documentIds)})`
      : Prisma.empty;
    const rows = await prisma.$queryRaw<
      Array<Omit<SearchHit, "score"> & { score: number }>
    >(Prisma.sql`
      SELECT "id", "documentId", "documentVersionId", "pageStart", "pageEnd",
             "text", (1 - ("embedding" <=> ${literal(input.embedding)}::vector))::float8 AS "score"
      FROM "Chunk"
      WHERE "organizationId" = ${input.organizationId}
        AND "matterId" = ${input.matterId}
        ${documentFilter}
      ORDER BY "embedding" <=> ${literal(input.embedding)}::vector
      LIMIT ${input.limit}
    `);
    return rows;
  }
}
