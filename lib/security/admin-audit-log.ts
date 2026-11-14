import { Prisma } from "@prisma/client";

// Accepts a Prisma transaction client so the audit event can commit atomically
// with the administrative mutation. Do not put secrets, tokens, or user PII in metadata.
type AuditClient = Pick<Prisma.TransactionClient, "adminAuditLog">;

export async function writeAdminAuditEvent(
  client: AuditClient,
  input: {
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Prisma.InputJsonObject;
  },
): Promise<void> {
  await client.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
    },
  });
}
