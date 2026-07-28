import { Hono } from "hono";
import type { AccessService } from "../access/service.js";
import type { ComplianceService } from "./service.js";
export const createComplianceRoutes = (
  service: ComplianceService,
  access: AccessService,
) => {
  const routes = new Hono();
  const principal = (header: string | undefined) => access.authenticate(header);
  routes.post("/frameworks", async (c) =>
    c.json(
      await service.createFramework(
        await principal(c.req.header("authorization")),
        await c.req.json(),
      ),
      201,
    ),
  );
  routes.post("/findings/assess", async (c) =>
    c.json(
      await service.assess(
        await principal(c.req.header("authorization")),
        await c.req.json(),
      ),
      201,
    ),
  );
  routes.get("/findings/dashboard", async (c) =>
    c.json(
      await service.dashboard(
        await principal(c.req.header("authorization")),
        c.req.query("matterId") ?? "",
      ),
    ),
  );
  return routes;
};
