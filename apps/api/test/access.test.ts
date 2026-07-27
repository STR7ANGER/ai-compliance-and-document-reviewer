import { describe, expect, it } from "vitest";
import { Metrics } from "../src/metrics.js";
import {
  type AccessRepository,
  AccessService,
  type Principal,
} from "../src/modules/access/service.js";

class Memory implements AccessRepository {
  mattersByOrganization = new Map<string, Record<string, unknown>[]>();
  expired = 0;
  async bootstrap() {
    return { organizationId: "organization", userId: "owner" };
  }
  async principalForHash() {
    return {
      organizationId: "organization",
      userId: "owner",
      role: "OWNER" as const,
    };
  }
  async createMatter(input: Parameters<AccessRepository["createMatter"]>[0]) {
    const matter = { id: "matter", ...input };
    this.mattersByOrganization.set(input.organizationId, [matter]);
    return matter;
  }
  async matters(organizationId: string) {
    return this.mattersByOrganization.get(organizationId) ?? [];
  }
  async audit() {
    return [{ action: "matter.created" }];
  }
  async expire() {
    return { expired: this.expired };
  }
}

const editor: Principal = {
  organizationId: "organization",
  userId: "reviewer",
  role: "REVIEWER",
};

describe("organization access", () => {
  it("returns a one-time API key and authenticates its hash", async () => {
    const service = new AccessService(
      new Memory(),
      "p".repeat(32),
      new Metrics(),
    );
    const created = await service.bootstrap({
      organizationName: "Acme Legal",
      organizationSlug: "acme-legal",
      ownerEmail: "owner@example.com",
    });
    expect(created.apiKey).toMatch(/^cr_/);
    await expect(
      service.authenticate(`Bearer ${created.apiKey}`),
    ).resolves.toMatchObject({ role: "OWNER" });
  });
  it("keeps viewers read-only and scopes matter lists", async () => {
    const repository = new Memory();
    const service = new AccessService(
      repository,
      "p".repeat(32),
      new Metrics(),
    );
    await expect(
      service.createMatter(
        { ...editor, role: "VIEWER" },
        { name: "Contract review" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await service.createMatter(editor, {
      name: "Contract review",
      classification: "CONFIDENTIAL",
      retentionDays: 30,
    });
    await expect(service.matters(editor)).resolves.toHaveLength(1);
    await expect(
      service.matters({ ...editor, organizationId: "other" }),
    ).resolves.toEqual([]);
  });
  it("restricts audit and retention controls to administrators", async () => {
    const service = new AccessService(
      new Memory(),
      "p".repeat(32),
      new Metrics(),
    );
    await expect(
      Promise.resolve().then(() => service.audit(editor)),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      Promise.resolve().then(() => service.expire(editor)),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.expire({ ...editor, role: "ADMIN" })).resolves.toEqual(
      { expired: 0 },
    );
  });
});
