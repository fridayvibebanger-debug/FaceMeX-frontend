import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';

export default function MentalHealthPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-14 md:pt-16 p-4 space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl md:text-2xl font-semibold">Mental Health & Wellbeing</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Supportive information and simple self-care practices. FaceMeX does not replace professional care.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Crisis support */}
          <Card className="rounded-2xl border border-border/60 shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">Crisis & Immediate Support (South Africa)</span>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Important</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                If you or someone you know is at risk of harm, contact emergency services or a trusted crisis line.
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li><span className="font-medium">Emergency (SA):</span> 112 (mobile) or 10111 (police).</li>
                <li><span className="font-medium">SADAG (Depression &amp; Anxiety):</span> 0800 567 567 or 0800 21 22 23.</li>
                <li><span className="font-medium">LifeLine South Africa:</span> 0861 322 322.</li>
                <li><span className="font-medium">GBV Command Centre:</span> 0800 428 428.</li>
                <li><span className="font-medium">Childline South Africa:</span> 116.</li>
              </ul>
              <div className="flex flex-wrap gap-2 pt-2 text-xs">
                <Button asChild variant="outline" size="sm">
                  <a href="tel:0800567567">Call SADAG 0800 567 567</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="tel:0861322322">Call LifeLine 0861 322 322</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="tel:0800428428">Call GBV 0800 428 428</a>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                These references are provided for convenience and may change. Always use services you trust and that are active in your area.
              </p>
            </CardContent>
          </Card>

          {/* Self-care tools */}
          <Card className="rounded-2xl border border-border/60 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Brief self‑care practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                These short exercises are intended as supportive tools. They are not a substitute for professional assessment or treatment.
              </p>
              <div>
                <h3 className="font-semibold mb-1">1‑minute breathing reset</h3>
                <p className="text-muted-foreground">Inhale for 4 seconds, hold for 4 seconds, and exhale for 6 seconds. Repeat several times while seated comfortably and allowing your shoulders and jaw to relax.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Grounding (5‑4‑3‑2‑1)</h3>
                <p className="text-muted-foreground">Notice 5 things you can see, 4 things you can touch, 3 sounds you can hear, 2 things you can smell, and 1 thing you can taste or imagine tasting.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Journaling prompt</h3>
                <p className="text-muted-foreground">“Right now I feel… because… One small step that might help is…”</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Using FaceMeX in a healthy way</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Digital platforms can be helpful, but they can also feel overwhelming at times. The points below may support more balanced use of FaceMeX.
            </p>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Plan regular breaks:</span> It is appropriate to step away from the app, especially when you notice increased stress or fatigue.
              </li>
              <li>
                <span className="font-medium text-foreground">Adjust what you see:</span> Engage more with accounts and communities that feel supportive, and reduce exposure to content that increases distress.
              </li>
              <li>
                <span className="font-medium text-foreground">Maintain boundaries:</span> You are not required to respond immediately or explain why you need time or space.
              </li>
              <li>
                <span className="font-medium text-foreground">Seek connection:</span> When it feels safe, consider reaching out to trusted people rather than managing difficult feelings alone.
              </li>
            </ul>
          </CardContent>
        </Card>

        <footer className="text-[11px] text-muted-foreground">
          FaceMeX does not provide medical, psychiatric, or crisis services. If you have ongoing concerns about your mental health, consider contacting a licensed mental health professional or your usual healthcare provider.
        </footer>
      </div>
    </div>
  );
}
