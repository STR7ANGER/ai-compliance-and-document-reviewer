import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { ZodError } from "zod";
import type { Metrics } from "./metrics.js";
import { createAccessRoutes } from "./modules/access/routes.js";
import { type AccessService, DomainError } from "./modules/access/service.js";

export const createApp = (
  options: {
    metrics?: Metrics;
    operatorToken?: string;
    access?: AccessService;
    bootstrapKey?: string;
  } = {},
) => {
  const app = new Hono();
  app.onError((error, context) => {
    if (error instanceof DomainError)
      return context.json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    if (error instanceof ZodError)
      return context.json(
        { error: { code: "VALIDATION_FAILED", message: "Invalid request." } },
        422,
      );
    console.error(JSON.stringify({ level: "error", event: "http.unhandled" }));
    return context.json({ error: { code: "INTERNAL_ERROR" } }, 500);
  });
  app.use("*", requestId());
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({ origin: process.env.WEB_URL ?? "http://localhost:3000" }),
  );
  app.use("*", async (context, next) => {
    const started = performance.now();
    await next();
    options.metrics?.increment("http_requests_total", {
      method: context.req.method,
      status_class: `${Math.floor(context.res.status / 100)}xx`,
    });
    console.info(
      JSON.stringify({
        level: "info",
        event: "http.completed",
        requestId: context.get("requestId"),
        method: context.req.method,
        route: context.req.path.startsWith("/v1/") ? "/v1/*" : context.req.path,
        status: context.res.status,
        durationMs: Math.round(performance.now() - started),
      }),
    );
  });
  app.get("/health", (context) =>
    context.json({
      status: "ok",
      service: "compliance-review-api",
      contract: "v1",
    }),
  );
  if (options.metrics && options.operatorToken)
    app.get("/internal/metrics", (context) => {
      if (
        context.req.header("authorization") !==
        `Bearer ${options.operatorToken}`
      )
        return context.json({ error: { code: "FORBIDDEN" } }, 403);
      context.header("content-type", "text/plain; version=0.0.4");
      return context.body(options.metrics?.render() ?? "");
    });
  if (options.access && options.bootstrapKey)
    app.route("/v1", createAccessRoutes(options.access, options.bootstrapKey));
  return app;
};
