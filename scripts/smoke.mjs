const baseUrl = process.env.BASE_URL ?? "http://localhost:3011";
const response = await fetch(`${baseUrl}/health`, {
  signal: AbortSignal.timeout(10_000),
});
if (!response.ok)
  throw new Error(`Health check failed with ${response.status}`);
const body = await response.json();
if (body.status !== "ok" || body.contract !== "v1")
  throw new Error("Health response does not match the v1 contract");
console.log(`Smoke check passed: ${baseUrl}`);
