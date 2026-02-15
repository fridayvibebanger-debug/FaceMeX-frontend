import { Sparkles, HeartHandshake, Globe2, Layers, BadgeDollarSign, Users, ShieldCheck, Rocket, Bot, MessagesSquare, Headphones, Building2, Crown, Store, Ticket, Stars } from 'lucide-react';

export default function PRDPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/10 to-transparent blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-6 py-14">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">FaceMeX Product Requirements</h1>
          <p className="mt-4 text-muted-foreground max-w-2xl">A hybrid AI-powered social platform blending professional networking and social creativity. Emotion-aware, monetizable, and community-first.</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-12">
        {/* Core Experience */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Core Experience</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><Stars className="h-4 w-4 mt-0.5 text-primary" />Hybrid platform (Professional + Social)</li>
            <li className="flex items-start gap-2"><HeartHandshake className="h-4 w-4 mt-0.5 text-pink-500" />AI-curated feed & Emotion-based content</li>
            <li className="flex items-start gap-2"><Globe2 className="h-4 w-4 mt-0.5 text-blue-500" />Real-life-like reactions & holo-feedback</li>
            <li className="flex items-start gap-2"><Layers className="h-4 w-4 mt-0.5 text-purple-500" />Virtual worlds & events for community building</li>
            <li className="flex items-start gap-2"><BadgeDollarSign className="h-4 w-4 mt-0.5 text-emerald-500" />Creator monetization & business engagement tools</li>
          </ul>
        </section>

        {/* Monetization: Tiers */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Monetization: Subscription Tiers</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Free', price: 'R0', desc: 'Entry-level experience', features: ['Core features', 'Unlimited posts', 'Unlimited connections', 'No messaging to Creator/Business/Exclusive'] },
              { name: 'Pro', price: 'R99/mo', desc: 'Advanced engagement', features: ['HD uploads', 'Analytics', '3 AI tools (Post Wizard, Caption Muse, Trend Finder)', 'Message Pro users'] },
              { name: 'Creator', price: 'R299/mo', desc: 'For influencers & creatives', features: ['FaceMeX AI Assistant', 'Monetization dashboard', 'Insights', 'All-tier messaging'] },
              { name: 'Business', price: 'R999/mo', desc: 'For companies & brands', features: ['Ad tools', 'Recruitment portal', 'Data insights', 'Brand page & campaigns'] },
              { name: 'Exclusive', price: 'R1999/mo', desc: 'Premium wellness & full access', features: ['All features unlocked', 'Mental & healthcare support', 'Early access'] },
              { name: 'Verified Add-on', price: 'R99/mo', desc: 'Boosted visibility', features: ['Verified badge', 'Priority feed placement', 'Every post boosted to 2,000+ users'] },
            ].map((tier) => (
              <div key={tier.name} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{tier.name}</h3>
                  <span className="text-primary font-bold">{tier.price}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tier.desc}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><Rocket className="h-3.5 w-3.5 mt-0.5 text-primary" />{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Advertising System */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Advertising System</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Ad Formats</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>Sponsored Posts</li>
                <li>Story Ads</li>
                <li>Search Ads</li>
                <li>Virtual World Ads</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Billing Options</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>PPC or Pay-per-reach</li>
                <li>Buy Ad Credits (e.g., R200 = 2,000 impressions)</li>
                <li>AI targeting by emotion, interest, profession</li>
              </ul>
            </div>
          </div>
        </section>

        {/* AI & Emotion Intelligence */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">AI & Emotion Intelligence</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li>Emotion AI: Detects user mood via text/video to personalize feed</li>
            <li>AI Feed Curator: Prioritizes meaningful and emotionally relevant content</li>
            <li>AI Assistant (Creator+): Captions, DM management, engagement analysis</li>
            <li>Adaptive Ad Targeting: Aligns content to emotional states</li>
          </ul>
        </section>

        {/* Communication Framework */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessagesSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Communication Framework</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Feature</th>
                  <th className="py-2 font-medium">Access</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="py-2 pr-4">Messaging (DM, voice, video, emotion reactions)</td><td className="py-2">Pro+</td></tr>
                <tr className="border-t"><td className="py-2 pr-4">Echo Rooms (AI summaries/assist)</td><td className="py-2">Creator+</td></tr>
                <tr className="border-t"><td className="py-2 pr-4">Ghost Chats (self-destruct)</td><td className="py-2">Creator+</td></tr>
                <tr className="border-t"><td className="py-2 pr-4">AI Translator</td><td className="py-2">Business+</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Social + Professional Fusion */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Social + Professional Fusion</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li>Professional Mode: Experience, skills, endorsements</li>
            <li>Social Mode: Share moments, stories, interactive live feeds</li>
            <li>Switch Anytime: Toggle identities as needed</li>
            <li>Cross-Mode Networking: Collaborate across communities</li>
          </ul>
        </section>

        {/* Virtual Worlds & Events */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Virtual Worlds & Events</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li>Attend or host 3D/AR events, expos, concerts</li>
            <li>Create Virtual Booths for businesses or creators</li>
            <li>Live shopping or product demos</li>
            <li>Brand sponsorship options</li>
          </ul>
        </section>

        {/* Creator & Business Marketplace */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Creator & Business Marketplace</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li>Freelancers and brands connect directly</li>
            <li>Secure in-app payments and escrow</li>
            <li>Hire, post gigs, or sell creative services</li>
            <li>AI recommends collaborators</li>
          </ul>
        </section>

        {/* Empowerment & Safety */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Headphones className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Empowerment & Safety</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li>Mental Health Support (Exclusive) – 24/7 professionals</li>
            <li>Growth Tools – Journaling, goals, mindfulness</li>
            <li>Professional Development – Courses, certifications, events</li>
            <li>AI + Human Moderation, Privacy Vault, Digital Reputation, Ghost Mode</li>
          </ul>
        </section>
      </main>

      <footer className="py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FaceMeX. All rights reserved.
      </footer>
    </div>
  );
}
