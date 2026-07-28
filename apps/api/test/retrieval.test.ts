import { describe, expect, it } from "vitest";
import { Metrics } from "../src/metrics.js";
import type { Principal } from "../src/modules/access/service.js";
import { chunkPages, HashEmbedder } from "../src/modules/retrieval/chunker.js";
import { evaluateRetrieval } from "../src/modules/retrieval/evaluation.js";
import {
  type RetrievalRepository,
  RetrievalService,
} from "../src/modules/retrieval/service.js";

const reviewer: Principal = {
  organizationId: "organization",
  userId: "reviewer",
  role: "REVIEWER",
};
class Memory implements RetrievalRepository {
  indexed: Parameters<RetrievalRepository["replace"]>[0] | null = null;
  async versionScope(organizationId: string) {
    return organizationId === "organization"
      ? {
          matterId: "cm0000000000000000000001",
          documentId: "cm0000000000000000000002",
        }
      : null;
  }
  async replace(input: Parameters<RetrievalRepository["replace"]>[0]) {
    this.indexed = input;
    return { indexed: input.chunks.length };
  }
  async search(input: Parameters<RetrievalRepository["search"]>[0]) {
    return input.organizationId === "organization"
      ? [
          {
            id: "cm0000000000000000000003",
            documentId: "cm0000000000000000000002",
            documentVersionId: "cm0000000000000000000004",
            pageStart: 7,
            pageEnd: 7,
            text: "notify within 24 hours",
            score: 0.92,
          },
        ]
      : [];
  }
}

describe("grounded retrieval", () => {
  it("chunks deterministically with bounded overlap", () => {
    const text = Array.from(
      { length: 1000 },
      (_, index) => `word${index}`,
    ).join(" ");
    const chunks = chunkPages([{ page: 3, text }], 800, 120);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.pageStart).toBe(3);
    expect(chunks[0]?.checksum).toHaveLength(64);
    expect(chunks[0]?.text.split(" ").slice(-120)).toEqual(
      chunks[1]?.text.split(" ").slice(0, 120),
    );
  });
  it("indexes only a tenant-owned ready version", async () => {
    const repository = new Memory();
    const service = new RetrievalService(
      repository,
      new HashEmbedder(),
      new Metrics(),
    );
    await expect(
      service.index(reviewer, {
        documentVersionId: "cm0000000000000000000004",
        pages: [{ page: 1, text: "A security clause." }],
      }),
    ).resolves.toEqual({ indexed: 1 });
    await expect(
      service.index(
        { ...reviewer, organizationId: "other" },
        {
          documentVersionId: "cm0000000000000000000004",
          pages: [{ page: 1, text: "A security clause." }],
        },
      ),
    ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
  });
  it("returns only repository-backed page citations", async () => {
    const service = new RetrievalService(
      new Memory(),
      new HashEmbedder(),
      new Metrics(),
    );
    await expect(
      service.search(reviewer, {
        matterId: "cm0000000000000000000001",
        query: "breach notification",
      }),
    ).resolves.toMatchObject({
      hits: [
        {
          citation: {
            pageStart: 7,
            quote: "notify within 24 hours",
            score: 0.92,
          },
        },
      ],
    });
  });
  it("measures golden-set recall, rank, and citation pages", () => {
    expect(
      evaluateRetrieval(
        [
          {
            relevantChunkIds: ["clause"],
            rankedChunkIds: ["noise", "clause"],
            expectedPages: [7],
            citedPages: [7],
          },
        ],
        2,
      ),
    ).toEqual({ recallAtK: 1, meanReciprocalRank: 0.5, pageAccuracy: 1 });
  });
});
