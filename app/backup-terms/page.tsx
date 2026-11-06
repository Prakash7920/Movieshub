import Link from "next/link";

export default function BackupTermsPage() {
  return (
    <main className="page-shell py-10 md:py-16">
      <article className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-gray-300 md:p-10 md:text-base">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">NexaFilm · Backup utility</p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-5xl">Terms — NexaFilm Database Backup</h1>
        <p className="mt-3 text-sm text-gray-400">Effective date: 6 November 2026 · Last updated: 6 November 2026</p>

        <p className="mt-6">These terms apply to the NexaFilm Database Backup utility (the “Backup Utility”), operated under the name NexaFilm. They are intended for the NexaFilm operator and administrators authorised to configure or use backup functions. They do not replace the <Link className="text-amber-300 underline" href="/terms">NexaFilm website Terms of Service</Link>.</p>

        <p className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-amber-100"><strong>Current status:</strong> The Backup Utility is being configured and tested. It is not yet an operational or verified disaster-recovery service. Do not rely on it as the sole backup or recovery mechanism.</p>

        <div className="mt-8 space-y-7">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Operator and authorised users</h2>
            <p>The utility is operated under the name NexaFilm; this does not represent that NexaFilm is a separately incorporated legal entity. Only the owner and people expressly authorised by the owner may connect accounts, configure backup jobs, access backup files or perform restore tests. Keep Google Account access, database credentials and encryption keys confidential.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. Intended functionality</h2>
            <p>The utility is intended to create PostgreSQL database backup artifacts, protect them before upload, store them in a Google Drive folder selected by the operator, and support checksum verification and isolated restore testing. Features, schedules, retention periods and recovery objectives are not available or guaranteed until implemented and tested. A successful upload alone does not prove that a backup can be restored.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. Google authorisation</h2>
            <p>Connecting Google Drive requires the operator’s express authorisation through Google OAuth. The utility requests the Drive <code>drive.file</code> permission for files it creates or that the user explicitly opens with the application. The operator may revoke access in Google Account security settings. Revocation does not delete files already stored in Drive.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Operator responsibilities</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Use the utility only with databases and Drive accounts for which you have authority.</li>
              <li>Keep Preview and Production databases, credentials, backup folders and access permissions separate.</li>
              <li>Do not upload a database dump until encryption at rest before transfer and secure key handling have been implemented and tested.</li>
              <li>Protect backup files because they may contain personal information, password hashes, payment references and security records.</li>
              <li>Set and periodically review retention, access, recovery-point and recovery-time requirements.</li>
              <li>Perform restore tests only on an isolated database, never by overwriting Production.</li>
              <li>Maintain an additional recovery method appropriate to the importance of the service; do not treat this utility as a guarantee against data loss.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Acceptable use</h2>
            <p>You must not use the utility to access another person’s Google Account or database without permission, bypass security controls, distribute malware, interfere with Google services, or store data unlawfully. You are responsible for ensuring that the data you back up may lawfully be processed and stored in the selected location.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. Third-party services</h2>
            <p>Google Drive, Google OAuth, GitHub Actions, the database provider and hosting providers are third-party services governed by their own terms, availability commitments and privacy notices. NexaFilm does not control their infrastructure or guarantee uninterrupted availability.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">7. Availability and disclaimers</h2>
            <p>The Backup Utility is provided on an “as available” basis during development and testing. No warranty is made that a backup job will run, a file will upload, a backup will be complete, or a restore will succeed. The operator must verify job results and restore evidence independently. Nothing in these terms excludes rights or liabilities that cannot lawfully be excluded.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">8. Suspension and changes</h2>
            <p>Access may be suspended where needed to protect credentials, data, users or third-party services, or to comply with law. Functionality and these terms may change as the utility is developed. Material changes will be reflected on this page.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">9. Governing law and contact</h2>
            <p>These terms are governed by the laws of India, subject to mandatory legal protections. For questions, contact <a className="text-amber-300 underline" href="mailto:supportnexafilm@gmail.com">supportnexafilm@gmail.com</a>.</p>
          </section>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-6 text-gray-500">This is a working terms draft, not legal advice. It must be reviewed against the final backup implementation, operator identity, provider terms and applicable law before public production use.</p>
        <p className="mt-4 text-sm"><Link className="text-amber-300 underline" href="/backup-privacy">Backup Utility Privacy Policy</Link> · <Link className="text-amber-300 underline" href="/">NexaFilm homepage</Link></p>
      </article>
    </main>
  );
}
