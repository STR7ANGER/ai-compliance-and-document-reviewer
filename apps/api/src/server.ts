import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { parseEnvironment } from "./env.js";
import { Metrics } from "./metrics.js";
import { PrismaAccessRepository } from "./modules/access/prisma-repository.js";
import { AccessService } from "./modules/access/service.js";
import { PrismaDocumentRepository } from "./modules/documents/prisma-repository.js";
import { DocumentService } from "./modules/documents/service.js";
import { S3ObjectStorage } from "./modules/documents/storage.js";

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
const server = serve({
  fetch: createApp({
    metrics,
    operatorToken: environment.OPERATOR_METRICS_TOKEN,
    access,
    bootstrapKey: environment.BOOTSTRAP_ADMIN_KEY,
    documents,
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
