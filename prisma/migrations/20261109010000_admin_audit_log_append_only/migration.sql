-- Preserve actor identity as an immutable snapshot, independent of User lifecycle.
ALTER TABLE "AdminAuditLog"
  DROP CONSTRAINT IF EXISTS "AdminAuditLog_actorUserId_fkey";

ALTER TABLE "AdminAuditLog"
  ADD COLUMN "actorEmail" TEXT;

UPDATE "AdminAuditLog" AS audit
SET "actorEmail" = COALESCE(
  (SELECT "email" FROM "User" WHERE "User"."id" = audit."actorUserId"),
  'unknown@deleted.invalid'
)
WHERE "actorEmail" IS NULL;

ALTER TABLE "AdminAuditLog"
  ALTER COLUMN "actorEmail" SET NOT NULL;

CREATE OR REPLACE FUNCTION prevent_admin_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AdminAuditLog is append-only; % is prohibited', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "AdminAuditLog_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "AdminAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_log_mutation();

CREATE TRIGGER "AdminAuditLog_prevent_truncate"
BEFORE TRUNCATE ON "AdminAuditLog"
FOR EACH STATEMENT EXECUTE FUNCTION prevent_admin_audit_log_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "AdminAuditLog" FROM PUBLIC;
