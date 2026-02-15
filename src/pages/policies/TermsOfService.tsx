import Navbar from '@/components/layout/Navbar';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 max-w-3xl mx-auto px-4 py-10 space-y-6 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-xs">Last updated: 2025</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Overview</h2>
          <p>
            FaceMeX is a safety-first social platform. By using FaceMeX you agree to these Terms and our
            Safety, Privacy, Ethics and Screenshot policies. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Eligibility & Accounts</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You must be old enough to use social media in your country.</li>
            <li>You are responsible for keeping your account secure.</li>
            <li>You must not share your password or sell/transfer your account.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Harass, abuse or threaten other people.</li>
            <li>Run scams, phishing, romance fraud, investment schemes or fake jobs.</li>
            <li>Upload illegal content or violate intellectual property rights.</li>
            <li>Attempt to bypass our safety systems or misuse AI tools.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Safety & Enforcement</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>We use automated tools and human review to detect abuse and scams.</li>
            <li>We may warn, restrict, or suspend accounts that violate these Terms.</li>
            <li>Serious harm, exploitation or criminal activity may be reported to authorities.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Content & Licenses</h2>
          <p>
            You own the content you create. By posting on FaceMeX you grant us a limited license to host,
            display and process that content so the service can function.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Changes</h2>
          <p>
            We may update these Terms to reflect new features and safety requirements. We will highlight
            material changes in-app or via email where appropriate.
          </p>
        </section>
      </main>
    </div>
  );
}
