import { describe, expect, it } from "vitest";
import {
  citation,
  dataClassification,
  retrievalQueryInput,
  uploadIntentInput,
} from "../src/index.js";

describe("shared contracts", () => {
  it("recognizes the ordered classification vocabulary", () => {
    expect(dataClassification.options).toEqual([
      "PUBLIC",
      "INTERNAL",
      "CONFIDENTIAL",
      "RESTRICTED",
    ]);
  });
  it("rejects unsupported and oversized documents", () => {
    expect(
      uploadIntentInput.safeParse({
        matterId: "bad",
        filename: "x.exe",
        mediaType: "application/octet-stream",
        sizeBytes: 50_000_000,
        sha256: "bad",
        classification: "PUBLIC",
      }).success,
    ).toBe(false);
  });
  it("bounds retrieval and requires page-addressable citations", () => {
    expect(
      retrievalQueryInput.safeParse({
        matterId: "cm0000000000000000000001",
        query: "Which party must notify regulators?",
        limit: 100,
      }).success,
    ).toBe(false);
    expect(
      citation.safeParse({
        documentId: "cm0000000000000000000001",
        documentVersionId: "cm0000000000000000000002",
        chunkId: "cm0000000000000000000003",
        pageStart: 0,
        pageEnd: 1,
        quote: "Notification is required.",
        score: 0.9,
      }).success,
    ).toBe(false);
  });
});
