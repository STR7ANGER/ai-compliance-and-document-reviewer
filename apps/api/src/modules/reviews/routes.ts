import { Hono } from "hono";
import type { AccessService } from "../access/service.js";
import type { ReviewService } from "./service.js";
export const createReviewRoutes = (
  service: ReviewService,
  access: AccessService,
) => {
  const routes = new Hono();
  const principal = (header: string | undefined) => access.authenticate(header);
  routes.post("/suggestions", async (c) =>
    c.json(
      await service.suggest(
        await principal(c.req.header("authorization")),
        await c.req.json(),
      ),
      201,
    ),
  );
  routes.patch("/reviews/:id", async (c) =>
    c.json(
      await service.update(
        await principal(c.req.header("authorization")),
        c.req.param("id"),
        await c.req.json(),
      ),
    ),
  );
  routes.post("/reviews/:id/comments", async (c) =>
    c.json(
      await service.comment(
        await principal(c.req.header("authorization")),
        c.req.param("id"),
        await c.req.json(),
      ),
      201,
    ),
  );
  return routes;
};
