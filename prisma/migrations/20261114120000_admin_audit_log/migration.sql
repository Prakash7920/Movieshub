CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_resourceType_resourceId_createdAt_idx" ON "AdminAuditLog"("resourceType", "resourceId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

CREATE OR REPLACE FUNCTION prevent_admin_audit_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AdminAuditLog is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "AdminAuditLog_no_update" ON "AdminAuditLog";
CREATE TRIGGER "AdminAuditLog_no_update" BEFORE UPDATE OR DELETE ON "AdminAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_log_mutation();
