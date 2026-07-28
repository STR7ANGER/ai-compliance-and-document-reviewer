import { extractedObligations } from "@review/contracts";
import { describe, expect, it } from "vitest";

describe("structured extraction contract", () => {
  it("accepts bounded, evidence-indexed obligations", () => {
    expect(
      extractedObligations.parse({
        obligations: [
          {
            statement: "Notify within 24 hours",
            party: "Processor",
            deadline: "24 hours",
            evidenceIndex: 0,
            confidence: 0.95,
          },
        ],
      }).obligations,
    ).toHaveLength(1);
  });
  it("rejects malformed model confidence", () => {
    expect(() =>
      extractedObligations.parse({
        obligations: [
          {
            statement: "x",
            party: "y",
            deadline: null,
            evidenceIndex: 0,
            confidence: 2,
          },
        ],
      }),
    ).toThrow();
  });
});
