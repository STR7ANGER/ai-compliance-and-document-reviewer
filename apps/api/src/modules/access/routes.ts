import { Hono } from "hono";
import type { AccessService } from "./service.js";
export const createAccessRoutes = (
  service: AccessService,
  bootstrapKey: string,
) => {
  const routes = new Hono();
  routes.post("/bootstrap", async (context) => {
    if (context.req.header("x-bootstrap-key") !== bootstrapKey)
      return context.json({ error: { code: "FORBIDDEN" } }, 403);
    return context.json(await service.bootstrap(await context.req.json()), 201);
  });
  const principal = (header: string | undefined) =>
    service.authenticate(header);
  routes.post("/matters", async (context) =>
    context.json(
      await service.createMatter(
        await principal(context.req.header("authorization")),
        await context.req.json(),
      ),
      201,
    ),
  );
  routes.get("/matters", async (context) =>
    context.json(
      await service.matters(
        await principal(context.req.header("authorization")),
      ),
    ),
  );
  routes.get("/audit", async (context) =>
    context.json(
      await service.audit(await principal(context.req.header("authorization"))),
    ),
  );
  routes.post("/retention/sweep", async (context) =>
    context.json(
      await service.expire(
        await principal(context.req.header("authorization")),
      ),
    ),
  );
  return routes;
};
