import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/env.js";
import { Metrics } from "../src/metrics.js";
import { FixedWindowRateLimiter } from "../src/modules/hardening/service.js";

describe("foundation", () => {
  it("reports health without exposing dependencies", async () => {
    const response = await createApp().request("/health");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.json()).toMatchObject({
      status: "ok",
      contract: "v1",
    });
  });
  it("fails closed on incomplete production configuration", () => {
    expect(() => parseEnvironment({ NODE_ENV: "production" })).toThrow();
  });
  it("protects bounded operator metrics", async () => {
    const metrics = new Metrics();
    metrics.increment("documents_uploaded_total", {
      classification: "restricted",
    });
    const app = createApp({ metrics, operatorToken: "operator" });
    expect((await app.request("/internal/metrics")).status).toBe(403);
    const response = await app.request("/internal/metrics", {
      headers: { authorization: "Bearer operator" },
    });
    expect(await response.text()).toContain("review_documents_uploaded_total");
  });
  it("enforces the HTTP rate-limit boundary end to end", async () => {
    const app = createApp({ rateLimiter: new FixedWindowRateLimiter(1) });
    const request = () =>
      app.request("/v1/probe", {
        headers: { authorization: "Bearer stable-test-identity" },
      });
    expect((await request()).status).toBe(404);
    const limited = await request();
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: { code: "RATE_LIMITED" } });
  });
});
