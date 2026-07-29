import {
  documentDiffInput,
  findingResolutionInput,
  reportFormat,
} from "@review/contracts";
import { prisma } from "../../db.js";
import type { Metrics } from "../../metrics.js";
import type { Principal } from "../access/service.js";
import { DomainError } from "../access/service.js";
import { diffLines } from "./diff.js";

const csvCell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export class ReportService {
  constructor(private readonly metrics: Metrics) {}
  async diff(principal: Principal, untrusted: unknown) {
    const input = documentDiffInput.parse(untrusted);
    const versions = await prisma.documentVersion.findMany({
      where: {
        id: { in: [input.beforeVersionId, input.afterVersionId] },
        document: { organizationId: principal.organizationId },
      },
      include: {
        chunks: { orderBy: { ordinal: "asc" }, select: { text: true } },
        document: { select: { id: true } },
      },
    });
    const before = versions.find((item) => item.id === input.beforeVersionId);
    const after = versions.find((item) => item.id === input.afterVersionId);
    if (!before || !after || before.document.id !== after.document.id)
      throw new DomainError(
        "VERSIONS_NOT_FOUND",
        404,
        "Comparable versions not found.",
      );
    const parts = diffLines(
      before.chunks.map((item) => item.text).join("\n"),
      after.chunks.map((item) => item.text).join("\n"),
    );
    this.metrics.increment("document_diffs_total");
    return { beforeVersionId: before.id, afterVersionId: after.id, parts };
  }
  async resolve(principal: Principal, findingId: string, untrusted: unknown) {
    if (principal.role === "VIEWER")
      throw new DomainError("FORBIDDEN", 403, "Resolution requires reviewer.");
    const input = findingResolutionInput.parse(untrusted);
    const finding = await prisma.finding.findFirst({
      where: { id: findingId, organizationId: principal.organizationId },
    });
    if (!finding)
      throw new DomainError("FINDING_NOT_FOUND", 404, "Finding not found.");
    const chunks = await prisma.chunk.findMany({
      where: {
        id: { in: input.evidenceChunkIds },
        organizationId: principal.organizationId,
        matterId: finding.matterId,
      },
      select: { id: true },
    });
    if (chunks.length !== new Set(input.evidenceChunkIds).size)
      throw new DomainError(
        "EVIDENCE_NOT_FOUND",
        422,
        "Evidence must belong to this matter.",
      );
    return prisma.finding.update({
      where: { id: finding.id },
      data: {
        status: input.status,
        resolutionNote: input.note,
        resolvedBy: principal.userId,
        resolvedAt: new Date(),
        evidenceLinks: {
          createMany: {
            data: chunks.map((chunk) => ({
              chunkId: chunk.id,
              label: "Resolution evidence",
            })),
            skipDuplicates: true,
          },
        },
      },
      include: { evidenceLinks: true },
    });
  }
  async export(principal: Principal, matterId: string, rawFormat: string) {
    const format = reportFormat.parse(rawFormat);
    const matter = await prisma.matter.findFirst({
      where: { id: matterId, organizationId: principal.organizationId },
    });
    if (!matter)
      throw new DomainError("MATTER_NOT_FOUND", 404, "Matter not found.");
    const findings = await prisma.finding.findMany({
      where: { organizationId: principal.organizationId, matterId },
      include: { control: true, evidenceLinks: true },
      orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    });
    this.metrics.increment("reports_exported_total", { format });
    if (format === "json")
      return {
        contentType: "application/json",
        filename: `${matterId}-report.json`,
        body: JSON.stringify(
          {
            matter: { id: matter.id, name: matter.name },
            generatedAt: new Date().toISOString(),
            findings,
          },
          null,
          2,
        ),
      };
    const header = [
      "control",
      "title",
      "severity",
      "status",
      "riskScore",
      "resolution",
    ]
      .map(csvCell)
      .join(",");
    const rows = findings.map((item) =>
      [
        item.control.code,
        item.title,
        item.severity,
        item.status,
        item.riskScore,
        item.resolutionNote,
      ]
        .map(csvCell)
        .join(","),
    );
    return {
      contentType: "text/csv; charset=utf-8",
      filename: `${matterId}-report.csv`,
      body: [header, ...rows].join("\n"),
    };
  }
}
