import { describe, expect, it } from "vitest";
import { canTransition } from "../src/modules/reviews/service.js";

describe("human review lifecycle", () => {
  it("allows review and decision transitions", () => {
    expect(canTransition("DRAFT", "IN_REVIEW")).toBe(true);
    expect(canTransition("IN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition("REJECTED", "IN_REVIEW")).toBe(true);
  });
  it("keeps terminal approvals immutable", () => {
    expect(canTransition("APPROVED", "IN_REVIEW")).toBe(false);
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
  });
});
