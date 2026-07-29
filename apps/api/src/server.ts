import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { parseEnvironment } from "./env.js";
import { Metrics } from "./metrics.js";
import { PrismaAccessRepository } from "./modules/access/prisma-repository.js";
import { AccessService } from "./modules/access/service.js";
import { ComplianceService } from "./modules/compliance/service.js";
import { PrismaDocumentRepository } from "./modules/documents/prisma-repository.js";
import { DocumentService } from "./modules/documents/service.js";
import { S3ObjectStorage } from "./modules/documents/storage.js";
import {
  ExtractionService,
  GeminiGenerator,
} from "./modules/extraction/service.js";
import {
  FixedWindowRateLimiter,
  HardeningService,
} from "./modules/hardening/service.js";
import { ReportService } from "./modules/reports/service.js";
import { HashEmbedder } from "./modules/retrieval/chunker.js";
import { PrismaRetrievalRepository } from "./modules/retrieval/prisma-repository.js";
import { RetrievalService } from "./modules/retrieval/service.js";
import { ReviewService } from "./modules/reviews/service.js";

const environment = parseEnvironment(process.env);
const metrics = new Metrics();
const access = new AccessService(
  new PrismaAccessRepository(),
  environment.SESSION_PEPPER,
  metrics,
);
const storage = new S3ObjectStorage(environment.S3_BUCKET, {
  endpoint: environment.S3_ENDPOINT,
  region: environment.S3_REGION,
  accessKey: environment.S3_ACCESS_KEY,
  secretKey: environment.S3_SECRET_KEY,
});
const documents = new DocumentService(
  new PrismaDocumentRepository(),
  storage,
  metrics,
);
const retrieval = new RetrievalService(
  new PrismaRetrievalRepository(),
  new HashEmbedder(),
  metrics,
);
const extraction = environment.GEMINI_API_KEY
  ? new ExtractionService(
      retrieval,
      new GeminiGenerator(environment.GEMINI_API_KEY),
      metrics,
    )
  : undefined;
const compliance = new ComplianceService(metrics);
const reviews = new ReviewService();
const reports = new ReportService(metrics);
const hardening = new HardeningService(metrics);
const rateLimiter = new FixedWindowRateLimiter();
const server = serve({
  fetch: createApp({
    metrics,
    operatorToken: environment.OPERATOR_METRICS_TOKEN,
    access,
    bootstrapKey: environment.BOOTSTRAP_ADMIN_KEY,
    documents,
    retrieval,
    ...(extraction ? { extraction } : {}),
    compliance,
    reviews,
    reports,
    hardening,
    rateLimiter,
  }).fetch,
  port: environment.PORT,
});
console.info(
  JSON.stringify({
    level: "info",
    event: "server.started",
    port: environment.PORT,
  }),
);
process.on("SIGTERM", () => server.close());
