import Link from "next/link";

const sections = [
  {
    title: "1. About these terms",
    body: <>These Terms of Service ("Terms") govern your access to and use of NexaFilm at <Link className="text-amber-300 underline" href="/">nexafilm.in</Link> and related features (the "Service"). The Service is operated under the name NexaFilm. By using the Service, you agree to these Terms. If you do not agree, do not use it.</>,
  },
  {
    title: "2. Eligibility and accounts",
    body: <>You must be at least 18 years old to create and use a NexaFilm account. You agree to provide accurate account information, keep it up to date, protect your sign-in credentials and promptly tell us if you suspect unauthorised access. You are responsible for activity carried out through your account, except where applicable law provides otherwise. Do not share passwords or verification codes.</>,
  },
  {
    title: "3. Service and content availability",
    body: <>NexaFilm is being developed as a legal streaming and discovery service for films and other audiovisual content across Indian languages. Catalogue descriptions, artwork, availability, languages, subtitles and features may change. Some catalogue entries may be sample metadata used for preview or testing. <strong>Video playback is disabled unless and until the relevant distribution rights and technical permissions have been verified.</strong> A listing does not mean that NexaFilm currently owns, licenses or makes the film available for streaming.</>,
  },
  {
    title: "4. Intellectual property and permitted use",
    body: <>The Service's software, branding, design and original materials are owned by or licensed to NexaFilm or its respective rights holders and are protected by applicable laws. Film titles, posters, artwork, trailers and other third-party materials remain the property of their respective owners. You may use the Service for personal, lawful purposes only. You must not copy, download, record, redistribute, publicly perform, scrape, reverse engineer, bypass access controls or commercially exploit content or the Service except where expressly permitted by law or by written authorisation from the relevant rights holder.</>,
  },
  {
    title: "5. User conduct and submissions",
    body: <>You must not use the Service to break the law, infringe intellectual property or privacy rights, harass others, distribute malware, interfere with security, attempt unauthorised access, manipulate reviews or submit false or abusive reports. If you post a review or other material through an available feature, you are responsible for it and must have the rights needed to submit it. You grant NexaFilm a limited, non-exclusive permission to host, display and use that submission only to operate, moderate and improve the relevant Service feature. We may remove material that violates these Terms or applicable law.</>,
  },
  {
    title: "6. Subscriptions and payments",
    body: <>Any paid plans, prices, billing terms, cancellation rules and payment methods will be shown before you place an order, if and when paid features are launched. No payment is due merely because you browse the current preview catalogue. Where payments are enabled, transactions may be handled by a third-party payment provider and will also be subject to that provider's terms. Nothing in this section represents that paid subscriptions are currently available.</>,
  },
  {
    title: "7. Privacy",
    body: <>Our <Link className="text-amber-300 underline" href="/privacy">Privacy Policy</Link> explains how information is handled and how to submit privacy requests. By using features that require personal information, you acknowledge that information will be processed as described in that policy and as permitted by applicable law.</>,
  },
  {
    title: "8. Third-party services and links",
    body: <>The Service may contain links to third-party websites, platforms or services. NexaFilm does not control and is not responsible for their content, availability, security or terms. Your use of those services is at your own discretion and subject to their terms.</>,
  },
  {
    title: "9. Suspension and termination",
    body: <>We may restrict, suspend or terminate access where reasonably necessary to protect the Service or users, investigate suspected fraud or misuse, enforce these Terms, comply with law or address a security risk. Where appropriate and legally permitted, we will provide notice. You may stop using the Service at any time and request account-related assistance at the contact address below.</>,
  },
  {
    title: "10. Disclaimers and limitation",
    body: <>The Service is provided on an "as available" basis. We do not guarantee uninterrupted access, error-free operation, catalogue availability or compatibility with every device. To the extent permitted by law, NexaFilm is not liable for indirect, incidental, special or consequential loss arising from use of the Service. Nothing in these Terms excludes or limits liability that cannot lawfully be excluded, including rights or remedies available to consumers under applicable law.</>,
  },
  {
    title: "11. Changes to the Service or Terms",
    body: <>We may change, suspend or discontinue features and may update these Terms to reflect changes in the Service or law. Updated Terms will be published on this page with a revised effective date. If a change materially affects your rights, we will provide notice where required.</>,
  },
  {
    title: "12. Governing law and disputes",
    body: <>These Terms are governed by the laws of India, subject to mandatory consumer and other protections that apply to you. Courts and dispute-resolution bodies having jurisdiction under applicable Indian law may hear disputes. Nothing here takes away a right that cannot lawfully be waived.</>,
  },
  {
    title: "13. Contact",
    body: <>For questions, complaints or account support, contact:<br /><strong>NexaFilm Support</strong><br /><a className="text-amber-300 underline" href="mailto:supportnexafilm@gmail.com">supportnexafilm@gmail.com</a><br /><Link className="text-amber-300 underline" href="/privacy">Privacy Policy</Link></>,
  },
];

export default function TermsPage() {
  return (
    <main className="page-shell py-10 md:py-16">
      <article className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">NexaFilm · Legal</p>
        <h1 className="mt-3 text-3xl font-bold md:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-gray-400">Effective date: 6 November 2026 · Last updated: 6 November 2026</p>
        <p className="mt-6 leading-7 text-gray-300">Please read these Terms before using NexaFilm. They explain the basic rules for accounts, catalogue access, intellectual property and use of the Service.</p>
        <div className="mt-8 space-y-8 text-sm leading-7 text-gray-300 md:text-base">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 text-lg font-semibold text-white md:text-xl">{section.title}</h2>
              <div>{section.body}</div>
            </section>
          ))}
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-6 text-gray-500">This is a general terms draft, not legal advice. Have the final terms reviewed for your business structure, consumer obligations, content licences and actual operating practices before launch.</p>
      </article>
    </main>
  );
}
