import Navbar from '@/components/layout/Navbar';

export default function ScreenshotPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 max-w-3xl mx-auto px-4 py-10 space-y-6 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold mb-2">Screenshot & Recording Policy</h1>
        <p className="text-muted-foreground text-xs">Last updated: 2025</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Why we care about screenshots</h2>
          <p>
            Screenshots and screen recordings can copy sensitive content. FaceMeX uses light‑touch
            detection and logging to give you more control and visibility when this may happen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. What we do</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Show warnings when we suspect screenshot or recording behaviour.</li>
            <li>Soft‑blur some sensitive areas when screenshot protection is active.</li>
            <li>Log events to your Safety Center so you can review suspicious activity.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. What we do not do</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>We do not access your camera roll or collect actual screenshots.</li>
            <li>We do not monitor everything you do on your device.</li>
            <li>We do not prevent you from using system‑level screenshot tools.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
