# NexaFilm Backup Encryption Cutover and Rollback Design

**Status:** Proposed design — not approved for Production execution  
**Roadmap:** Phase 5.7.17  
**Scope:** Migration planning for the existing OpenSSL-encrypted PostgreSQL backup workflow to AGE  
**Change boundary:** Documentation only. No Production or Preview database, secret, key, backup artifact, storage location, or deployment is accessed or changed by this phase.

## 1. Executive decision

Do not replace the Production backup workflow in one step. Use a gated, reversible migration with an explicit compatibility period:

1. Preserve the current OpenSSL restore path for every historical `.enc` backup.
2. Complete AGE tooling, lifecycle, and disposable dual-format restore validation first.
3. Approve real key custody and independent backup storage before enabling AGE for Production.
4. Run a controlled dual-format period, if the approved storage and operational budget support it.
5. Declare AGE the primary format only after repeated scheduled backups and independent restore drills pass.
6. Keep the legacy OpenSSL restore capability and historical passphrase for as long as any retained OpenSSL backup depends on them.

**No automatic deletion, key retirement, format conversion, or Production cutover is authorized by this design.**

## 2. Verified current state

The current default-branch workflow `.github/workflows/neon-production-backup.yml`:

- Runs on a daily schedule (21:00 UTC / 02:30 India Standard Time) and manual dispatch.
- Uses `pg_dump --format=custom --no-owner --no-acl`.
- Encrypts the dump with OpenSSL AES-256-CBC, salt, and PBKDF2.
- Reads `PRODUCTION_DATABASE_URL` and `BACKUP_ENCRYPTION_PASSPHRASE` from GitHub Actions secrets.
- Uploads `nexafilm-production.dump.enc` as a GitHub Actions artifact with **7-day retention**.

The current restore-validation workflow `.github/workflows/neon-backup-restore-validation.yml`:

- Downloads the artifact from a specified successful backup run.
- Decrypts it with the same OpenSSL passphrase.
- Validates the archive with `pg_restore --list`.
- Requires the target database name to equal `restore_validation` before restore.
- Restores with `pg_restore --exit-on-error --no-owner --no-acl` and checks schema/table information and selected row counts.

The AGE encryption and recovery helpers, key lifecycle tests, and disposable dual-format restore rehearsal exist on separate open Draft pull requests. They are not the Production backup or restore implementation. The dual-format rehearsal used synthetic data, disposable credentials and identities, and isolated CI PostgreSQL databases.

### Current-state limitations

- A 7-day Actions artifact is not a long-term backup-retention or independent disaster-recovery strategy.
- The current OpenSSL AES-CBC format does not provide authenticated encryption. Do not reinterpret a successful CBC decryption or archive listing as cryptographic authenticity.
- OpenSSL `.enc` and AGE `.age` files are incompatible formats. Each requires its matching decryption process and key material.
- The present isolated AGE rehearsal proves synthetic archive compatibility, not recovery of a real Production backup, measured Production RTO, or operational custody readiness.
- Independent offsite/object storage, its retention/immutability policy, and its restore access path have not been established by the reviewed workflow.

## 3. Format compatibility and retention matrix

| Backup generation | File format | Required recovery material | Restore path | Retirement rule |
|---|---|---|---|---|
| Historical / current legacy | `.dump.enc` | Original `BACKUP_ENCRYPTION_PASSPHRASE` | OpenSSL decrypt, then `pg_restore` | Retain passphrase and restore procedure until every dependent backup has expired or been independently migrated and verified |
| AGE transition | `.dump.age` | Matching AGE private identity; primary or emergency recipient | AGE authenticated decrypt, archive validation, then `pg_restore` | Retain every identity needed by every retained AGE backup |
| Post-cutover AGE | `.dump.age` | Approved current AGE identity set | AGE authenticated decrypt, archive validation, then `pg_restore` | Rotate only after inventory proves no retained backup depends on the old identity |

Never try to decrypt an OpenSSL artifact with AGE or an AGE artifact with OpenSSL. Keep format and key-generation metadata with each backup. Never overwrite a legacy artifact with a converted file.

For any proposed re-encryption of a historical backup, retain the original until the replacement has been independently decrypted, archive-validated, restored to an isolated target, and formally accepted.

## 4. Phased migration sequence

### Gate 0 — Design and ownership approval

Before any Production change, obtain written approval for:

- Business owner and technical owner for backup/recovery.
- Required recovery point objective (RPO) and recovery time objective (RTO).
- Retention duration, legal/operational holds, and deletion authority.
- Independent storage provider/location, access model, encryption-at-rest controls, retention/immutability controls, and cost.
- Primary and emergency key custodians and the emergency-access procedure.
- Production change window, rollback authority, and incident escalation path.

**Exit evidence:** approved decisions recorded in the change ticket. Missing decisions block cutover.

### Gate 1 — Non-Production implementation readiness

- Keep the existing Production OpenSSL workflows unchanged.
- Complete review and merge of the AGE helper, lifecycle, and dual-format rehearsal work through their normal review process.
- Add or validate a non-Production AGE workflow using disposable credentials and synthetic data first.
- Verify multi-recipient encryption, primary recovery, emergency recovery, wrong-key rejection, tamper rejection, and no partial plaintext publication.
- Verify archive listing, isolated restore, schema/data checks, and a repeat restore into a newly created clean target.
- Record measured drill duration and the oldest recoverable test artifact.

**Exit evidence:** all relevant CI jobs green on the reviewed commits, plus a non-Production restore report. CI alone is not Production approval.

### Gate 2 — Production prerequisites (approval required; no action implied)

- Generate Production AGE identities in an approved trusted environment, not in ordinary CI.
- Store private identities offline in two independently controlled custody locations. The emergency copy must not share the primary custodian, physical location, or sole cloud/account failure domain.
- Store only public recipients and non-secret key-generation metadata in the approved configuration system.
- Establish a non-secret inventory mapping each backup generation to its format, creation time, recipient fingerprint/key-generation ID, retention expiry, and storage location.
- Verify that the approved backup storage is independent of the GitHub Actions run/artifact lifecycle and that recovery can access it if GitHub is unavailable.
- Confirm the historical OpenSSL passphrase is recoverable by authorized custodians and is not being rotated away while legacy backups remain.
- Confirm target-project/account verification and an explicit isolated restore target guard before any real backup restore.

**Exit evidence:** custody drill, access review, storage restore test, and written Production change approval. Do not place private identities in GitHub variables, repository files, chat, tickets, or CI logs.

### Gate 3 — Controlled dual-format transition

Only after Gates 0–2 are approved:

- Preserve the existing OpenSSL workflow as the known rollback path.
- Introduce AGE as a separately named and separately testable backup output; never silently change the extension or decryption method of the existing artifact.
- If dual-writing both formats, use distinct artifact names and a shared backup-generation identifier so operators can prove both came from the same logical backup run.
- Retain both formats throughout the approved transition window. Recommended minimum: **30 consecutive days and at least two successful scheduled backup cycles plus two successful isolated restore drills**, whichever takes longer. The owner may require a longer period.
- Validate each format through its own decrypt-and-restore path. A green encryption job is not a restore success.
- Do not remove the OpenSSL workflow, secret, or restore path during this period.

**Exit evidence:** complete inventory, successful scheduled runs, two documented restore drills, no unresolved recovery defects, and approval from the named backup owner.

### Gate 4 — AGE-primary cutover

A separate Production change approval is mandatory. The cutover change must:

- Make AGE the primary Production backup format only after the preceding gates pass.
- Keep the legacy OpenSSL restore workflow available for historical `.enc` files.
- Keep the original passphrase under controlled custody for the full lifetime of dependent legacy backups.
- Keep AGE private identities under offline primary/emergency custody.
- Confirm artifact retention and independent storage meet the approved RPO/RTO and retention policy.
- Confirm alerting for missed backup runs, failed encryption, missing artifacts, failed restore drills, and storage-capacity/access failures.
- Record the first AGE Production backup identifier and the verified restore evidence.

The cutover is not complete merely because the workflow succeeds in creating an AGE file.

## 5. Key custody and rotation policy

### Key roles

- **Public recipient:** non-secret encryption destination; it is safe to use in the approved workflow configuration.
- **Primary private identity:** offline, access-controlled recovery material held by the designated primary custodian.
- **Emergency private identity:** independently held recovery material with a documented dual-control or break-glass access procedure.
- **Historical identities:** preserved for as long as any retained AGE backup requires them.

For every AGE backup generation, record a non-secret key-generation ID and recipient fingerprint. Encrypt to both primary and emergency public recipients where the approved recovery policy requires two-person resilience.

### Rotation

1. Generate the new identity in the approved trusted environment.
2. Establish and verify independent primary and emergency custody.
3. Test encryption/decryption with both identities using disposable data.
4. Change the recipient configuration through a reviewed and approved change.
5. Produce a new test backup and complete an isolated restore.
6. Keep all prior identities while any retained artifact depends on them.
7. Retire an old identity only after the retention inventory proves there are no dependent backups, or after every dependent backup has been independently re-encrypted and the replacement restore has been verified.

Rotation does not re-encrypt historical ciphertext. A new key cannot decrypt an old AGE backup unless that backup was also encrypted to the new recipient.

### Loss or compromise

- Primary key unavailable: invoke the emergency custodian and record the incident.
- Key suspected compromised: restrict access, assess every backup encrypted to that recipient, generate and validate replacement identities, then change future backup recipients through approval.
- Both identities unavailable: treat affected AGE backups as unrecoverable; do not bypass authentication or attempt partial restore.
- Never destroy a potentially required identity as an incident-response shortcut.

## 6. Backup storage and retention policy

The current 7-day GitHub Actions artifact retention is a short-lived transport/test convenience, not a sufficient standalone disaster-recovery policy.

Before cutover, approve and implement an independent storage destination with:

- Retention duration aligned to business, legal, and recovery requirements.
- Versioning or immutable retention controls where appropriate.
- Access credentials and recovery access independent of the GitHub account.
- Encryption at rest and transport security in addition to file-level encryption.
- Monitoring for upload failure, object absence, retention expiry, and storage capacity.
- Periodic retrieval and restore tests from the independent location.

Do not assume a provider, bucket, region, retention duration, or budget in this design. Those are Gate 0 decisions.

Maintain a backup inventory with at least: backup ID, creation timestamp, source environment identifier (non-secret), format, encrypted filename, byte size, checksum of the encrypted object, key-generation ID/fingerprint (AGE only), storage locations, retention expiry, last successful restore-test timestamp, and recovery status. Do not put passphrases or private keys in the inventory.

Apply retention by backup generation and format. A backup may be deleted only after its approved retention period ends, no legal/operational hold applies, and the owner confirms the deletion is safe. Never delete the only known-good copy during a migration or rollback.

## 7. Rollback design

Rollback is a controlled workflow/configuration reversal, not a data-format conversion.

### Trigger conditions

Initiate rollback review if any of the following occurs during transition:

- AGE encryption or upload fails for a scheduled backup.
- The AGE artifact is missing, corrupt, or cannot be retrieved from independent storage.
- Primary and emergency AGE recovery both fail in an approved drill.
- The restored archive fails schema/data validation.
- Key custody, access, or independent storage controls are unavailable or compromised.
- The agreed recovery objectives cannot be met.

### Rollback steps

1. Stop the AGE cutover progression and prevent further workflow promotion.
2. Preserve all existing AGE artifacts and identities; do not delete or overwrite them.
3. Re-enable or retain the known-good OpenSSL backup workflow using the original approved passphrase and the legacy artifact naming convention.
4. Verify a fresh OpenSSL backup and its isolated restore using the legacy restore path.
5. For any backup created only in AGE format, recover it with its matching AGE identity; rollback does not make AGE files OpenSSL-readable.
6. Restore only to a separately approved, verified isolated target. Confirm target project/account and database name before running any restore.
7. Record incident cause, affected backup IDs, last known-good backup, RPO/RTO impact, recovery results, and corrective actions.
8. Keep both format-specific restore paths until all affected backups and the rollback incident are resolved.

### Rollback prohibitions

- Do not delete AGE artifacts or private identities during rollback.
- Do not delete or rotate away the legacy OpenSSL passphrase while legacy backups remain.
- Do not rename one format to look like another.
- Do not overwrite the only known-good backup.
- Do not restore to Production as part of a validation or rollback rehearsal.
- Do not automatically fall back to an older backup without the incident owner's explicit recovery decision.

## 8. Production cutover approval checklist

Every item must be checked and evidenced before a Production cutover can be approved:

- [ ] Business and technical owners named; RPO/RTO and retention approved.
- [ ] PRs for AGE helper, lifecycle, and dual-format rehearsal reviewed and merged under repository policy.
- [ ] Non-Production end-to-end AGE restore passed with primary and emergency identities.
- [ ] Historical OpenSSL restore path verified and original passphrase custody confirmed.
- [ ] Production primary/emergency key custody established independently and recovery access tested.
- [ ] Key-generation inventory and rotation/compromise procedure approved.
- [ ] Independent backup storage provisioned, access-tested, retention/immutability reviewed, and restore-tested.
- [ ] Target-host/project/database identity guards reviewed and verified.
- [ ] Dual-format transition period completed with required scheduled cycles and restore drills.
- [ ] Monitoring, alert ownership, incident escalation, and rollback operator confirmed.
- [ ] Change window and explicit Production execution approval recorded.
- [ ] Post-cutover restore drill scheduled and owner assigned.

A missing item means **NO-GO**.

## 9. Evidence and success criteria for Phase 5.7.17

This phase can pass as a design deliverable when:

- The current Production OpenSSL implementation and its 7-day artifact retention are accurately recorded.
- Format incompatibility and historical-key preservation are explicit.
- The phased cutover sequence has objective gates and evidence requirements.
- Primary/emergency custody, historical identity retention, and rotation are specified.
- Independent storage and retention gaps are explicit rather than assumed solved.
- Rollback steps preserve both formats and all required keys.
- The Production approval checklist has a clear NO-GO rule.
- Documentation review confirms no Production workflow, secret, database, key, backup, or deployment was changed.

**Design PASS does not mean Production migration-ready.** Production remains NO-GO until every applicable checklist item is independently evidenced and a separate explicit change approval is granted.

## 10. References

- Current Production workflow: `.github/workflows/neon-production-backup.yml` (default branch).
- Current restore-validation workflow: `.github/workflows/neon-backup-restore-validation.yml` (default branch).
- AGE recovery-key runbook: `docs/backup/age-recovery-key-runbook.md`.
- Dual-format disposable restore rehearsal: `scripts/backup/test-dual-format-restore.sh` and `.github/workflows/dual-format-restore-rehearsal.yml`.
- Related work remains in Draft PRs #8, #9, and #10 until separately reviewed and merged.
