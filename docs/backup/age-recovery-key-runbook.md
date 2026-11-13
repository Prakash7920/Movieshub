# AGE Recovery-Key Custody and Disaster-Recovery Runbook

## Scope and safety boundary

This runbook defines the intended custody and recovery process for NexaFilm AGE-encrypted backups. The lifecycle test uses disposable identities and synthetic files only. It does not provision, rotate, copy, or inspect any Production key, GitHub secret, database, or backup.

## Key roles

- **Public recipient:** encryption destination. It is not a decryption secret. Store the approved recipient as a GitHub Actions variable, not as a private identity.
- **Primary private identity:** restricted decryption key held offline by the designated recovery custodian.
- **Emergency private identity:** independent recovery copy held in a separate secure location with separately controlled access.
- **Historical identities:** retain for as long as any retained backup depends on them.

Never commit private identities, paste them into chat, print them in CI logs, or store the only copy in the same GitHub account or cloud location as the encrypted backups. Apply least-privilege access and a documented access-review process.

## Backup recipient policy

For each backup generation, record a non-secret key-generation identifier, creation date, public recipient fingerprint, and the backup retention period. Where emergency recovery is required, encrypt new backups to both the primary and emergency public recipients. The isolated backup helper now accepts one or more recipient arguments, and the lifecycle CI exercises both primary and emergency recipients. The existing Production backup workflow does not yet invoke this AGE helper; do not rely on this policy in Production until a separately approved migration updates the Production workflow and its key-custody configuration.

## Recovery procedure

1. Identify the backup artifact and its key-generation record.
2. Retrieve the corresponding private identity from the approved offline custody location.
3. Verify access authorization and the identity's recorded fingerprint without exposing the identity contents.
4. Decrypt into a restricted temporary directory on an isolated recovery host.
5. Confirm authenticated decryption succeeds and validate the resulting archive before restore.
6. Restore only into an explicitly approved isolated target; verify database identity, schema, migration state, and expected row counts.
7. Record operator, timestamps, backup identifier, key generation, validation results, and elapsed recovery time. Do not record private key material.

If the primary identity is unavailable, follow the same steps with the independently held emergency identity. Do not weaken ciphertext validation or attempt partial restore after decryption failure.

## Rotation procedure

1. Generate a new AGE identity in a trusted, offline environment.
2. Protect the private identity and create the independent emergency custody copy.
3. Verify the public recipient and perform an isolated encrypt/decrypt test.
4. Update the approved recipient for future backups through a reviewed change.
5. Produce a new test backup and verify recovery with the new identity.
6. Keep all old identities needed by retained historical backups.
7. Retire an old identity only after the retention inventory proves no retained backup depends on it, or after an independently verified re-encryption/migration of those backups.

Rotation does not make historical ciphertext decryptable with the new key automatically. Keep the old private identity until its backups expire or are safely migrated.

## Incident response

- **Lost primary key:** use the emergency identity; preserve the lost-key incident record.
- **Suspected key compromise:** restrict access, generate a replacement identity, switch future backups after validation, and assess exposure of all backups encrypted to the compromised recipient.
- **Corrupt or tampered backup:** reject it; retrieve another independently stored copy. Never bypass AGE authentication.
- **Lost GitHub access:** retrieve encrypted backup and private identity independently of GitHub.
- **Custodian unavailable:** invoke the documented emergency access process; do not share keys through chat or tickets.

## Operational validation cadence

Perform a quarterly isolated recovery drill and after material changes to backup tooling or key custody. Measure recovery time and the oldest recoverable backup. Review key access at least annually and after personnel or account changes.

## Production readiness gates

This document is a design/runbook, not evidence of Production key provisioning. Before any Production rollout, separately approve: recipient configuration, independent storage, custodian assignments, emergency access, multi-recipient support, key inventory, restore target controls, and a tested end-to-end recovery exercise.
