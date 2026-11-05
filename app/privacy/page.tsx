"use client";

import Link from "next/link";

const sections = [
  {
    title: "1. Who is responsible for your information?",
    body: <>NexaFilm ("NexaFilm", "we", "us" or "our") operates <Link className="text-amber-300 underline" href="/">nexafilm.in</Link>. For privacy questions or requests, contact <a className="text-amber-300 underline" href="mailto:supportnexafilm@gmail.com">supportnexafilm@gmail.com</a>. This page identifies the service operator as NexaFilm; it does not represent that NexaFilm is a separately incorporated legal entity.</>,
  },
  {
    title: "2. Information we may collect",
    body: <>Depending on the features you use, information may include:
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li><strong>Account details:</strong> email address, username, name, password hash, profile image, account role and account status.</li>
        <li><strong>Profile and preferences:</strong> display name, preferred language, avatar and theme preference.</li>
        <li><strong>Service activity:</strong> watchlist entries, viewing progress and history, ratings, reviews, recommendations and reports you submit.</li>
        <li><strong>Subscription and transaction records:</strong> plan, billing cycle, amount, currency, payment status and transaction references, if subscription or payment features are enabled. Payment card or bank credentials should be handled by the payment provider, not entered into NexaFilm support messages.</li>
        <li><strong>Security and technical information:</strong> session and authentication data, security events, rate-limit records, and technical logs needed to operate and protect the service.</li>
        <li><strong>Messages:</strong> information you include when contacting support.</li>
      </ul>
      We do not ask you to send passwords, one-time codes, payment credentials or government identity numbers by email.</>,
  },
  {
    title: "3. Why we use information",
    body: <>We use information only as needed to provide and protect the service, including to create and manage accounts, authenticate users, remember preferences, maintain watchlists and viewing progress, respond to reviews or reports, provide requested features, process subscriptions if enabled, send essential account or security messages, prevent abuse, troubleshoot issues, meet legal obligations and handle disputes. We will explain and seek consent where applicable before using information for a new purpose that requires it.</>,
  },
  {
    title: "4. Legal grounds and your choices",
    body: <>Where applicable law requires consent, we will request it for the stated purpose. You may withdraw consent or ask us to stop optional processing by contacting us at <a className="text-amber-300 underline" href="mailto:supportnexafilm@gmail.com">supportnexafilm@gmail.com</a>. Withdrawal does not affect processing already carried out lawfully, and some information may still need to be retained to provide a service you request, protect security, resolve disputes or comply with law.</>,
  },
  {
    title: "5. Cookies and similar technologies",
    body: <>The service may use essential browser storage, cookies or similar technologies to maintain sign-in sessions, protect accounts and remember settings. These are used to make core features work. This policy does not claim that advertising or analytics cookies are currently in use. If optional analytics, advertising or other non-essential tracking is introduced, this notice and any required consent controls will be updated before use.</>,
  },
  {
    title: "6. When information may be shared",
    body: <>We do not sell personal information. We may share limited information with service providers that help host the website, operate the database, deliver account emails, secure the service or process payments if those features are enabled. They may process information only for their contracted service purposes. We may also disclose information where required by law, to respond to valid legal process, protect users or the service, or handle a business reorganisation. We do not share viewing activity with advertisers as a current stated practice.</>,
  },
  {
    title: "7. Storage, security and retention",
    body: <>Information is handled using technical and organisational safeguards intended to protect it against unauthorised access, loss, misuse or alteration. No internet service can promise absolute security. We retain information for as long as reasonably needed for the purposes described here, while an account is active, and for any additional period required for security, accounting, legal compliance or dispute resolution. Retention periods depend on the type of record and applicable law. We will securely delete or de-identify information when it is no longer required, subject to lawful retention obligations.</>,
  },
  {
    title: "8. Processing in other locations",
    body: <>Our hosting, database, email and other technology providers may process information in locations outside your state or country, depending on the service configuration and provider. Where cross-border processing occurs, we will take steps required by applicable law and use appropriate contractual or other safeguards. Contact us if you need more information about the providers relevant to your account.</>,
  },
  {
    title: "9. Your privacy requests",
    body: <>Subject to applicable law, you may ask us to confirm whether we process your personal information, access or correct it, request erasure, withdraw consent, raise a grievance, or nominate another person where the law permits. Email <a className="text-amber-300 underline" href="mailto:supportnexafilm@gmail.com">supportnexafilm@gmail.com</a> from your registered email address and describe your request. We may ask for reasonable information to verify that you control the account. We aim to respond within the period required by applicable law. You may also have the right to complain to the competent data protection authority.</>,
  },
  {
    title: "10. Children",
    body: <>NexaFilm accounts are intended for people aged 18 or older. Do not create an account or provide personal information if you are under 18. If we learn that personal information has been collected from a person under 18 without legally required authorisation, contact us so we can review and take appropriate steps.</>,
  },
  {
    title: "11. Third-party links and content",
    body: <>The service may link to third-party websites or services. Their privacy practices are governed by their own notices, not this policy. Please review those notices before sharing information with them.</>,
  },
  {
    title: "12. Changes to this policy",
    body: <>We may update this policy as the service, technology or applicable law changes. We will publish the revised version here and update the effective date. If a change materially affects how we use personal information, we will provide additional notice or seek consent where required.</>,
  },
  {
    title: "13. Contact",
    body: <>For privacy questions, access or deletion requests, consent withdrawal or grievances, contact:<br /><strong>NexaFilm Privacy Support</strong><br /><a className="text-amber-300 underline" href="mailto:supportnexafilm@gmail.com">supportnexafilm@gmail.com</a><br /><Link className="text-amber-300 underline" href="/terms">Terms of Service</Link></>,
  },
];

export default function PrivacyPage() {
  return (
    <main className="page-shell py-10 md:py-16">
      <article className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">NexaFilm · Legal</p>
        <h1 className="mt-3 text-3xl font-bold md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-gray-400">Effective date: 6 November 2026 · Last updated: 6 November 2026</p>
        <p className="mt-6 leading-7 text-gray-300">This policy explains what information NexaFilm may collect, why it is used, when it may be shared and how you can contact us about your privacy. It applies to the NexaFilm website and related services.</p>
        <div className="mt-8 space-y-8 text-sm leading-7 text-gray-300 md:text-base">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 text-lg font-semibold text-white md:text-xl">{section.title}</h2>
              <div>{section.body}</div>
            </section>
          ))}
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-6 text-gray-500">This is a general privacy notice draft, not legal advice. NexaFilm should verify actual production data flows, service providers, retention settings and applicable legal obligations before launch.</p>
      </article>
    </main>
  );
}
