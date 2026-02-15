import Navbar from '@/components/layout/Navbar';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 max-w-3xl mx-auto px-4 py-10 space-y-6 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-xs">Last updated: 2025</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account data such as name, email, avatar and basic profile fields.</li>
            <li>Content you share, including posts, messages and media.</li>
            <li>Technical data such as device type, approximate location (city) and log events.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. How we use data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and improve FaceMeX features.</li>
            <li>To keep the community safe through scam and abuse detection.</li>
            <li>To personalise parts of your experience (for example language settings).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Safety signals</h2>
          <p>
            Safety systems may analyse your activity to detect scams, abuse or suspicious logins. These
            signals are primarily used to protect you and other users and are surfaced in the Safety
            Center and Trust Dashboard.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Your choices</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Update your profile and language preferences from Settings.</li>
            <li>Control some notifications and AI features from Settings.</li>
            <li>Request deletion of your account and associated data subject to legal limits.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Data retention</h2>
          <p>
            We keep data only as long as necessary for providing the service, meeting legal obligations and
            protecting the community. Safety-related logs may be stored longer to prevent repeated harm.
          </p>
        </section>
      </main>
    </div>
  );
}
