import { Hono } from "hono";
import type { AccessService } from "../access/service.js";
import type { RetrievalService } from "./service.js";
export const createRetrievalRoutes = (
  retrieval: RetrievalService,
  access: AccessService,
) => {
  const routes = new Hono();
  const principal = (header: string | undefined) => access.authenticate(header);
  routes.post("/retrieval/index", async (context) =>
    context.json(
      await retrieval.index(
        await principal(context.req.header("authorization")),
        await context.req.json(),
      ),
    ),
  );
  routes.post("/retrieval/query", async (context) =>
    context.json(
      await retrieval.search(
        await principal(context.req.header("authorization")),
        await context.req.json(),
      ),
    ),
  );
  return routes;
};
