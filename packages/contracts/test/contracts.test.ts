import { describe, expect, it } from "vitest";
import { dataClassification, uploadIntentInput } from "../src/index.js";

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
});
