import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScreenshotWarningProps {
  context?: string;
}

export default function ScreenshotWarning({ context = 'messages' }: ScreenshotWarningProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let blurred = false;

    const handleBlur = () => {
      blurred = true;
    };

    const handleFocus = () => {
      if (!blurred) return;
      blurred = false;
      setActive(true);
      api
        .post('/api/safety/screenshot-log', {
          kind: 'screenshot',
          context: { location: context, reason: 'blur-focus' },
        })
        .catch(() => {});
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [context]);

  const handleManualReport = () => {
    setActive(true);
    api.post('/api/safety/screenshot-log', {
      kind: 'screenshot',
      context: { location: context, reason: 'manual-report' },
    }).catch(() => {});
  };

  if (!active) {
    return (
      <div className="w-full flex justify-end mb-2 pr-4">
        <Button
          type="button"
          size="xs" // @ts-ignore size extension
          variant="ghost"
          className="text-[11px] text-muted-foreground h-6 px-2"
          onClick={handleManualReport}
        >
          Report screenshot attempt
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 mb-3">
      <div className="relative overflow-hidden rounded-md border border-yellow-300/60 bg-yellow-50/80 text-xs flex items-center gap-2 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-yellow-800">Screenshot protection active</p>
          <p className="text-[11px] text-yellow-800/80">
            For your privacy, sensitive content may be blurred or limited when screenshots or screen recordings are detected.
          </p>
        </div>
        <Button
          type="button"
          size="xs" // @ts-ignore size extension
          variant="outline"
          className="h-6 px-2 text-[11px]"
          onClick={() => setActive(false)}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
