import { Card, CardContent } from "@/components/ui/card";

export default function Support() {
  const faqs = [
    {
      q: "How do I reset my password?",
      a: "Tap \"Forgot password?\" on the sign-in screen and enter your email address. You'll receive a reset link within a few minutes. Check your spam folder if it doesn't arrive.",
    },
    {
      q: "How do I delete my account and data?",
      a: "Go to Profile → Settings → Delete Account. This permanently removes your account and all associated data within 30 days. Alternatively, email support@333lives.app and we'll process it within 30 days.",
    },
    {
      q: "My habits or intentions aren't saving. What should I do?",
      a: "First check your internet connection. Pull down to refresh the screen. If the problem persists, close and reopen the app. If you still have issues, contact us with your device model and iOS version.",
    },
    {
      q: "Can I use 333 Lives on multiple devices?",
      a: "Yes — your data syncs automatically across all devices signed in to the same account. Download the app on any iPhone, iPad, or use the web version at 333lives.app.",
    },
    {
      q: "How does the Family Pulse feed work?",
      a: "Family Pulse lets you share moments with family members you've invited. Only people in your family group can see your posts. You can manage your family group in Profile → Family.",
    },
    {
      q: "Are my journal entries and life events private?",
      a: "Yes. Your intentions, habits, journal entries, and life events are private to you by default. Only content you explicitly share to the Family Pulse feed is visible to your family group.",
    },
    {
      q: "How do I restore a purchase?",
      a: "Open the app and go to Profile → Subscription → Restore Purchases. Make sure you're signed in with the same Apple ID used for the original purchase.",
    },
    {
      q: "The app is crashing. How do I fix it?",
      a: "Try closing the app fully and reopening it. If crashes continue, go to Settings → General → iPhone Storage → 333 Lives → Offload App, then reinstall from the App Store. Contact us if the issue persists.",
    },
    {
      q: "How do I update the app?",
      a: "Open the App Store, tap your profile icon in the top right, scroll down to see available updates, and tap Update next to 333 Lives. Enabling automatic updates in iOS Settings means you'll always have the latest version.",
    },
    {
      q: "Where is my data stored?",
      a: "Your data is stored securely on our servers and transmitted over encrypted HTTPS connections. We never sell your data. See our Privacy Policy for full details.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16 pb-24">

        {/* Brand header */}
        <div className="border-b border-primary/20 pb-6 mb-14">
          <span className="text-xl font-bold tracking-[0.15em] text-primary">333 LIVES</span>
        </div>

        {/* Page title */}
        <h1 className="text-4xl font-bold text-primary mb-2">Support</h1>
        <p className="text-muted-foreground text-sm mb-12">
          We&apos;re here to help. Find answers below or reach us directly.
        </p>

        {/* Contact card */}
        <Card className="bg-primary/[0.07] border border-primary/25 rounded-2xl mb-14">
          <CardContent className="p-7">
            <h2 className="text-lg font-semibold text-primary mb-1">Contact Us</h2>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              For account issues, bug reports, or general questions, email us and we&apos;ll respond within one business day.
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
          {faqs.map(({ q, a }) => (
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
          <span>&copy; 2026 333 Lives. All rights reserved.</span>
          <a href="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
