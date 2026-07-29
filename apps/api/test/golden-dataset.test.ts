import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { reviewGrounding } from "../src/modules/extraction/service.js";
import {
  evaluateRetrieval,
  type RetrievalCase,
} from "../src/modules/retrieval/evaluation.js";

const fixture = fileURLToPath(
  new URL("../../../testdata/retrieval-golden.json", import.meta.url),
);

describe("release golden dataset", () => {
  it("meets retrieval and page-citation thresholds", () => {
    const cases = JSON.parse(readFileSync(fixture, "utf8")) as RetrievalCase[];
    const result = evaluateRetrieval(cases, 3);
    expect(result.recallAtK).toBeGreaterThanOrEqual(0.95);
    expect(result.meanReciprocalRank).toBeGreaterThanOrEqual(0.8);
    expect(result.pageAccuracy).toBe(1);
  });
  it("flags unsupported model citations for human review", () => {
    expect(
      reviewGrounding([{ evidenceIndex: 0 }, { evidenceIndex: 4 }], 2),
    ).toEqual({
      unsupported: [{ outputIndex: 1, evidenceIndex: 4 }],
      groundingScore: 0.5,
    });
  });
});
