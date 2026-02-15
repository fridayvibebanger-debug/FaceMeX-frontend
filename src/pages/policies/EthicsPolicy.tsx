import Navbar from '@/components/layout/Navbar';

export default function EthicsPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 max-w-3xl mx-auto px-4 py-10 space-y-6 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold mb-2">AI Ethics Policy</h1>
        <p className="text-muted-foreground text-xs">Last updated: 2025</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Purpose</h2>
          <p>
            FaceMeX uses AI to assist with content, safety and translation. AI systems are designed to
            support people, not replace their judgement. We do not use AI to decide your worth as a person.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. AI safety boundaries</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>No generation of hate, harassment, or targeted abuse.</li>
            <li>No instructions for self‑harm, violence or illegal activity.</li>
            <li>No help with scams, blackmail or impersonation.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Twin & assistant behaviour</h2>
          <p>
            Your AI Twin and other helpers are tuned to be respectful, inclusive and safety‑aware. They may
            decline to respond or escalate for human review if a conversation crosses safety boundaries.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Transparency</h2>
          <p>
            We clearly label AI-generated content in the interface where possible and provide access to
            the Safety Center so you can see how automated systems behave.
          </p>
        </section>
      </main>
    </div>
  );
}
