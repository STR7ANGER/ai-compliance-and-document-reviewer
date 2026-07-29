import { Hono } from "hono";
import type { AccessService } from "../access/service.js";
import type { HardeningService } from "./service.js";
export const createHardeningRoutes = (
  service: HardeningService,
  access: AccessService,
) => {
  const routes = new Hono();
  routes.post("/redactions", async (c) =>
    c.json(
      service.redact(
        await access.authenticate(c.req.header("authorization")),
        await c.req.json(),
      ),
    ),
  );
  return routes;
};
