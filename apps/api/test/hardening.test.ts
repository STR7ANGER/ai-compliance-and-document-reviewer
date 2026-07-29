import { describe, expect, it } from "vitest";
import { Metrics } from "../src/metrics.js";
import {
  FixedWindowRateLimiter,
  HardeningService,
  redactSensitive,
} from "../src/modules/hardening/service.js";

describe("production hardening", () => {
  it("redacts common secrets and explicit terms", () => {
    expect(
      redactSensitive(
        "a@example.com cr_abcdefghijklmnopqrstuvwxyz123456 Acme",
        ["Acme"],
      ),
    ).toBe("[REDACTED_EMAIL] [REDACTED_SECRET] [REDACTED_TERM]");
  });
  it("limits identifiers without retaining their raw value", () => {
    const limiter = new FixedWindowRateLimiter(2, 1000);
    expect(limiter.take("secret", 0)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.take("secret", 1)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(limiter.take("secret", 2)).toMatchObject({ allowed: false });
    expect(limiter.take("secret", 1000)).toMatchObject({ allowed: true });
  });
  it("restricts redaction to reviewers", () => {
    const service = new HardeningService(new Metrics());
    expect(() =>
      service.redact(
        { organizationId: "o", userId: "u", role: "VIEWER" },
        { text: "secret" },
      ),
    ).toThrowError(/reviewer/i);
  });
});
