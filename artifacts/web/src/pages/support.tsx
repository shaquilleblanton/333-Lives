import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

const FAQS = [
  {
    q: "How do I reset my password?",
    a: "On the sign-in screen tap \"Forgot password?\" and enter your email. You'll receive a reset link within a few minutes — check your spam folder if it doesn't arrive.",
  },
  {
    q: "How do I delete my account and data?",
    a: "Open Profile → Delete account, type DELETE, and confirm. The app removes your account records and local app data, signs you out, and makes a best-effort attempt to clean up associated media. Clerk account deletion is retried when appropriate. If it still fails or you cannot use the app, email support@333lives.app with the subject \"Account Deletion Request\" so we can verify and help complete it.",
  },
  {
    q: "My habits or intentions aren't saving. What should I do?",
    a: "Check your internet connection first, then pull down to refresh. If the problem continues, close and reopen the app. If it persists, contact us with your device model and OS version.",
  },
  {
    q: "Can I use 333 Lives on multiple devices?",
    a: "Yes — your data syncs automatically across all devices signed in to the same account. Use the mobile app on iPhone or the web version at 333lives.app.",
  },
  {
    q: "How does the Family Pulse feed work?",
    a: "Pulse lets you share moments with family members you've invited. Only people who have accepted your family invitation can see your Pulse posts. Manage your family group in Profile → Family.",
  },
  {
    q: "Are my journal entries and reflections private?",
    a: "Yes. Intentions, habits, journal entries, life events, goals, and Vault files are private to you by default. Only content you explicitly share to Pulse or mark as Family-visible is accessible to others.",
  },
  {
    q: "What is the Secure Vault?",
    a: "Vault is an encrypted file storage area for documents, photos, and files you want to keep private or share selectively with family. Vault files are encrypted at rest with AES-256-GCM before being stored on our servers.",
  },
  {
    q: "How do AI features work?",
    a: "AI coaching, affirmations, and insights are powered by Anthropic's Claude. When you use an AI feature, your message is sent to Anthropic's servers to generate a response. We do not automatically share your private reflections with any AI service — only what you explicitly send in a conversation.",
  },
  {
    q: "The app is crashing. How do I fix it?",
    a: "Close the app fully and reopen it. If crashes continue, reinstall the app from the App Store or Play Store (your data is saved to your account). Contact us if the issue persists.",
  },
  {
    q: "Where is my data stored?",
    a: "Your data is stored securely on our servers and transmitted over encrypted HTTPS connections. Vault files are encrypted before storage. We never sell your data. See our Privacy Policy for full details.",
  },
  {
    q: "How do I request a copy of my data?",
    a: "Email support@333lives.app with the subject \"Data Request\" and describe what you need. We will review the request and explain the available information and next steps; the app does not currently provide an automated data-export download.",
  },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16 pb-24">

        {/* Brand header */}
        <div className="border-b border-primary/20 pb-6 mb-14">
          <Link to="/">
            <span className="text-xl font-bold tracking-[0.15em] text-primary cursor-pointer hover:text-primary/80 transition-colors">
              333 LIVES
            </span>
          </Link>
        </div>

        {/* Page title */}
        <h1 className="text-4xl font-bold text-primary mb-2">Support</h1>
        <p className="text-muted-foreground text-sm mb-12">
          We&apos;re here to help. Find answers below or reach us directly.
        </p>

        {/* Quick links */}
        <div className="flex flex-wrap gap-3 mb-12">
          <Link to="/help">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-full px-4 py-1.5 hover:bg-primary/10 transition-colors cursor-pointer">
              📖 Help Center
            </span>
          </Link>
          <Link to="/privacy-policy">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-border rounded-full px-4 py-1.5 hover:bg-muted/40 transition-colors cursor-pointer">
              Privacy Policy
            </span>
          </Link>
          <Link to="/terms">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-border rounded-full px-4 py-1.5 hover:bg-muted/40 transition-colors cursor-pointer">
              Terms of Service
            </span>
          </Link>
        </div>

        {/* Contact card */}
        <Card className="bg-primary/[0.07] border border-primary/25 rounded-2xl mb-14">
          <CardContent className="p-7">
            <h2 className="text-lg font-semibold text-primary mb-1">Contact Us</h2>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              For account issues, bug reports, data requests, or anything else — email us and our team will review
              your request.
            </p>
            <a
              href="mailto:support@333lives.app"
              className="text-primary font-semibold text-sm hover:underline"
            >
              support@333lives.app
            </a>
          </CardContent>
        </Card>

        {/* FAQ */}
        <h2 className="text-xl font-bold text-foreground mb-7">Frequently Asked Questions</h2>

        <div className="space-y-0">
          {FAQS.map(({ q, a }) => (
            <div
              key={q}
              className="border-b border-border/40 py-8 last:border-b-0"
            >
              <h3 className="text-base font-semibold text-foreground mb-2.5">{q}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-2 mt-12 pt-6 border-t border-primary/20 text-xs text-muted-foreground/60">
          <span>&copy; 2026 333 Lives Enterprises. LLC. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="text-primary/70 hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-primary/70 hover:text-primary transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
