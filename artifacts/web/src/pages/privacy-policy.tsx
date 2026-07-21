export default function PrivacyPolicy() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#F5F0E8', fontFamily: 'system-ui, sans-serif', lineHeight: 1.8 }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 32px 100px' }}>
        <div style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', marginBottom: 56, paddingBottom: 24 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#C9A84C', letterSpacing: 2 }}>333 LIVES</span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#888', marginBottom: 48, fontSize: 14 }}>Last updated: July 21, 2026</p>

        <p style={{ color: '#ccc', marginBottom: 16 }}>
          333 Lives ("we," "us," or "our") is committed to protecting your personal information.
          This Privacy Policy explains how we collect, use, and safeguard data when you use the
          333 Lives mobile application and website (collectively, the "Service").
        </p>

        {[
          {
            title: '1. Information We Collect',
            body: (
              <>
                <p style={{ color: '#ccc', marginBottom: 8 }}>We collect the following types of information:</p>
                <ul style={{ color: '#ccc', paddingLeft: 24, marginBottom: 16 }}>
                  <li style={{ marginBottom: 8 }}><strong>Account information:</strong> Your name and email address when you create an account.</li>
                  <li style={{ marginBottom: 8 }}><strong>User-generated content:</strong> Daily intentions, gratitude journal entries, reflections, goals, and people you add — visible only to you.</li>
                  <li style={{ marginBottom: 8 }}><strong>App activity:</strong> Features you use and engagement frequency, used to improve the Service.</li>
                  <li style={{ marginBottom: 8 }}><strong>Device information:</strong> Device type, OS, and app version for support and compatibility.</li>
                </ul>
              </>
            ),
          },
          {
            title: '2. How We Use Your Information',
            body: (
              <ul style={{ color: '#ccc', paddingLeft: 24, marginBottom: 16 }}>
                <li style={{ marginBottom: 8 }}>Provide, maintain, and improve the Service</li>
                <li style={{ marginBottom: 8 }}>Personalize your experience</li>
                <li style={{ marginBottom: 8 }}>Send optional notifications and reminders if you enable them</li>
                <li style={{ marginBottom: 8 }}>Respond to support requests</li>
                <li style={{ marginBottom: 8 }}>Analyze usage patterns to enhance the app</li>
              </ul>
            ),
          },
          {
            title: '3. Data Sharing',
            body: <p style={{ color: '#ccc', marginBottom: 16 }}>We do not sell, rent, or trade your personal information to third parties. We may share data with trusted service providers (cloud hosting, authentication) under strict confidentiality agreements. These providers may not use your data for any other purpose.</p>,
          },
          {
            title: '4. Data Security',
            body: <p style={{ color: '#ccc', marginBottom: 16 }}>All data is transmitted over encrypted connections (TLS/HTTPS). We implement industry-standard security measures to protect your information against unauthorized access, alteration, disclosure, or destruction.</p>,
          },
          {
            title: '5. Data Retention & Deletion',
            body: <p style={{ color: '#ccc', marginBottom: 16 }}>We retain your data for as long as your account is active. You may request deletion of your account and all associated data at any time by contacting <a href="mailto:support@333lives.app" style={{ color: '#C9A84C' }}>support@333lives.app</a>. We will process deletion requests within 30 days.</p>,
          },
          {
            title: "6. Children's Privacy",
            body: <p style={{ color: '#ccc', marginBottom: 16 }}>The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us and we will promptly delete it.</p>,
          },
          {
            title: '7. Your Rights',
            body: (
              <ul style={{ color: '#ccc', paddingLeft: 24, marginBottom: 16 }}>
                <li style={{ marginBottom: 8 }}>Access the personal data we hold about you</li>
                <li style={{ marginBottom: 8 }}>Request correction of inaccurate data</li>
                <li style={{ marginBottom: 8 }}>Request deletion of your data</li>
                <li style={{ marginBottom: 8 }}>Opt out of non-essential communications</li>
              </ul>
            ),
          },
          {
            title: '8. Changes to This Policy',
            body: <p style={{ color: '#ccc', marginBottom: 16 }}>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the updated policy here with a revised date. Continued use of the Service after changes are posted constitutes acceptance of the revised policy.</p>,
          },
          {
            title: '9. Contact Us',
            body: <p style={{ color: '#ccc', marginBottom: 16 }}>Questions about this Privacy Policy? Contact us:<br/><strong>Email:</strong> <a href="mailto:support@333lives.app" style={{ color: '#C9A84C' }}>support@333lives.app</a><br/><strong>Website:</strong> <a href="https://www.333lives.app" style={{ color: '#C9A84C' }}>www.333lives.app</a></p>,
          },
        ].map(({ title, body }) => (
          <div key={title}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#C9A84C', margin: '40px 0 12px' }}>{title}</h2>
            {body}
          </div>
        ))}

        <div style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid rgba(201,168,76,0.2)', color: '#555', fontSize: 13 }}>
          &copy; 2026 333 Lives. All rights reserved.
        </div>
      </div>
    </div>
  );
}
