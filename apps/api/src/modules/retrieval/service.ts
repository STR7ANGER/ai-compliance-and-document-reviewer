import { retrievalIndexInput, retrievalQueryInput } from "@review/contracts";
import type { Metrics } from "../../metrics.js";
import type { Principal } from "../access/service.js";
import { DomainError } from "../access/service.js";
import { chunkPages, type HashEmbedder, type TextChunk } from "./chunker.js";

export type SearchHit = {
  id: string;
  documentId: string;
  documentVersionId: string;
  pageStart: number;
  pageEnd: number;
  text: string;
  score: number;
};
export interface RetrievalRepository {
  versionScope(
    organizationId: string,
    versionId: string,
  ): Promise<{ matterId: string; documentId: string } | null>;
  replace(input: {
    organizationId: string;
    matterId: string;
    documentId: string;
    documentVersionId: string;
    model: string;
    chunks: Array<TextChunk & { embedding: number[] }>;
  }): Promise<{ indexed: number }>;
  search(input: {
    organizationId: string;
    matterId: string;
    documentIds?: string[];
    embedding: number[];
    limit: number;
  }): Promise<SearchHit[]>;
}

export class RetrievalService {
  constructor(
    private readonly repository: RetrievalRepository,
    private readonly embedder: HashEmbedder,
    private readonly metrics: Metrics,
  ) {}
  async index(principal: Principal, untrusted: unknown) {
    if (principal.role === "VIEWER")
      throw new DomainError("FORBIDDEN", 403, "Indexing requires reviewer.");
    const input = retrievalIndexInput.parse(untrusted);
    const scope = await this.repository.versionScope(
      principal.organizationId,
      input.documentVersionId,
    );
    if (!scope)
      throw new DomainError(
        "DOCUMENT_NOT_FOUND",
        404,
        "Document version not found.",
      );
    const chunks = chunkPages(input.pages).map((chunk) => ({
      ...chunk,
      embedding: this.embedder.embed(chunk.text),
    }));
    const result = await this.repository.replace({
      organizationId: principal.organizationId,
      ...scope,
      documentVersionId: input.documentVersionId,
      model: this.embedder.model,
      chunks,
    });
    this.metrics.increment("retrieval_chunks_indexed_total");
    return result;
  }
  async search(principal: Principal, untrusted: unknown) {
    const input = retrievalQueryInput.parse(untrusted);
    const hits = await this.repository.search({
      organizationId: principal.organizationId,
      matterId: input.matterId,
      ...(input.documentIds ? { documentIds: input.documentIds } : {}),
      embedding: this.embedder.embed(input.query),
      limit: input.limit,
    });
    this.metrics.increment("retrieval_queries_total");
    return {
      hits: hits.map((hit) => ({
        citation: {
          documentId: hit.documentId,
          documentVersionId: hit.documentVersionId,
          chunkId: hit.id,
          pageStart: hit.pageStart,
          pageEnd: hit.pageEnd,
          quote: hit.text.slice(0, 1200),
          score: Math.max(0, Math.min(1, hit.score)),
        },
      })),
    };
  }
}
