-- Keep Prisma's migration history private to the migration owner.
-- Runtime roles must not inspect or mutate deployment history.
-- Role names differ between isolated Preview and Production environments;
-- absent roles are intentionally ignored (for example, local CI databases).

DO $$
DECLARE
  app_role TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY[
    'nexafilm_app',
    'nexafilm_app_test'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = app_role
    ) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM %I',
        app_role
      );
    END IF;
  END LOOP;
END
$$;
