import { describe, expect, it } from "vitest";
import { riskScore } from "../src/modules/compliance/service.js";

describe("compliance scoring", () => {
  it("weights severity, confidence, and control importance", () => {
    expect(riskScore("HIGH", 0.5, 2)).toBe(60);
    expect(riskScore("CRITICAL", 1, 10)).toBe(100);
  });
});
