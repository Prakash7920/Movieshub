"use client";

import Link from "next/link";

export default function BackupPrivacyPage() {
  return (
    <main className="page-shell py-10 md:py-16">
      <article className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-gray-300 md:p-10 md:text-base">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">NexaFilm · Backup utility</p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-5xl">Privacy Policy — NexaFilm Database Backup</h1>
        <p className="mt-3 text-sm text-gray-400">Effective date: 6 November 2026 · Last updated: 6 November 2026</p>

        <p className="mt-6">This notice describes the intended privacy practices for the NexaFilm Database Backup utility (the “Backup Utility”), operated under the name NexaFilm. It is intended for the NexaFilm operator and authorised administrators who may connect a Google Account to store backup files in that account’s Google Drive. It is not the privacy policy for ordinary NexaFilm streaming-site visitors; see the <Link className="text-amber-300 underline" href="/privacy">NexaFilm website Privacy Policy</Link>.</p>

        <p className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-amber-100"><strong>Current status:</strong> The Backup Utility is being configured and tested. Automated database backup uploads are not represented as active or complete by this notice. Do not rely on this utility for disaster recovery until the implementation, encryption, access controls and restore process have been independently tested.</p>

        <div className="mt-8 space-y-7">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Operator and contact</h2>
            <p>The utility is operated under the name NexaFilm. This name does not represent that NexaFilm is a separately incorporated legal entity. For privacy questions or requests, contact <a className="text-amber-300 underline" href="mailto:supportnexafilm@gmail.com">supportnexafilm@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. Google Account data and Drive access</h2>
            <p>If an authorised operator chooses to connect a Google Account, the utility requests the Google Drive <code>drive.file</code> permission. This permission is intended to let the application create and manage files that it creates or that the user explicitly opens with the application; it does not grant general access to every file in the Google Drive account. Google displays the requested permission during its consent process. The operator can review or revoke the application’s access through their Google Account security settings.</p>
            <p className="mt-2">The utility is designed to use Drive only as a destination for NexaFilm backup artifacts and related integrity information. It does not need Gmail, Contacts, Calendar or general Drive-wide access.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. Backup contents</h2>
            <p>A PostgreSQL database backup may contain account email addresses, usernames, password hashes, profile information, application records, payment references, security logs and hashed authentication-token records. A backup may therefore contain personal and confidential information. The operator should restrict who can initiate, download, restore or share backup files.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Intended processing and purposes</h2>
            <p>When implemented and enabled, the utility is intended to create database backup files, protect them before transfer, upload them to the operator’s selected Google Drive backup folder, and retain checksums and operational metadata to support integrity checks and recovery testing. These operations are for service continuity, disaster recovery, security and audit purposes.</p>
            <p className="mt-2"><strong>Encryption status:</strong> Encryption before upload is a required implementation control in the planned workflow, not a claim that the current setup has already completed or verified encrypted uploads. Do not upload production or personal database data until encryption, key management, file permissions and restore procedures have been tested.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Google API data use and sharing</h2>
            <p>Google user data accessed through the Drive API will be used only to provide the user-requested backup-storage functionality described in this notice. It will not be sold, used for advertising, or used to develop or train general-purpose artificial-intelligence or machine-learning models. It will not be disclosed to third parties except to provide the requested functionality, comply with law, protect security, or as otherwise authorised by the user.</p>
            <p className="mt-2">The utility’s use and transfer of information received from Google APIs will comply with the Google API Services User Data Policy, including its Limited Use requirements. Google independently processes data under Google’s own terms and privacy disclosures.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. Storage, retention and deletion</h2>
            <p>Backup files are intended to be stored in a Drive folder selected and controlled by the authorised operator. Exact backup frequency, retention periods, deletion automation and recovery-point objectives have not yet been finalised or verified. Until those controls are documented and tested, the operator must not assume that a backup exists, is current, or can be restored.</p>
            <p className="mt-2">The operator can delete backup files from the designated Drive folder. Revoking Google access prevents future API access but does not itself delete files already stored in Drive. Those files must be deleted separately when no longer required, subject to applicable legal or incident-response retention needs.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">7. Security and access</h2>
            <p>Access should be limited to authorised operators using least-privilege permissions. OAuth credentials, database credentials and encryption keys must be stored in approved secret-management facilities and must not be committed to source control, included in logs, or shared in support messages. No internet-connected system can guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">8. International processing</h2>
            <p>Google and other infrastructure providers may process information in locations outside the operator’s country. Their processing is subject to their terms, privacy notices and applicable safeguards. The operator should confirm the selected provider configuration and applicable legal requirements before enabling backups.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">9. Privacy requests and changes</h2>
            <p>For questions about this notice or a request concerning information handled by the Backup Utility, contact <a className="text-amber-300 underline" href="mailto:supportnexafilm@gmail.com">supportnexafilm@gmail.com</a>. We may need to verify the requester’s authority before acting. This notice may be updated when the utility’s actual data flows, providers or retention controls are finalised.</p>
          </section>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-6 text-gray-500">This notice is a working draft for the described backup utility, not legal advice or a certification of Google policy compliance. Before publication or production use, NexaFilm must verify the actual implementation, complete its security and retention controls, and obtain appropriate legal review.</p>
        <p className="mt-4 text-sm"><Link className="text-amber-300 underline" href="/backup-terms">Backup Utility Terms</Link> · <Link className="text-amber-300 underline" href="/">NexaFilm homepage</Link></p>
      </article>
    </main>
  );
}
