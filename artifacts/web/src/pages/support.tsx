export default function Support() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#F5F0E8', fontFamily: 'system-ui, sans-serif', lineHeight: 1.8 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 32px 100px' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', marginBottom: 56, paddingBottom: 24 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#C9A439', letterSpacing: 2 }}>333 LIVES</span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#C9A439', marginBottom: 8 }}>Support</h1>
        <p style={{ color: '#888', marginBottom: 48, fontSize: 14 }}>We're here to help. Find answers below or reach us directly.</p>

        {/* Contact card */}
        <div style={{ background: 'rgba(201,164,57,0.07)', border: '1px solid rgba(201,164,57,0.25)', borderRadius: 14, padding: '28px 32px', marginBottom: 56 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#C9A439', marginBottom: 4, marginTop: 0 }}>Contact Us</h2>
          <p style={{ color: '#ccc', marginBottom: 12, fontSize: 15 }}>
            For account issues, bug reports, or general questions, email us and we'll respond within one business day.
          </p>
          <a href="mailto:support@333lives.app" style={{ color: '#C9A439', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
            support@333lives.app
          </a>
        </div>

        {/* FAQ */}
        {[
          {
            q: 'How do I reset my password?',
            a: 'Tap "Forgot password?" on the sign-in screen and enter your email address. You'll receive a reset link within a few minutes. Check your spam folder if it doesn't arrive.',
          },
          {
            q: 'How do I delete my account and data?',
            a: 'Go to Profile → Settings → Delete Account. This permanently removes your account and all associated data within 30 days. Alternatively, email support@333lives.app and we'll process it within 30 days.',
          },
          {
            q: 'My habits or intentions aren\'t saving. What should I do?',
            a: 'First check your internet connection. Pull down to refresh the screen. If the problem persists, close and reopen the app. If you still have issues, contact us with your device model and iOS version.',
          },
          {
            q: 'Can I use 333 Lives on multiple devices?',
            a: 'Yes — your data syncs automatically across all devices signed in to the same account. Download the app on any iPhone, iPad, or use the web version at 333lives.app.',
          },
          {
            q: 'How does the Family Pulse feed work?',
            a: 'Family Pulse lets you share moments with family members you\'ve invited. Only people in your family group can see your posts. You can manage your family group in Profile → Family.',
          },
          {
            q: 'Are my journal entries and life events private?',
            a: 'Yes. Your intentions, habits, journal entries, and life events are private to you by default. Only content you explicitly share to the Family Pulse feed is visible to your family group.',
          },
          {
            q: 'How do I restore a purchase?',
            a: 'Open the app and go to Profile → Subscription → Restore Purchases. Make sure you\'re signed in with the same Apple ID used for the original purchase.',
          },
          {
            q: 'The app is crashing. How do I fix it?',
            a: 'Try closing the app fully and reopening it. If crashes continue, go to Settings → General → iPhone Storage → 333 Lives → Offload App, then reinstall from the App Store. Contact us if the issue persists.',
          },
          {
            q: 'How do I update the app?',
            a: 'Open the App Store, tap your profile icon in the top right, scroll down to see available updates, and tap Update next to 333 Lives. Enabling automatic updates in iOS Settings means you\'ll always have the latest version.',
          },
          {
            q: 'Where is my data stored?',
            a: 'Your data is stored securely on our servers and transmitted over encrypted HTTPS connections. We never sell your data. See our Privacy Policy for full details.',
          },
        ].map(({ q, a }) => (
          <div key={q} style={{ marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#F5F0E8', marginBottom: 10, marginTop: 0 }}>{q}</h3>
            <p style={{ color: '#aaa', marginBottom: 0, fontSize: 15 }}>{a}</p>
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(201,168,76,0.2)', color: '#555', fontSize: 13, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span>&copy; 2026 333 Lives. All rights reserved.</span>
          <span>
            <a href="/privacy-policy" style={{ color: '#C9A439', textDecoration: 'none' }}>Privacy Policy</a>
          </span>
        </div>
      </div>
    </div>
  );
}
