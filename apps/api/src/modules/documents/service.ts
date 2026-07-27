import { randomUUID } from "node:crypto";
import {
  type DataClassification,
  finalizeUploadInput,
  uploadIntentInput,
} from "@review/contracts";
import type { Metrics } from "../../metrics.js";
import type { Principal } from "../access/service.js";
import { DomainError } from "../access/service.js";
import type { ObjectStorage } from "./storage.js";

export interface DocumentRepository {
  reserve(input: {
    id: string;
    organizationId: string;
    actorId: string;
    matterId: string;
    filename: string;
    mediaType: string;
    sizeBytes: number;
    sha256: string;
    classification: DataClassification;
    objectKey: string;
    expiresAt: Date;
  }): Promise<
    Record<string, unknown> | "MATTER_NOT_FOUND" | "CLASSIFICATION_DOWNGRADE"
  >;
  finalize(input: {
    organizationId: string;
    actorId: string;
    uploadId: string;
    objectKey: string;
  }): Promise<Record<string, unknown> | "NOT_FOUND" | "ALREADY_USED">;
  document(
    organizationId: string,
    documentId: string,
  ): Promise<
    (Record<string, unknown> & { status: string; objectKey?: string }) | null
  >;
}

const requireReviewer = (principal: Principal) => {
  if (principal.role === "VIEWER")
    throw new DomainError(
      "FORBIDDEN",
      403,
      "Document upload requires reviewer.",
    );
};
export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly storage: ObjectStorage,
    private readonly metrics: Metrics,
  ) {}
  async intent(principal: Principal, untrusted: unknown) {
    requireReviewer(principal);
    const input = uploadIntentInput.parse(untrusted);
    const uploadId = randomUUID();
    const objectKey = `quarantine/${principal.organizationId}/${uploadId}`;
    const expiresAt = new Date(Date.now() + 300_000);
    const result = await this.repository.reserve({
      id: uploadId,
      organizationId: principal.organizationId,
      actorId: principal.userId,
      ...input,
      objectKey,
      expiresAt,
    });
    if (result === "MATTER_NOT_FOUND")
      throw new DomainError(result, 404, "Matter not found.");
    if (result === "CLASSIFICATION_DOWNGRADE")
      throw new DomainError(
        result,
        422,
        "Document classification cannot be weaker than its matter.",
      );
    const uploadUrl = await this.storage.uploadUrl({
      objectKey,
      mediaType: input.mediaType,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
    });
    this.metrics.increment("upload_intents_total", {
      classification: input.classification.toLowerCase(),
    });
    return { uploadId, objectKey, uploadUrl, expiresAt };
  }
  async finalize(principal: Principal, untrusted: unknown) {
    requireReviewer(principal);
    const input = finalizeUploadInput.parse(untrusted);
    const result = await this.repository.finalize({
      organizationId: principal.organizationId,
      actorId: principal.userId,
      ...input,
    });
    if (result === "NOT_FOUND")
      throw new DomainError(
        "UPLOAD_NOT_FOUND",
        404,
        "Upload reservation not found or expired.",
      );
    if (result === "ALREADY_USED")
      throw new DomainError(result, 409, "Upload was already finalized.");
    this.metrics.increment("documents_quarantined_total");
    return result;
  }
  async document(principal: Principal, documentId: string) {
    const result = await this.repository.document(
      principal.organizationId,
      documentId,
    );
    if (!result)
      throw new DomainError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
    if (result.status !== "READY" || !result.objectKey) return result;
    const { objectKey, ...document } = result;
    return {
      ...document,
      viewerUrl: await this.storage.downloadUrl(objectKey),
    };
  }
}
