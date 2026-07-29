import { createHash } from "node:crypto";
import { extractedObligations, extractionInput } from "@review/contracts";
import { prisma } from "../../db.js";
import type { Metrics } from "../../metrics.js";
import type { Principal } from "../access/service.js";
import { DomainError } from "../access/service.js";
import type { RetrievalService } from "../retrieval/service.js";

export interface StructuredGenerator {
  model: string;
  generate(prompt: string): Promise<{
    output: unknown;
    inputTokens: number;
    outputTokens: number;
  }>;
}
export const reviewGrounding = (
  obligations: Array<{ evidenceIndex: number }>,
  evidenceCount: number,
) => {
  const unsupported = obligations
    .map((item, index) => ({
      outputIndex: index,
      evidenceIndex: item.evidenceIndex,
    }))
    .filter(
      (item) => item.evidenceIndex < 0 || item.evidenceIndex >= evidenceCount,
    );
  return {
    unsupported,
    groundingScore:
      obligations.length === 0
        ? 1
        : 1 - unsupported.length / obligations.length,
  };
};
export class GeminiGenerator implements StructuredGenerator {
  readonly model = "gemini-3.6-flash";
  constructor(private readonly apiKey: string) {}
  async generate(prompt: string) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    if (!response.ok)
      throw new DomainError(
        "MODEL_UNAVAILABLE",
        422,
        "Extraction model unavailable.",
      );
    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };
    return {
      output: JSON.parse(
        body.candidates?.[0]?.content?.parts?.[0]?.text ?? "null",
      ),
      inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}

export class ExtractionService {
  constructor(
    private readonly retrieval: RetrievalService,
    private readonly generator: StructuredGenerator,
    private readonly metrics: Metrics,
  ) {}
  async extract(principal: Principal, untrusted: unknown) {
    if (principal.role === "VIEWER")
      throw new DomainError("FORBIDDEN", 403, "Extraction requires reviewer.");
    const input = extractionInput.parse(untrusted);
    const version = await prisma.documentVersion.findFirst({
      where: {
        id: input.documentVersionId,
        document: { organizationId: principal.organizationId, status: "READY" },
      },
      select: {
        document: { select: { matterId: true, classification: true } },
      },
    });
    if (!version)
      throw new DomainError(
        "DOCUMENT_NOT_FOUND",
        404,
        "Ready document not found.",
      );
    if (version.document.classification === "RESTRICTED")
      throw new DomainError(
        "MODEL_POLICY_BLOCKED",
        403,
        "Restricted data cannot be sent to an external model.",
      );
    let promptVersion = await prisma.promptVersion.findFirst({
      where: {
        organizationId: principal.organizationId,
        key: input.promptKey,
        active: true,
      },
      orderBy: { version: "desc" },
    });
    if (!promptVersion)
      promptVersion = await prisma.promptVersion.create({
        data: {
          organizationId: principal.organizationId,
          key: input.promptKey,
          version: 1,
          template:
            "Extract obligations only from numbered evidence. Cite evidenceIndex.",
          outputSchema: { type: "object", required: ["obligations"] },
          checksum: createHash("sha256").update(input.promptKey).digest("hex"),
        },
      });
    const retrieved = await this.retrieval.search(principal, {
      matterId: version.document.matterId,
      query: input.query,
      limit: 8,
    });
    const evidence = retrieved.hits.map((hit, index) => ({
      index,
      ...hit.citation,
    }));
    const generation = await this.generator.generate(
      `${promptVersion.template}\nEvidence:\n${JSON.stringify(evidence)}`,
    );
    const parsed = extractedObligations.parse(generation.output);
    const grounding = reviewGrounding(parsed.obligations, evidence.length);
    if (grounding.unsupported.length > 0)
      throw new DomainError(
        "UNGROUNDED_OUTPUT",
        422,
        "Model cited unavailable evidence.",
      );
    const output = {
      obligations: parsed.obligations.map((item) => ({
        ...item,
        citation: evidence[item.evidenceIndex],
      })),
    };
    const run = await prisma.extractionRun.create({
      data: {
        organizationId: principal.organizationId,
        documentVersionId: input.documentVersionId,
        promptVersionId: promptVersion.id,
        model: this.generator.model,
        output,
        groundingScore: grounding.groundingScore,
      },
    });
    this.metrics.increment("extraction_runs_total", {
      model: this.generator.model,
    });
    this.metrics.incrementBy("ai_input_tokens_total", generation.inputTokens, {
      model: this.generator.model,
    });
    this.metrics.incrementBy(
      "ai_output_tokens_total",
      generation.outputTokens,
      { model: this.generator.model },
    );
    return { id: run.id, promptVersion: promptVersion.version, ...output };
  }
}
