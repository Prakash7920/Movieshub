# MoviesHub backup and restore runbook

## Scope and safety

This runbook is for Neon PostgreSQL and the Vercel-hosted MoviesHub application. The repository cannot inspect the active Neon plan, backup retention, PITR window, encryption settings, or restore permissions. Those items must be confirmed in the Neon console before production launch.

**Never restore a backup over the production database as a test.** Perform all restore validation on a separate Neon branch/database with separate Vercel Preview variables.

## Backup controls to confirm

- Enable the Neon backup/PITR capability appropriate to the production plan.
- Record the configured retention window and the available point-in-time recovery window.
- Agree and document the service's recovery point objective (RPO) and recovery time objective (RTO).
- Confirm encryption in transit and at rest for the selected Neon plan and connection configuration.
- Restrict backup/restore permissions to named operators; use least-privilege database roles for the application.
- Keep database credentials in Vercel environment variables or an approved secret manager, never in backups, source control, CI output, or chat.
- Treat database backups as sensitive: they contain user emails, password hashes, payment references, and hashed reset/verification tokens. Protect backup access and downloads accordingly.
- Test the restore process after material schema changes and at the operational cadence agreed by the team.

## Non-destructive restore validation

1. Record the target restore timestamp and the approved backup/PITR point.
2. Create a new isolated Neon branch/database from that point. Do not select the production branch as the restore target.
3. Set temporary Preview/test `DATABASE_URL` and `DIRECT_URL` values to the isolated branch only.
4. Run `npx prisma migrate status` and review the migration history. Apply pending additive migrations only to this isolated database.
5. Start the application against the isolated database and run the unit, integration, and browser suites.
6. Verify representative record counts and relationships for users, profiles, movies, licences, watchlists, watch history, subscriptions, payments, and reset/verification tokens.
7. Verify licence territory decisions and current publication state. Do not publish or stream media as part of restore testing.
8. Record restore duration, validation results, missing data, and any migration drift.
9. Delete the isolated restore branch only after the validation evidence has been retained and the operator has approved cleanup.

## Production recovery

Production recovery is a separate incident-management action. Require an authorized operator, a current backup/PITR point, a written cutover plan, an impact assessment, and a verified rollback path. Do not run `prisma migrate reset`, `db push`, table truncation, or ad-hoc destructive SQL against production.

## Current validation status

- Backup retention and PITR settings: **PENDING — Neon account access is not available to repository automation.**
- Encrypted restore test on staging: **PENDING — requires an isolated Neon restore branch and operator access.**
- RPO/RTO approval: **PENDING — product/operations owner must define targets.**
- Production data preservation: no production database commands were run during Phase 3 branch implementation.
