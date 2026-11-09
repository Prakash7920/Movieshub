import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { writeAdminAuditLog } from "../lib/security/admin-audit-log";

describe("transactional admin audit writer", () => {
  it("writes actor, action, target, and minimal metadata through supplied transaction", async () => {
    const create = vi.fn().mockResolvedValue({ id: "audit-event-1" });
    const tx = { adminAuditLog: { create } } as unknown as Prisma.TransactionClient;

    await writeAdminAuditLog(tx, {
      actorUserId: "admin-user-1",
      actorEmail: "admin@example.test",
      action: "MOVIE_DRAFT_CREATED",
      targetType: "Movie",
      targetId: "movie-1",
      metadata: { slug: "sample-title" },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        actorUserId: "admin-user-1",
        actorEmail: "admin@example.test",
        action: "MOVIE_DRAFT_CREATED",
        targetType: "Movie",
        targetId: "movie-1",
        metadata: { slug: "sample-title" },
      },
      select: { id: true },
    });
  });

  it("stores a null target id when the target has not been created yet", async () => {
    const create = vi.fn().mockResolvedValue({ id: "audit-event-2" });
    const tx = { adminAuditLog: { create } } as unknown as Prisma.TransactionClient;

    await writeAdminAuditLog(tx, {
      actorUserId: "admin-user-1",
      action: "TEST_ACTION",
      targetType: "Movie",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        actorUserId: "admin-user-1",
        action: "TEST_ACTION",
        targetType: "Movie",
        targetId: null,
      },
      select: { id: true },
    });
  });

  it("propagates audit persistence failures so the enclosing transaction can roll back", async () => {
    const create = vi.fn().mockRejectedValue(new Error("audit database unavailable"));
    const tx = { adminAuditLog: { create } } as unknown as Prisma.TransactionClient;

    await expect(writeAdminAuditLog(tx, {
      actorUserId: "admin-user-1",
      action: "MOVIE_PUBLISHED",
      targetType: "Movie",
      targetId: "movie-1",
    })).rejects.toThrow("audit database unavailable");
  });
});
