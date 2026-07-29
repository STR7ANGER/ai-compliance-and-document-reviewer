import { describe, expect, it } from "vitest";
import { diffLines } from "../src/modules/reports/diff.js";

describe("document diff", () => {
  it("preserves equal lines and identifies revisions", () => {
    expect(diffLines("A\nold\nC", "A\nnew\nC")).toEqual([
      { kind: "equal", text: "A" },
      { kind: "added", text: "new" },
      { kind: "removed", text: "old" },
      { kind: "equal", text: "C" },
    ]);
  });
  it("handles empty versions", () => {
    expect(diffLines("", "new")).toEqual([
      { kind: "added", text: "new" },
      { kind: "removed", text: "" },
    ]);
  });
});
