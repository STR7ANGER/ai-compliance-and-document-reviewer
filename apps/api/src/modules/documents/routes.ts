import { Hono } from "hono";
import type { AccessService } from "../access/service.js";
import type { DocumentService } from "./service.js";
export const createDocumentRoutes = (
  documents: DocumentService,
  access: AccessService,
) => {
  const routes = new Hono();
  const principal = (header: string | undefined) => access.authenticate(header);
  routes.post("/uploads/intents", async (context) =>
    context.json(
      await documents.intent(
        await principal(context.req.header("authorization")),
        await context.req.json(),
      ),
      201,
    ),
  );
  routes.post("/uploads/finalize", async (context) =>
    context.json(
      await documents.finalize(
        await principal(context.req.header("authorization")),
        await context.req.json(),
      ),
      201,
    ),
  );
  routes.get("/documents/:id", async (context) =>
    context.json(
      await documents.document(
        await principal(context.req.header("authorization")),
        context.req.param("id"),
      ),
    ),
  );
  routes.delete("/documents/:id", async (context) =>
    context.json(
      await documents.delete(
        await principal(context.req.header("authorization")),
        context.req.param("id"),
      ),
    ),
  );
  return routes;
};
