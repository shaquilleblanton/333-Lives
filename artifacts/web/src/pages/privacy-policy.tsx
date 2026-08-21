import { Link } from "wouter";

const SECTIONS = [
  {
    id: "overview",
    title: "1. Overview",
    body: (
      <>
        <p>
          333 Lives Enterprises. LLC ("333 Lives," "we," "us," or "our") operates the 333 Lives mobile application and
          website (collectively, the "Service"). This Privacy Policy explains what personal information we collect, how
          we use it, with whom we share it, and the choices you have over your data.
        </p>
        <p className="mt-3 text-sm italic text-amber-300/70">
          ⚠ This document is a working template. It should be reviewed and approved by a licensed attorney before
          public launch or distribution.
        </p>
        <p className="mt-3">
          By using the Service you agree to the practices described here. If you do not agree, please discontinue use
          and contact us to request deletion of your data.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    body: (
      <>
        <p className="mb-3">We collect the following categories of data:</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Account Information</h3>
        <p>Your name, email address, and profile picture (optional) when you create or update your account.
          Authentication is handled by Clerk, Inc. (our identity provider). We do not store your password.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Personal Reflections and Content</h3>
        <p>Anything you choose to write or record: daily intentions, gratitude entries, journal entries, life events,
          goals, habits, tasks, workout logs, legacy letters, future messages, and Secure Vault files. This content
          is private to you unless you explicitly choose to share it (see Section 5).</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Media and Uploaded Files</h3>
        <p>Photos, audio memos, and documents you upload. Media linked to personal reflections is stored securely
          and is private to you. Vault files are encrypted at rest using AES-256-GCM before being stored.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Family and Circle Information</h3>
        <p>Names and relationships of people you add to your People list (private). If you invite someone to your
          Family group or Pulse circle, we collect their email address to send the invitation and link the accounts
          upon acceptance.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Health and Activity Data</h3>
        <p>Workout logs, streak history, and habit completion records that you enter manually. We do not currently
          connect to Apple Health, Google Fit, or any external health data source.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Device and Technical Information</h3>
        <p>Device type, operating system, app version, crash reports, and performance data collected automatically
          to support and improve the Service. See Section 7 for details on crash monitoring.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Usage Data</h3>
        <p>Features you interact with and how often, used anonymously to understand which parts of the product
          are most useful. We do not build individual behavioral profiles for advertising purposes.</p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>Provide, operate, and improve the Service</li>
        <li>Authenticate your identity and secure your account</li>
        <li>Sync your data across devices signed in to the same account</li>
        <li>Deliver AI-generated coaching, affirmations, and insights when you use those features (see Section 6)</li>
        <li>Fulfill family and circle sharing when you initiate it (see Section 5)</li>
        <li>Send push notifications and email reminders if you have enabled them</li>
        <li>Investigate bugs, diagnose crashes, and monitor service health (see Section 7)</li>
        <li>Respond to your support requests</li>
        <li>Comply with legal obligations and enforce our Terms of Service</li>
      </ul>
    ),
  },
  {
    id: "data-retention",
    title: "4. Data Retention",
    body: (
      <>
        <p>We retain your data for as long as your account is active.</p>
        <p className="mt-3">When you delete your account we will delete or anonymize your personal data within
          30 days, except where we are required to retain it for legal, tax, or fraud-prevention purposes. Backup
          copies may persist for up to 90 days before being purged from our systems.</p>
        <p className="mt-3">You may request deletion of specific content (a journal entry, a Vault file, a life event)
          at any time from within the app. Deleted content is removed immediately from the live database; it may
          remain in encrypted backups for up to 90 days.</p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "5. Sharing and Visibility",
    body: (
      <>
        <p className="mb-3 font-medium text-amber-300/80">Your private content is never shared without your explicit action.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Private (default)</h3>
        <p>Intentions, gratitude, journals, life events, goals, habits, tasks, workouts, calendar events, legacy
          letters, future messages, memos, memories, family tree entries, and Secure Vault files are visible only
          to you. No family member or other user can access them.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Family-visible</h3>
        <p>When you mark Secure Vault content as "Family" or post to the Family Pulse feed, only people who have
          accepted your family invitation can see that content. Accepted family members can view family-scoped Vault
          files and Pulse posts. They cannot see your private reflections, habits, or any other personal content.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Pulse / Circle</h3>
        <p>Pulse posts are visible to the members of your circle at the time of posting. You can delete a post at
          any time; deletion removes it for all members immediately.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Service Providers</h3>
        <p>We share data with third-party service providers only as necessary to operate the Service. These
          providers are contractually prohibited from using your data for any other purpose. Current providers
          include: Clerk Inc. (authentication), object storage providers (file hosting), and Anthropic PBC
          (AI features — see Section 6).</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Legal Disclosures</h3>
        <p>We may disclose your information when required by law, subpoena, or court order, or when we believe
          disclosure is necessary to protect rights, property, or safety.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Business Transfers</h3>
        <p>If 333 Lives Enterprises. LLC is involved in a merger, acquisition, or asset sale, your data may be
          transferred as part of that transaction. We will notify you before your data becomes subject to a
          materially different privacy policy.</p>

        <p className="mt-4 font-medium">We do not sell, rent, or trade your personal information.</p>
      </>
    ),
  },
  {
    id: "ai-features",
    title: "6. AI Features",
    body: (
      <>
        <p>333 Lives offers optional AI-powered features including coaching conversations, daily affirmations, and
          reflective insights. These features are powered by the Anthropic Claude API.</p>
        <p className="mt-3">When you use an AI feature, the content of your messages and any context you choose to
          share (for example, a recent intention you wish to discuss) is sent to Anthropic's servers to generate a
          response. This content is subject to{" "}
          <a href="https://www.anthropic.com/privacy" className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">
            Anthropic's Privacy Policy
          </a>. We have enabled the "do not train on customer data" setting available under our agreement.</p>
        <p className="mt-3">AI conversations are stored in your account so you can review them later. You can delete
          individual conversations from within the app. Your private reflections (journal entries, intentions, etc.)
          are not automatically sent to any AI service; only content you explicitly submit in an AI conversation
          is processed.</p>
      </>
    ),
  },
  {
    id: "crash-monitoring",
    title: "7. Crash Monitoring and Diagnostics",
    body: (
      <>
        <p>We use Sentry (Functional Software, Inc.) to collect crash reports and performance data. When the app
          encounters an error, Sentry captures technical information such as the error message, stack trace, device
          type, OS version, and app version.</p>
        <p className="mt-3">We have configured Sentry with the following privacy protections:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Session replays mask all text and block all media — your journals, Vault files, and personal content
            are never captured in replay recordings</li>
          <li>All input fields are masked in replays</li>
          <li>Breadcrumb data (a log of UI interactions before a crash) has any attached data values stripped</li>
          <li>Only 2 % of normal sessions are sampled for background replay; 100 % of error sessions are captured
            with the masking settings above</li>
        </ul>
        <p className="mt-3">Crash data is subject to{" "}
          <a href="https://sentry.io/privacy/" className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">
            Sentry's Privacy Policy
          </a>.</p>
      </>
    ),
  },
  {
    id: "device-permissions",
    title: "8. Device Permissions (Mobile)",
    body: (
      <>
        <p className="mb-2">The 333 Lives mobile app may request the following permissions:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Microphone</strong> — used for recording audio memos within the app. We do not record audio
            in the background. Audio files are stored in your account.</li>
          <li><strong>Camera / Photo Library</strong> — used to attach photos to life events, memories, or Vault
            files. Photos are stored in your account and are private to you unless you explicitly share them.</li>
          <li><strong>Notifications</strong> — used to send optional daily reminders and streak alerts. You can
            revoke this permission at any time in your device Settings.</li>
        </ul>
        <p className="mt-3">If you deny a permission, the app continues to work; only the specific feature
          requiring that permission will be unavailable until you grant it.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "9. Data Security",
    body: (
      <>
        <p>We use the following measures to protect your data:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>All data is transmitted over encrypted TLS/HTTPS connections</li>
          <li>Secure Vault files are encrypted at rest with AES-256-GCM before storage</li>
          <li>Authentication is managed by Clerk Inc., which uses industry-standard OAuth 2.0 / OIDC flows</li>
          <li>Server-side access controls enforce ownership and family-link boundaries on every request</li>
          <li>We regularly review dependencies for known security vulnerabilities</li>
        </ul>
        <p className="mt-3">No method of electronic transmission or storage is 100 % secure. If you believe your
          account has been compromised, please contact us immediately at{" "}
          <a href="mailto:support@333lives.app" className="text-amber-400 hover:underline">support@333lives.app</a>.</p>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "10. Children's Privacy",
    body: (
      <p>The Service is not directed to children under 13 (or under 16 in the European Economic Area). We do not
        knowingly collect personal information from children under these ages. If you believe we have inadvertently
        collected such information, please contact us and we will delete it promptly.</p>
    ),
  },
  {
    id: "your-rights",
    title: "11. Your Rights",
    body: (
      <>
        <p className="mb-2">Depending on where you live, you may have certain rights regarding your personal data:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Access</strong> — request a copy of the data we hold about you</li>
          <li><strong>Correction</strong> — request correction of inaccurate or incomplete data</li>
          <li><strong>Deletion</strong> — request deletion of your account and all associated data</li>
          <li><strong>Portability</strong> — request an export of your data in a machine-readable format</li>
          <li><strong>Opt-out of communications</strong> — unsubscribe from non-essential emails at any time</li>
        </ul>
        <p className="mt-3">To exercise any of these rights, contact us at{" "}
          <a href="mailto:support@333lives.app" className="text-amber-400 hover:underline">support@333lives.app</a>.
          We will respond within 30 days. We may need to verify your identity before fulfilling a request.</p>
      </>
    ),
  },
  {
    id: "purchases",
    title: "12. Purchases and Billing",
    body: (
      <p>In-app purchases are processed through the Apple App Store or Google Play Store. We do not collect or
        store your payment card details. Billing information is subject to the respective platform's privacy policy.
        If you have questions about a charge, contact us at{" "}
        <a href="mailto:support@333lives.app" className="text-amber-400 hover:underline">support@333lives.app</a>.</p>
    ),
  },
  {
    id: "changes",
    title: "13. Changes to This Policy",
    body: (
      <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting
        the updated policy with a revised effective date and, where appropriate, by email or in-app notification.
        Continued use of the Service after the effective date constitutes acceptance of the revised policy.</p>
    ),
  },
  {
    id: "contact",
    title: "14. Contact Us",
    body: (
      <>
        <p>Questions, requests, or concerns about this Privacy Policy:</p>
        <div className="mt-3 space-y-1">
          <p><strong>333 Lives Enterprises. LLC</strong></p>
          <p>North Carolina, USA</p>
          <p>Email: <a href="mailto:support@333lives.app" className="text-amber-400 hover:underline">support@333lives.app</a></p>
          <p>Website: <a href="https://www.333lives.app" className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">www.333lives.app</a></p>
        </div>
      </>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F5F0E8]" style={{ fontFamily: "system-ui, sans-serif", lineHeight: 1.8 }}>
      <div className="max-w-3xl mx-auto px-6 py-16 pb-24">

        {/* Brand */}
        <div className="border-b border-amber-400/20 pb-6 mb-14">
          <Link to="/">
            <span className="text-xl font-bold tracking-[0.15em] text-amber-400 cursor-pointer hover:text-amber-300 transition-colors">
              333 LIVES
            </span>
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-amber-400 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-2">Effective date: August 21, 2026</p>
        <p className="text-amber-300/60 text-xs italic mb-12">
          333 Lives Enterprises. LLC · North Carolina, USA
        </p>

        {/* Sections */}
        <div className="space-y-0">
          {SECTIONS.map(({ id, title, body }) => (
            <div key={id} id={id}>
              <h2 className="text-lg font-semibold text-amber-400 mt-10 mb-3">{title}</h2>
              <div className="text-gray-300 text-sm leading-relaxed">{body}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-amber-400/15 flex flex-wrap gap-4 items-center justify-between text-xs text-gray-600">
          <span>&copy; 2026 333 Lives Enterprises. LLC. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/terms" className="text-amber-400/70 hover:text-amber-400 transition-colors">Terms of Service</Link>
            <Link to="/support" className="text-amber-400/70 hover:text-amber-400 transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
