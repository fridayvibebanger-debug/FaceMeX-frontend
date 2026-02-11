import { ReactNode, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface SensitiveContentShieldProps {
  children: ReactNode;
  context: string;
  className?: string;
}

export default function SensitiveContentShield({ children, context, className }: SensitiveContentShieldProps) {
  const [shielded, setShielded] = useState(false);
  const [revealUntil, setRevealUntil] = useState<number>(0);
  const [, forceTick] = useState(0);

  const revealed = useMemo(() => {
    if (!revealUntil) return false;
    return Date.now() < revealUntil;
  }, [revealUntil]);

  useEffect(() => {
    if (!revealUntil) return;
    const id = window.setInterval(() => forceTick((x) => x + 1), 500);
    return () => window.clearInterval(id);
  }, [revealUntil]);

  useEffect(() => {
    let blurred = false;

    const activateShield = (reason: string) => {
      setShielded(true);
      api
        .post('/api/safety/screenshot-log', {
          kind: 'screenshot',
          context: { location: context, reason },
        })
        .catch(() => {});
    };

    const handleBlur = () => {
      blurred = true;
      activateShield('window-blur');
    };

    const handleFocus = () => {
      if (!blurred) return;
      blurred = false;
      activateShield('window-focus-after-blur');
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        activateShield('visibility-hidden');
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [context]);

  const active = shielded && !revealed;

  return (
    <div className={`relative ${className || ''}`}>
      <div className={active ? 'pointer-events-none select-none blur-sm' : ''}>{children}</div>
      {active ? (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur p-4">
            <div className="text-sm font-medium">This conversation is protected for privacy</div>
            <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Content is hidden when the app is backgrounded or capture activity is suspected.
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShielded(false);
                  setRevealUntil(0);
                }}
              >
                Keep hidden
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setRevealUntil(Date.now() + 30_000);
                }}
              >
                Show for 30 seconds
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
