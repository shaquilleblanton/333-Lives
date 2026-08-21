import { Link } from "wouter";

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: (
      <>
        <p>
          These Terms of Service ("Terms") form a legally binding agreement between you and 333 Lives Enterprises. LLC
          ("333 Lives," "we," "us," or "our"), a limited liability company organized under the laws of North Carolina,
          USA.
        </p>
        <p className="mt-3 text-sm italic text-amber-300/70">
          ⚠ This document is a working template. It should be reviewed and approved by a licensed attorney before
          public launch or distribution.
        </p>
        <p className="mt-3">
          By creating an account or using the 333 Lives mobile application or website (the "Service"), you agree to
          these Terms. If you do not agree, do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "description",
    title: "2. Description of the Service",
    body: (
      <p>
        333 Lives is a personal growth and life documentation platform. It lets you record daily intentions, habits,
        gratitude, journal entries, life events, goals, workouts, legacy letters, future messages, memories, and
        Secure Vault documents. The Service also includes family and circle sharing features, an AI coaching assistant,
        and a community Pulse feed.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "3. Eligibility",
    body: (
      <>
        <p>
          You must be at least 13 years old (or 16 in the European Economic Area) to use the Service. By using the
          Service you represent that you meet this age requirement. If you are under 18, you represent that a parent
          or legal guardian has reviewed and agreed to these Terms on your behalf.
        </p>
        <p className="mt-3">
          The Service is intended for personal, non-commercial use. Use of the Service for commercial purposes
          requires our prior written consent.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "4. Your Account",
    body: (
      <>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activity
          that occurs under your account. Notify us immediately at{" "}
          <a href="mailto:support@333lives.app" className="text-amber-400 hover:underline">support@333lives.app</a> if
          you suspect unauthorized access.
        </p>
        <p className="mt-3">
          You may not create an account on behalf of someone else without their explicit consent, share your account
          with others, or operate multiple accounts to circumvent a restriction or suspension.
        </p>
      </>
    ),
  },
  {
    id: "user-content",
    title: "5. Your Content",
    body: (
      <>
        <p>
          You retain full ownership of all content you create or upload to the Service ("User Content"). By using
          the Service, you grant 333 Lives a limited, non-exclusive, royalty-free license to store, process, and
          display your User Content solely as necessary to provide the Service to you.
        </p>
        <p className="mt-3">
          We do not claim ownership of your content. We do not sell, license, or share your personal reflections,
          journal entries, or Vault files with third parties except as described in our{" "}
          <Link to="/privacy-policy" className="text-amber-400 hover:underline">Privacy Policy</Link>.
        </p>
        <p className="mt-3">
          You are responsible for ensuring that your User Content does not violate any law or third-party right.
          You may not upload content that is unlawful, abusive, threatening, defamatory, obscene, or that infringes
          on intellectual property rights.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "6. Sharing and Community Features",
    body: (
      <>
        <p>The Service includes optional features that allow you to share content with others:</p>
        <ul className="list-disc pl-5 mt-2 space-y-2">
          <li>
            <strong>Family group:</strong> Content you mark as "Family" or post to the Family Pulse feed is visible
            to people who have accepted your family invitation. You are responsible for managing your family group
            and revoking access when appropriate.
          </li>
          <li>
            <strong>Pulse / circle:</strong> Posts you share to a Pulse circle are visible to all members of that
            circle. You can delete your own posts at any time.
          </li>
        </ul>
        <p className="mt-3">
          You may not use sharing features to harass, stalk, or harm other users. We reserve the right to remove
          content that violates these Terms or is reported as abusive.
        </p>
      </>
    ),
  },
  {
    id: "ai-features",
    title: "7. AI Features",
    body: (
      <>
        <p>
          333 Lives offers optional AI-powered features (coaching, affirmations, insights). These are provided for
          informational and personal-growth purposes only and do not constitute professional medical, psychological,
          legal, or financial advice.
        </p>
        <p className="mt-3">
          AI responses are generated automatically and may not always be accurate, complete, or appropriate for your
          situation. You should not rely on AI-generated content for important decisions. If you are experiencing a
          mental health crisis or emergency, contact a qualified professional or emergency services immediately.
        </p>
      </>
    ),
  },
  {
    id: "purchases",
    title: "8. Purchases and Subscriptions",
    body: (
      <>
        <p>
          Some features may require a paid subscription or one-time purchase, processed through the Apple App Store
          or Google Play Store. Pricing, billing cycles, and refund policies are governed by the applicable platform's
          terms.
        </p>
        <p className="mt-3">
          Subscription fees are charged at the beginning of each billing period. You may cancel your subscription at
          any time through the platform's subscription management settings; cancellation takes effect at the end of
          the current billing period. We do not issue partial refunds for unused portions of a subscription period
          except as required by applicable law.
        </p>
      </>
    ),
  },
  {
    id: "prohibited",
    title: "9. Prohibited Conduct",
    body: (
      <>
        <p className="mb-2">You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Violate any applicable law or regulation</li>
          <li>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
          <li>Use automated tools to scrape, crawl, or bulk-download data from the Service</li>
          <li>Interfere with or disrupt the integrity or performance of the Service</li>
          <li>Upload malicious code, viruses, or any software intended to damage or intercept data</li>
          <li>Attempt to gain unauthorized access to any account, system, or network</li>
          <li>Use the Service to harass, threaten, or harm any person</li>
          <li>Impersonate any person or entity</li>
        </ul>
      </>
    ),
  },
  {
    id: "ip",
    title: "10. Intellectual Property",
    body: (
      <p>
        The Service and its original content (excluding User Content), features, and functionality are and will
        remain the exclusive property of 333 Lives Enterprises. LLC. The 333 Lives name, logo, and related marks
        are trademarks of 333 Lives Enterprises. LLC and may not be used without prior written permission.
      </p>
    ),
  },
  {
    id: "termination",
    title: "11. Termination",
    body: (
      <>
        <p>
          You may stop using the Service and delete your account at any time by contacting us at{" "}
          <a href="mailto:support@333lives.app" className="text-amber-400 hover:underline">support@333lives.app</a>.
        </p>
        <p className="mt-3">
          We may suspend or terminate your account without notice if you violate these Terms, engage in conduct
          that we determine to be harmful to other users or the Service, or if required by law. Upon termination,
          your right to use the Service ceases immediately. We will process deletion of your data in accordance with
          our <Link to="/privacy-policy" className="text-amber-400 hover:underline">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "12. Disclaimer of Warranties",
    body: (
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
        INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
        NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
      </p>
    ),
  },
  {
    id: "liability",
    title: "13. Limitation of Liability",
    body: (
      <p>
        TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, 333 LIVES ENTERPRISES. LLC AND ITS OFFICERS, DIRECTORS,
        EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
        DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE
        SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS
        ARISING OUT OF THESE TERMS SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS
        PRECEDING THE CLAIM OR (B) $100 USD.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "14. Governing Law and Disputes",
    body: (
      <p>
        These Terms are governed by and construed in accordance with the laws of the State of North Carolina, USA,
        without regard to its conflict-of-law provisions. Any dispute arising out of or relating to these Terms or
        the Service shall be resolved exclusively in the state or federal courts located in North Carolina, and you
        consent to personal jurisdiction in those courts.
      </p>
    ),
  },
  {
    id: "changes",
    title: "15. Changes to These Terms",
    body: (
      <p>
        We may update these Terms from time to time. We will notify you of material changes by posting the revised
        Terms with an updated effective date and, where appropriate, by email or in-app notification. Continued use
        of the Service after the effective date constitutes acceptance of the revised Terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "16. Contact",
    body: (
      <>
        <p>Questions about these Terms:</p>
        <div className="mt-3 space-y-1">
          <p><strong>333 Lives Enterprises. LLC</strong></p>
          <p>North Carolina, USA</p>
          <p>Email: <a href="mailto:support@333lives.app" className="text-amber-400 hover:underline">support@333lives.app</a></p>
        </div>
      </>
    ),
  },
];

export default function Terms() {
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

        <h1 className="text-4xl font-bold text-amber-400 mb-2">Terms of Service</h1>
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
            <Link to="/privacy-policy" className="text-amber-400/70 hover:text-amber-400 transition-colors">Privacy Policy</Link>
            <Link to="/support" className="text-amber-400/70 hover:text-amber-400 transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
