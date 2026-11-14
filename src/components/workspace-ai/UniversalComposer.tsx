import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject, type ReactNode } from 'react';
import { ArrowUp, FileText, Loader2, Maximize2, Mic, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export type ComposerAttachment = {
  id: string;
  name: string;
  type: string;
  previewUrl?: string;
};

type UniversalComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  textareaRef?: MutableRefObject<HTMLTextAreaElement | null>;
  attachments?: ComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;
  onClearAttachments?: () => void;
  onPickAttachments?: () => void;
  attachmentPicker?: ReactNode;
  leadingControl?: ReactNode;
  onVoiceToggle?: () => void;
  voiceListening?: boolean;
  busy?: boolean;
  enterToSend?: boolean;
  tone?: 'dark' | 'light';
  placeholder?: string;
  onFocus?: () => void;
  onClick?: () => void;
};

export default function UniversalComposer({
  value,
  onChange,
  onSend,
  textareaRef,
  attachments = [],
  onRemoveAttachment,
  onClearAttachments,
  onPickAttachments,
  attachmentPicker,
  leadingControl,
  onVoiceToggle,
  voiceListening = false,
  busy = false,
  enterToSend = true,
  tone = 'dark',
  placeholder = 'Message FaceMeX',
  onFocus,
  onClick,
}: UniversalComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const canSend = Boolean(value.trim() || attachments.length);
  const isLight = tone === 'light';

  const setRefs = (element: HTMLTextAreaElement | null) => {
    inputRef.current = element;
    if (textareaRef) textareaRef.current = element;
  };

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const maxHeight = Math.min(240, Math.max(96, Math.floor(viewportHeight * 0.32)));
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.maxHeight = `${maxHeight}px`;
    textarea.style.overflowY = nextHeight >= maxHeight ? 'auto' : 'hidden';
  }, [value]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardInset = () => {
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };
    updateKeyboardInset();
    viewport.addEventListener('resize', updateKeyboardInset);
    viewport.addEventListener('scroll', updateKeyboardInset);
    return () => {
      viewport.removeEventListener('resize', updateKeyboardInset);
      viewport.removeEventListener('scroll', updateKeyboardInset);
    };
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (
      enterToSend &&
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      if (!busy && canSend) onSend();
    }
  };

  const submit = () => {
    if (busy || !canSend) return;
    setExpanded(false);
    onSend();
  };

  return (
    <div
      className="mx-auto w-full max-w-3xl lg:max-w-[840px]"
      style={keyboardInset ? { transform: `translateY(-${keyboardInset}px)` } : undefined}
    >
      {attachments.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-[#202020] p-2"
            >
              {attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/60">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-white/75">{attachment.name}</span>
              {onRemoveAttachment && (
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  aria-label={`Remove ${attachment.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={`fm-universal-composer-card rounded-[24px] border px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,.14)] sm:px-3 ${
        isLight ? 'border-black/10 bg-white/95' : 'border-white/10 bg-[#171717] shadow-black/25'
      }`}>
        <div className="flex min-h-11 items-end gap-1.5 sm:gap-2">
          {leadingControl}
          {onPickAttachments && (
            <button
              type="button"
              onClick={onPickAttachments}
              aria-label="Add an image or document"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${
                isLight ? 'text-slate-600 hover:bg-black/5 hover:text-slate-900' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Plus className="h-5 w-5" />
            </button>
          )}

          <Textarea
            ref={setRefs}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onFocus}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Message FaceMeX"
            className={`min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-3 text-[15px] leading-5 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isLight
                ? 'text-slate-800 placeholder:text-slate-400'
                : 'text-white/90 placeholder:text-white/45'
            }`}
          />

          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand writing area"
            aria-expanded={expanded}
            aria-haspopup="dialog"
            title="Expand writing area"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${
              isLight ? 'text-slate-500 hover:bg-black/5 hover:text-slate-900' : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {onVoiceToggle && (
            <button
              type="button"
              onClick={onVoiceToggle}
              aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={voiceListening}
              title={voiceListening ? 'Listening' : 'Voice input'}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${
                voiceListening
                  ? 'bg-red-500/15 text-red-500'
                  : isLight
                    ? 'text-slate-600 hover:bg-black/5 hover:text-slate-900'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>
          )}

          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={busy || !canSend}
            aria-label="Send to FaceMeX"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-none transition disabled:cursor-not-allowed ${
              isLight
                ? 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-white/70'
                : 'bg-white text-[#171717] hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40'
            }`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
          </Button>
        </div>

        {attachments.length > 0 && (
          <div className="mt-1 flex items-center justify-between px-2 text-[11px] text-white/45">
            <span>{attachments.length} attachment{attachments.length === 1 ? '' : 's'} ready</span>
            {onClearAttachments && (
              <button type="button" onClick={onClearAttachments} className="min-h-8 px-2 font-medium text-white/65 hover:text-white">
                Remove all
              </button>
            )}
          </div>
        )}
      </div>

      {attachmentPicker}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className={`w-[calc(100%-1rem)] max-w-3xl p-4 sm:p-6 ${
          isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-[#171717] text-white'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">Write a message</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(false)}
              aria-label="Close expanded editor"
              className={`h-10 w-10 rounded-full ${
                isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Expanded message editor"
            autoFocus
            className={`mt-3 min-h-[38dvh] resize-y text-[15px] leading-7 focus-visible:ring-sky-300 ${
              isLight
                ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                : 'border-white/10 bg-black/20 text-white placeholder:text-white/45'
            }`}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={submit}
              disabled={busy || !canSend}
              className={`min-h-11 rounded-full px-5 ${
                isLight
                  ? 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300'
                  : 'bg-white text-[#171717] hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40'
              }`}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUp className="mr-2 h-4 w-4" />}
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
