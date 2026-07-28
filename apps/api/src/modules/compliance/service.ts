import { findingAssessmentInput, frameworkInput } from "@review/contracts";
import { prisma } from "../../db.js";
import type { Metrics } from "../../metrics.js";
import type { Principal } from "../access/service.js";
import { DomainError } from "../access/service.js";

const severityWeight = {
  LOW: 10,
  MEDIUM: 30,
  HIGH: 60,
  CRITICAL: 100,
} as const;
export const riskScore = (
  severity: keyof typeof severityWeight,
  confidence: number,
  controlWeight: number,
) => Math.min(100, severityWeight[severity] * confidence * controlWeight);

export class ComplianceService {
  constructor(private readonly metrics: Metrics) {}
  async createFramework(principal: Principal, untrusted: unknown) {
    if (principal.role === "VIEWER")
      throw new DomainError(
        "FORBIDDEN",
        403,
        "Framework management requires reviewer.",
      );
    const input = frameworkInput.parse(untrusted);
    return prisma.framework.create({
      data: {
        organizationId: principal.organizationId,
        name: input.name,
        version: input.version,
        controls: { create: input.controls },
      },
      include: { controls: true },
    });
  }
  async assess(principal: Principal, untrusted: unknown) {
    if (principal.role === "VIEWER")
      throw new DomainError("FORBIDDEN", 403, "Assessment requires reviewer.");
    const input = findingAssessmentInput.parse(untrusted);
    const framework = await prisma.framework.findFirst({
      where: {
        id: input.frameworkId,
        organizationId: principal.organizationId,
      },
      include: { controls: true },
    });
    const version = await prisma.documentVersion.findFirst({
      where: {
        id: input.documentVersionId,
        document: {
          organizationId: principal.organizationId,
          matterId: input.matterId,
        },
      },
    });
    if (!framework || !version)
      throw new DomainError(
        "SCOPE_NOT_FOUND",
        404,
        "Framework or document not found.",
      );
    const controls = new Map(
      framework.controls.map((control) => [control.code, control]),
    );
    const created = await prisma.$transaction(
      input.findings.map((item) => {
        const control = controls.get(item.controlCode);
        if (!control)
          throw new DomainError(
            "CONTROL_NOT_FOUND",
            422,
            `Unknown control ${item.controlCode}.`,
          );
        return prisma.finding.create({
          data: {
            organizationId: principal.organizationId,
            matterId: input.matterId,
            documentVersionId: input.documentVersionId,
            controlId: control.id,
            title: item.title,
            summary: item.summary,
            severity: item.severity,
            confidence: item.confidence,
            riskScore: riskScore(
              item.severity,
              item.confidence,
              control.weight,
            ),
            citation: item.citation,
          },
        });
      }),
    );
    for (const _finding of created)
      this.metrics.increment("findings_created_total");
    return { findings: created };
  }
  async dashboard(principal: Principal, matterId: string) {
    const findings = await prisma.finding.findMany({
      where: { organizationId: principal.organizationId, matterId },
      include: { control: { select: { code: true, title: true } } },
      orderBy: { riskScore: "desc" },
    });
    const risk = findings.reduce((sum, item) => sum + item.riskScore, 0);
    return {
      complianceScore: Math.max(
        0,
        Math.round(100 - risk / Math.max(1, findings.length)),
      ),
      bySeverity: Object.fromEntries(
        ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((severity) => [
          severity,
          findings.filter((item) => item.severity === severity).length,
        ]),
      ),
      findings,
    };
  }
}
