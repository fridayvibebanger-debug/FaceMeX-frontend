import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject, type ReactNode } from 'react';
import { ArrowUp, Check, ChevronLeft, FileText, Loader2, Maximize2, Mic, Plus, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export type ComposerAttachment = {
  id: string;
  name: string;
  type: string;
  previewUrl?: string;
};

export type ComposerMenuOption = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
};

export type ComposerMode = 'student' | 'teacher' | 'career';

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
  menuOptions?: ComposerMenuOption[];
  selectedMode?: ComposerMode | null;
  onSelectMode?: (mode: ComposerMode) => void;
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
  menuOptions = [],
  selectedMode = null,
  onSelectMode,
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const canSend = Boolean(value.trim() || attachments.length);
  const isLight = tone === 'light';

  const setRefs = useCallback((element: HTMLTextAreaElement | null) => {
    inputRef.current = element;
    if (textareaRef) textareaRef.current = element;
  }, [textareaRef]);

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
  }, [keyboardInset, value]);

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

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
        setModeOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setModeOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

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
      className="relative mx-auto w-full max-w-3xl lg:max-w-[840px]"
      style={keyboardInset ? { transform: `translateY(-${keyboardInset}px)` } : undefined}
    >
      {attachments.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={`relative flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border p-2 ${
                isLight ? 'border-black/10 bg-white text-slate-900' : 'border-white/10 bg-[#202020] text-white'
              }`}
            >
              {attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/[0.06] text-white/60'
                }`}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              <span className={`min-w-0 flex-1 truncate text-xs ${isLight ? 'text-slate-700' : 'text-white/75'}`}>{attachment.name}</span>
              {onRemoveAttachment && (
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  aria-label={`Remove ${attachment.name}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${
                    isLight ? 'text-slate-500 hover:bg-black/5 hover:text-slate-900' : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
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
          {(onPickAttachments || menuOptions.length > 0) && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  if (menuOptions.length > 0) {
                    setMenuOpen((open) => !open);
                    setModeOpen(false);
                  } else {
                    onPickAttachments?.();
                  }
                }}
                aria-label="Add attachments and tools"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${
                  isLight ? 'text-slate-600 hover:bg-black/5 hover:text-slate-900' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Plus className="h-5 w-5" />
              </button>
              {menuOpen && (
                <div
                  className={`absolute bottom-full left-0 z-50 mb-3 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border p-2 shadow-2xl ${
                    isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-[#242424] text-white'
                  }`}
                  role="menu"
                  aria-label={modeOpen ? 'Choose response mode' : 'Attachments and tools'}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]'));
                    if (!items.length) return;
                    event.preventDefault();
                    const currentIndex = items.findIndex((item) => item === document.activeElement);
                    const offset = event.key === 'ArrowDown' ? 1 : -1;
                    const nextIndex = currentIndex < 0
                      ? event.key === 'ArrowDown' ? 0 : items.length - 1
                      : (currentIndex + offset + items.length) % items.length;
                    items[nextIndex].focus();
                  }}
                >
                  {modeOpen ? (
                    <div className="p-1">
                      <div className="flex items-center gap-2 px-2 pb-2">
                        <button
                          type="button"
                          onClick={() => setModeOpen(false)}
                          aria-label="Back to attachments and tools"
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'
                          }`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div>
                          <p className="text-sm font-semibold">Choose a mode</p>
                          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                            Tailor how FaceMeX explains and advises.
                          </p>
                        </div>
                      </div>
                      {([
                        ['student', 'Student', 'Clear explanations and study support.'],
                        ['teacher', 'Teacher', 'Teaching, lesson planning, and classroom support.'],
                        ['career', 'Career', 'Professional guidance and practical next steps.'],
                      ] as const).map(([id, label, description]) => (
                        <button
                          key={id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={selectedMode === id}
                          onClick={() => {
                            onSelectMode?.(id);
                            setMenuOpen(false);
                            setModeOpen(false);
                          }}
                          className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                            isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{label}</span>
                            <span className={`mt-0.5 block text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{description}</span>
                          </span>
                          {selectedMode === id && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      {menuOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            option.onSelect();
                          }}
                          className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition ${
                            isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-white/85'
                          }`}>
                            {option.icon}
                          </span>
                          {option.label}
                        </button>
                      ))}
                      {onSelectMode && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setModeOpen(true)}
                          className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition ${
                            isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-white/85'
                          }`}>
                            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">Mode</span>
                          {selectedMode && (
                            <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                              {selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}
                            </span>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
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
            aria-label="Send message"
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
          <div className={`mt-1 flex items-center justify-between px-2 text-[11px] ${isLight ? 'text-slate-500' : 'text-white/45'}`}>
            <span>{attachments.length} attachment{attachments.length === 1 ? '' : 's'} ready</span>
            {onClearAttachments && (
              <button
                type="button"
                onClick={onClearAttachments}
                className={`min-h-8 px-2 font-medium ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/65 hover:text-white'}`}
              >
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
