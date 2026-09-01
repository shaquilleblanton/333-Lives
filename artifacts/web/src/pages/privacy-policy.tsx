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
          goals, habits, tasks, workout logs, legacy letters, future messages, Community events, and Secure Vault
          information. This content is private to you unless you use a sharing feature or choose Family visibility
          for an eligible Vault item (see Section 5).</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Media and Uploaded Files</h3>
        <p>Photos, audio memos, voice-story answers, Pulse media, and documents you upload. We store these files in
          access-controlled object storage to provide the feature you selected. Vault files receive an additional
          server-side AES-256-GCM encryption layer before storage.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Family and Circle Information</h3>
        <p>Names, relationships, birthdays, anniversaries, photos, notes, and other details you add to My Circle or
          Family Tree. If you invite someone to your Family group, we collect their email address to send the invitation
          and link accounts after acceptance. Circle sharing is based on people you designate for Circle sharing who
          also have a linked 333 Lives account.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Vault and Estate Information</h3>
        <p>Secure Vault can contain highly sensitive documents and details, including trusted-contact names,
          relationships, email addresses, phone numbers, firms, notes, and estate-planning information such as wills,
          insurance, medical directives, funeral wishes, and digital-asset information. Please only add information
          you are authorized to provide.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Health and Activity Data</h3>
        <p>Workout logs, streak history, and habit completion records that you enter manually. We do not currently
          connect to Apple Health, Google Fit, or any external health data source.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Device and Technical Information</h3>
        <p>Device type, operating system, app version, crash reports, and performance data collected automatically
          to support and improve the Service. See Section 7 for details on crash monitoring.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Support and Feedback</h3>
        <p>When you send feedback or contact support, we collect the details you provide along with the account
          information needed to respond and investigate the request.</p>
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
        <p>We retain account data while your account remains active and as needed to operate the Service, meet legal
          obligations, resolve disputes, and enforce our agreements.</p>
        <p className="mt-3">You can delete many entries from within the app. Deleting an entry removes its record from
          the active app experience. Some features attempt to remove their associated files at the same time; not
          every feature has an automated file-cleanup workflow. Encrypted backup copies and unlinked storage objects
          may persist until they are removed through operational storage maintenance.</p>
        <p className="mt-3">You can start account deletion from Profile → Delete account in the app. The app removes
          your account records and local app data, then signs you out. Associated media cleanup is best effort and
          may require additional time. Authentication-account deletion is requested through Clerk and the app retries
          that request when appropriate. If deletion does not complete after a retry, or you cannot use the in-app
          control, contact us using the address in Section 13 so we can help verify and complete the request.</p>
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
          letters, future messages, memos, memories, Family Tree entries, and private Secure Vault items are visible
          only to you. No family member or other user can access them through the Service.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Family-visible</h3>
        <p>When you mark an eligible Secure Vault item as "Family," only people with an accepted family link can
          access it. Family-visible Vault records can reveal the item's owner name, category, title, details, file
          presence, and the shared file itself. Family access does not grant access to your private reflections,
          habits, or other private content.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Pulse / Circle</h3>
        <p>Pulse posts are visible to the linked 333 Lives accounts in your Circle—not automatically to every accepted
          Family member. Circle members can see the post, its author name, and reactions as the feature displays them.
          You can delete your own post. Non-persistent posts stop appearing after 24 hours; persistent posts remain
          available until deleted. Expired or deleted media may remain in protected storage temporarily as described
          in Section 4.</p>

        <h3 className="font-semibold text-amber-300/90 mt-4 mb-1">Service Providers</h3>
        <p>We share data with third-party service providers only as needed to operate the Service. Current providers
          include Clerk, Inc. (authentication), Replit-provided object storage and its Google Cloud infrastructure
          (file hosting), Anthropic PBC (AI features — see Section 6), and Sentry (crash and performance monitoring
          — see Section 7).</p>

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
        <p className="mt-3">When you use AI Chat, the message you submit is sent to Anthropic's servers to generate a
          response. Life Coach and Affirmations also send a limited, feature-specific summary from your account: your
          name and streak count, plus relevant recent intentions, active goal titles/progress, and habit names or
          check-in summaries. This content is subject to{" "}
          <a href="https://www.anthropic.com/privacy" className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">
            Anthropic's Privacy Policy
          </a>. We have enabled the "do not train on customer data" setting available under our agreement.</p>
        <p className="mt-3">AI conversations are stored in your account so you can review them later. You can delete
          individual conversations from within the app. We do not automatically send journals, Vault content, Family
          Tree information, or other private content to AI; Coach and Affirmations use only the limited summaries
          described above to provide their requested feature.</p>
      </>
    ),
  },
  {
    id: "crash-monitoring",
    title: "7. Crash Monitoring and Diagnostics",
    body: (
      <>
        <p>We use Sentry (Functional Software, Inc.) to collect crash reports and performance data. When the app
          encounters an error, Sentry may receive technical information such as the error message, stack trace,
          device type, operating-system version, app version, browser/runtime context, and performance traces.</p>
        <p className="mt-3">The web app has the following additional replay protections:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Session replays mask all text and block all media — your journals, Vault files, and personal content
            are never captured in replay recordings</li>
          <li>All input fields are masked in replays</li>
          <li>Breadcrumb data (a log of UI interactions before a crash) has any attached data values stripped</li>
          <li>Only 2 % of normal web sessions are sampled for background replay; web error sessions may be captured
            with the masking settings above</li>
        </ul>
        <p className="mt-3">The mobile app does not use session replay. It sends crash and performance diagnostics
          when Sentry is enabled in the installed build.</p>
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
        </ul>
        <p className="mt-3">If you deny a permission, the app continues to work; only the specific feature
          requiring that permission will be unavailable until you grant it. The current release does not collect push
          notification tokens or send push notifications.</p>
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
        </ul>
        <p className="mt-3">Secure Vault encryption is managed by the Service so authorized server processes can
          retrieve files for you and, when you choose, your accepted family links. It is not end-to-end encryption
          controlled solely by your device.</p>
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
    title: "11. Your Rights and Requests",
    body: (
      <>
        <p className="mb-2">Depending on where you live, you may have certain rights regarding your personal data:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Access</strong> — request a copy of the data we hold about you</li>
          <li><strong>Correction</strong> — request correction of inaccurate or incomplete data</li>
          <li><strong>Deletion</strong> — request deletion of your account and associated data</li>
          <li><strong>Portability</strong> — request an export of your data in a machine-readable format</li>
          <li><strong>Opt-out of communications</strong> — unsubscribe from non-essential emails at any time</li>
        </ul>
        <p className="mt-3">To exercise any of these rights, contact us at{" "}
          <a href="mailto:support@333lives.app" className="text-amber-400 hover:underline">support@333lives.app</a>.
          We may need to verify your identity before fulfilling a request. We currently process deletion and export
          requests through support rather than an automated in-app control.</p>
      </>
    ),
  },
  {
    id: "changes",
    title: "12. Changes to This Policy",
    body: (
      <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting
        the updated policy with a revised effective date and, where appropriate, by email.
        Continued use of the Service after the effective date constitutes acceptance of the revised policy.</p>
    ),
  },
  {
    id: "contact",
    title: "13. Contact Us",
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
        <p className="text-gray-500 text-sm mb-2">Effective date: August 25, 2026</p>
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
