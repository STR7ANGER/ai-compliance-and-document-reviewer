import { createHash } from "node:crypto";
import { redactionInput } from "@review/contracts";
import type { Metrics } from "../../metrics.js";
import type { Principal } from "../access/service.js";
import { DomainError } from "../access/service.js";

export const redactSensitive = (value: string, terms: string[] = []) => {
  let redacted = value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:cr_|AIza)[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_SECRET]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_NUMBER]");
  for (const term of [...terms].sort((a, b) => b.length - a.length))
    redacted = redacted.replaceAll(term, "[REDACTED_TERM]");
  return redacted;
};

export class FixedWindowRateLimiter {
  private readonly windows = new Map<
    string,
    { start: number; count: number }
  >();
  constructor(
    private readonly limit = 120,
    private readonly windowMs = 60_000,
  ) {}
  take(identifier: string, now = Date.now()) {
    const key = createHash("sha256")
      .update(identifier)
      .digest("hex")
      .slice(0, 24);
    const current = this.windows.get(key);
    if (!current || now - current.start >= this.windowMs) {
      this.windows.set(key, { start: now, count: 1 });
      return { allowed: true, remaining: this.limit - 1 };
    }
    if (current.count >= this.limit) return { allowed: false, remaining: 0 };
    current.count++;
    return { allowed: true, remaining: this.limit - current.count };
  }
}

export class HardeningService {
  constructor(private readonly metrics: Metrics) {}
  redact(principal: Principal, untrusted: unknown) {
    if (principal.role === "VIEWER")
      throw new DomainError("FORBIDDEN", 403, "Redaction requires reviewer.");
    const input = redactionInput.parse(untrusted);
    const text = redactSensitive(input.text, input.terms);
    this.metrics.increment("redactions_total");
    return { text, replacementsApplied: text !== input.text };
  }
}
