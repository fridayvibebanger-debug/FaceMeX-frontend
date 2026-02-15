import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { SafetyScanResult } from '@/lib/safety';

export default function SafetyWarningDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  scan: SafetyScanResult | null;
  primaryActionLabel?: string;
  onPrimaryAction: () => void;
}) {
  const { open, onOpenChange, scan, title, primaryActionLabel, onPrimaryAction } = props;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span>{title || 'Safety check'}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {scan?.summary || 'This content may be unsafe. Please review before continuing.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {scan?.reasons?.length ? (
          <div className="mt-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <div className="font-medium">What we noticed</div>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {scan.reasons.slice(0, 5).map((r) => (
                <li key={r}>- {r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline">
              Review
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" onClick={onPrimaryAction}>
              {primaryActionLabel || 'Continue'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
