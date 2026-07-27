import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3011),
  WEB_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  MONGODB_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(2),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY: z.string().min(3),
  S3_SECRET_KEY: z.string().min(16),
  SESSION_PEPPER: z.string().min(32),
  BOOTSTRAP_ADMIN_KEY: z.string().min(32),
  OPERATOR_METRICS_TOKEN: z.string().min(32),
  GEMINI_API_KEY: z.string().optional(),
});
export const parseEnvironment = (input: NodeJS.ProcessEnv) =>
  schema.parse(input);
