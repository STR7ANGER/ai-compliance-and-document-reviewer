import { Hono } from "hono";
import type { AccessService } from "../access/service.js";
import type { ExtractionService } from "./service.js";
export const createExtractionRoutes = (
  service: ExtractionService,
  access: AccessService,
) => {
  const routes = new Hono();
  routes.post("/extractions", async (c) =>
    c.json(
      await service.extract(
        await access.authenticate(c.req.header("authorization")),
        await c.req.json(),
      ),
      201,
    ),
  );
  return routes;
};
