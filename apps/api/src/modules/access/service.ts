import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@prisma/client";
import { bootstrapInput, matterCreateInput } from "@review/contracts";
import type { Metrics } from "../../metrics.js";

export type Principal = { userId: string; organizationId: string; role: Role };
export interface AccessRepository {
  bootstrap(input: {
    organizationName: string;
    organizationSlug: string;
    ownerEmail: string;
    tokenHash: string;
    prefix: string;
  }): Promise<{ organizationId: string; userId: string } | "EXISTS">;
  principalForHash(hash: string): Promise<Principal | null>;
  createMatter(input: {
    organizationId: string;
    actorId: string;
    name: string;
    classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
    retentionDays: number;
  }): Promise<Record<string, unknown> | "EXISTS">;
  matters(organizationId: string): Promise<Record<string, unknown>[]>;
  audit(organizationId: string): Promise<Record<string, unknown>[]>;
  expire(
    organizationId: string,
    actorId: string,
    now: Date,
  ): Promise<{ expired: number }>;
}

export class DomainError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 401 | 403 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
  }
}
const hashToken = (token: string, pepper: string) =>
  createHash("sha256").update(`${pepper}:${token}`).digest("hex");

export class AccessService {
  constructor(
    private readonly repository: AccessRepository,
    private readonly pepper: string,
    private readonly metrics: Metrics,
  ) {}
  async bootstrap(untrusted: unknown) {
    const input = bootstrapInput.parse(untrusted);
    const apiKey = `cr_${randomBytes(32).toString("base64url")}`;
    const result = await this.repository.bootstrap({
      ...input,
      tokenHash: hashToken(apiKey, this.pepper),
      prefix: apiKey.slice(0, 14),
    });
    if (result === "EXISTS")
      throw new DomainError(
        "ORGANIZATION_EXISTS",
        409,
        "Organization already exists.",
      );
    this.metrics.increment("organizations_created_total");
    return { ...result, apiKey };
  }
  async authenticate(header: string | undefined) {
    if (!header?.startsWith("Bearer "))
      throw new DomainError("UNAUTHENTICATED", 401, "Bearer API key required.");
    const token = header.slice(7);
    if (!token.startsWith("cr_") || token.length < 40)
      throw new DomainError("UNAUTHENTICATED", 401, "Invalid API key.");
    const principal = await this.repository.principalForHash(
      hashToken(token, this.pepper),
    );
    if (!principal)
      throw new DomainError(
        "UNAUTHENTICATED",
        401,
        "Invalid or revoked API key.",
      );
    return principal;
  }
  async createMatter(principal: Principal, untrusted: unknown) {
    if (principal.role === "VIEWER")
      throw new DomainError(
        "FORBIDDEN",
        403,
        "Matter creation requires reviewer.",
      );
    const input = matterCreateInput.parse(untrusted);
    const result = await this.repository.createMatter({
      organizationId: principal.organizationId,
      actorId: principal.userId,
      ...input,
    });
    if (result === "EXISTS")
      throw new DomainError(
        "MATTER_EXISTS",
        409,
        "Matter name already exists.",
      );
    this.metrics.increment("matters_created_total", {
      classification: input.classification.toLowerCase(),
    });
    return result;
  }
  matters(principal: Principal) {
    return this.repository.matters(principal.organizationId);
  }
  audit(principal: Principal) {
    if (!["OWNER", "ADMIN"].includes(principal.role))
      throw new DomainError(
        "FORBIDDEN",
        403,
        "Audit access requires administrator.",
      );
    return this.repository.audit(principal.organizationId);
  }
  expire(principal: Principal, now = new Date()) {
    if (!["OWNER", "ADMIN"].includes(principal.role))
      throw new DomainError(
        "FORBIDDEN",
        403,
        "Retention sweep requires administrator.",
      );
    return this.repository.expire(
      principal.organizationId,
      principal.userId,
      now,
    );
  }
}
