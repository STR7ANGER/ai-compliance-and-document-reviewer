import {
  commentInput,
  reviewUpdateInput,
  suggestionInput,
} from "@review/contracts";
import { prisma } from "../../db.js";
import type { Principal } from "../access/service.js";
import { DomainError } from "../access/service.js";

const transitions = {
  DRAFT: ["DRAFT", "IN_REVIEW"],
  IN_REVIEW: ["IN_REVIEW", "APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["IN_REVIEW"],
} as const;
export class ReviewService {
  async suggest(principal: Principal, untrusted: unknown) {
    if (principal.role === "VIEWER")
      throw new DomainError("FORBIDDEN", 403, "Suggestions require reviewer.");
    const input = suggestionInput.parse(untrusted);
    const finding = await prisma.finding.findFirst({
      where: { id: input.findingId, organizationId: principal.organizationId },
    });
    if (!finding)
      throw new DomainError("FINDING_NOT_FOUND", 404, "Finding not found.");
    return prisma.revisionSuggestion.create({
      data: {
        findingId: finding.id,
        proposedText: input.proposedText,
        rationale: input.rationale,
        review: {
          create: input.assigneeId ? { assigneeId: input.assigneeId } : {},
        },
      },
      include: { review: true },
    });
  }
  async update(principal: Principal, reviewId: string, untrusted: unknown) {
    if (principal.role === "VIEWER")
      throw new DomainError(
        "FORBIDDEN",
        403,
        "Review changes require reviewer.",
      );
    const input = reviewUpdateInput.parse(untrusted);
    if (
      input.status === "APPROVED" &&
      !["OWNER", "ADMIN"].includes(principal.role)
    )
      throw new DomainError(
        "FORBIDDEN",
        403,
        "Final approval requires administrator.",
      );
    const current = await prisma.review.findFirst({
      where: {
        id: reviewId,
        suggestion: { finding: { organizationId: principal.organizationId } },
      },
    });
    if (!current)
      throw new DomainError("REVIEW_NOT_FOUND", 404, "Review not found.");
    if (
      !(transitions[current.status] as readonly string[]).includes(input.status)
    )
      throw new DomainError(
        "INVALID_TRANSITION",
        409,
        "Invalid review status transition.",
      );
    const updated = await prisma.review.updateMany({
      where: { id: reviewId, revision: input.expectedRevision },
      data: {
        status: input.status,
        revision: { increment: 1 },
        ...(input.assigneeId !== undefined
          ? { assigneeId: input.assigneeId }
          : {}),
      },
    });
    if (!updated.count)
      throw new DomainError(
        "REVISION_CONFLICT",
        409,
        "Review changed; reload and retry.",
      );
    return prisma.review.findUniqueOrThrow({
      where: { id: reviewId },
      include: { comments: true, suggestion: true },
    });
  }
  async comment(principal: Principal, reviewId: string, untrusted: unknown) {
    const input = commentInput.parse(untrusted);
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        suggestion: { finding: { organizationId: principal.organizationId } },
      },
    });
    if (!review)
      throw new DomainError("REVIEW_NOT_FOUND", 404, "Review not found.");
    return prisma.reviewComment.create({
      data: { reviewId, authorId: principal.userId, body: input.body },
    });
  }
}
