import { Hono } from "hono";
import type { AccessService } from "../access/service.js";
import type { ReportService } from "./service.js";
export const createReportRoutes = (
  service: ReportService,
  access: AccessService,
) => {
  const routes = new Hono();
  const principal = (header: string | undefined) => access.authenticate(header);
  routes.post("/documents/diff", async (c) =>
    c.json(
      await service.diff(
        await principal(c.req.header("authorization")),
        await c.req.json(),
      ),
    ),
  );
  routes.post("/findings/:id/resolve", async (c) =>
    c.json(
      await service.resolve(
        await principal(c.req.header("authorization")),
        c.req.param("id"),
        await c.req.json(),
      ),
    ),
  );
  routes.get("/matters/:id/report", async (c) => {
    const result = await service.export(
      await principal(c.req.header("authorization")),
      c.req.param("id"),
      c.req.query("format") ?? "json",
    );
    c.header("content-type", result.contentType);
    c.header(
      "content-disposition",
      `attachment; filename="${result.filename}"`,
    );
    return c.body(result.body);
  });
  return routes;
};
