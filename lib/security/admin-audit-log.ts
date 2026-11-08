import { Prisma } from "@prisma/client";

export type AdminAuditEvent = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Persist an admin event using the caller's transaction client.
 * Call this inside the same transaction as the privileged mutation so the
 * mutation and its audit record commit or roll back together.
 *
 * Only pass minimal, non-sensitive metadata. Never include credentials,
 * tokens, session values, payment secrets, or full request bodies.
 */
export async function writeAdminAuditLog(
  tx: Prisma.TransactionClient,
  event: AdminAuditEvent,
): Promise<void> {
  await tx.adminAuditLog.create({
    data: {
      actorUserId: event.actorUserId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId ?? null,
      ...(event.metadata === undefined ? {} : { metadata: event.metadata }),
    },
    select: { id: true },
  });
}
