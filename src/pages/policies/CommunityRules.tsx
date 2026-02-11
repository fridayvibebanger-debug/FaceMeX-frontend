import Navbar from '@/components/layout/Navbar';

export default function CommunityRules() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 max-w-3xl mx-auto px-4 py-10 space-y-6 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold mb-2">Community Rules</h1>
        <p className="text-muted-foreground text-xs">Last updated: 2025</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Be human, be kind</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>No hate speech, bullying or targeted harassment.</li>
            <li>No doxxing, threats or sharing of private information.</li>
            <li>No glorification of self‑harm or violence.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. No scams or impersonation</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>No romance scams, investment schemes or fake giveaways.</li>
            <li>No fake jobs that ask people to pay fees or send money.</li>
            <li>No pretending to be someone else, including public figures.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Respect boundaries</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Only share images and media that you have the right to share.</li>
            <li>Get consent before posting content that identifies other people.</li>
            <li>Use block and report tools when you feel unsafe.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
