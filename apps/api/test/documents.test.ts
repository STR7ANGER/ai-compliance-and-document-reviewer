import { describe, expect, it } from "vitest";
import { Metrics } from "../src/metrics.js";
import type { Principal } from "../src/modules/access/service.js";
import {
  type DocumentRepository,
  DocumentService,
} from "../src/modules/documents/service.js";
import type { ObjectStorage } from "../src/modules/documents/storage.js";

const reviewer: Principal = {
  organizationId: "organization",
  userId: "reviewer",
  role: "REVIEWER",
};
class Memory implements DocumentRepository {
  ready = false;
  async reserve(input: Parameters<DocumentRepository["reserve"]>[0]) {
    return input.matterId === "cm0000000000000000000001"
      ? input
      : ("MATTER_NOT_FOUND" as const);
  }
  async finalize(input: Parameters<DocumentRepository["finalize"]>[0]) {
    return input.uploadId === "00000000-0000-4000-8000-000000000001"
      ? { id: "document", status: "QUARANTINED" }
      : ("NOT_FOUND" as const);
  }
  async document(organizationId: string, documentId: string) {
    if (organizationId !== "organization" || documentId !== "document")
      return null;
    return {
      id: documentId,
      status: this.ready ? "READY" : "PROCESSING",
      ...(this.ready ? { objectKey: "clean/document" } : {}),
    };
  }
}
class Storage implements ObjectStorage {
  async uploadUrl() {
    return "https://objects.example/upload";
  }
  async downloadUrl() {
    return "https://objects.example/view";
  }
}

describe("secure documents", () => {
  it("creates quarantine upload intents without filenames in object keys", async () => {
    const service = new DocumentService(
      new Memory(),
      new Storage(),
      new Metrics(),
    );
    const result = await service.intent(reviewer, {
      matterId: "cm0000000000000000000001",
      filename: "privileged contract.pdf",
      mediaType: "application/pdf",
      sizeBytes: 100,
      sha256: "a".repeat(64),
      classification: "CONFIDENTIAL",
    });
    expect(result.objectKey).toMatch(/^quarantine\/organization\/[0-9a-f-]+$/);
    expect(result.objectKey).not.toContain("contract");
  });
  it("keeps viewers from uploading", async () => {
    const service = new DocumentService(
      new Memory(),
      new Storage(),
      new Metrics(),
    );
    await expect(
      Promise.resolve().then(() =>
        service.intent({ ...reviewer, role: "VIEWER" }, {}),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("reveals viewer URLs only after processing succeeds", async () => {
    const repository = new Memory();
    const service = new DocumentService(
      repository,
      new Storage(),
      new Metrics(),
    );
    await expect(
      service.document(reviewer, "document"),
    ).resolves.not.toHaveProperty("viewerUrl");
    repository.ready = true;
    await expect(service.document(reviewer, "document")).resolves.toMatchObject(
      { viewerUrl: "https://objects.example/view" },
    );
    await expect(
      service.document({ ...reviewer, organizationId: "other" }, "document"),
    ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
  });
});
