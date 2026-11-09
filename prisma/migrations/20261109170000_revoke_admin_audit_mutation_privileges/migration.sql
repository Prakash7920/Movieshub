-- Keep the production application role append-only at the privilege layer too.
-- The role exists in Production but may be absent on isolated Preview branches.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexafilm_app') THEN
    EXECUTE 'GRANT SELECT, INSERT ON TABLE "AdminAuditLog" TO nexafilm_app';
    EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "AdminAuditLog" FROM nexafilm_app';
  END IF;
END
$$;
