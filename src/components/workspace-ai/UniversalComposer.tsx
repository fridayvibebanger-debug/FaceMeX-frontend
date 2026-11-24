import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject, type ReactNode } from 'react';
import { ArrowUp, Check, ChevronLeft, FileSpreadsheet, FileText, Loader2, Maximize2, Mic, Plus, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const MOBILE_KEYBOARD_VIEWPORT_THRESHOLD = 80;

export type ComposerAttachment = {
  id: string;
  name: string;
  type: string;
  size?: number;
  previewUrl?: string;
};

export type ComposerMenuOption = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
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
  onKeyboardVisibilityChange?: (visible: boolean) => void;
  mobileViewportAware?: boolean;
  className?: string;
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
  placeholder = 'Ask FaceMeX',
  onFocus,
  onClick,
  onKeyboardVisibilityChange,
  mobileViewportAware = false,
  className = '',
}: UniversalComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const expandedInputRef = useRef<HTMLTextAreaElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const compactTextareaWidthAdjustmentRef = useRef(0);
  const selectionRef = useRef<{
    start: number;
    end: number;
    direction: 'forward' | 'backward' | 'none';
  }>({ start: 0, end: 0, direction: 'none' });
  const restoreInputFocusOnCloseRef = useRef(false);
  const textareaHasFocusRef = useRef(false);
  const baselineViewportHeightRef = useRef(0);
  const baselineViewportWidthRef = useRef(0);
  const keyboardVisibilityRef = useRef(false);
  const keyboardVisibilityCallbackRef = useRef(onKeyboardVisibilityChange);
  keyboardVisibilityCallbackRef.current = onKeyboardVisibilityChange;
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [visibleViewportHeight, setVisibleViewportHeight] = useState(0);
  const [visibleViewportBottom, setVisibleViewportBottom] = useState(0);
  const [isMultiline, setIsMultiline] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const canSend = Boolean(value.trim() || attachments.length);
  const isLight = tone === 'light';
  const isMobileMultiline = mobileViewportAware && (isMultiline || attachments.length > 0)
    && typeof window !== 'undefined' && window.innerWidth < 1024;

  useEffect(() => {
    if (!voiceListening) {
      setVoiceSeconds(0);
      return;
    }
    const timer = window.setInterval(() => setVoiceSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [voiceListening]);

  const setRefs = useCallback((element: HTMLTextAreaElement | null) => {
    inputRef.current = element;
    if (textareaRef) textareaRef.current = element;
  }, [textareaRef]);

  const captureSelection = (textarea: HTMLTextAreaElement) => {
    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      direction: textarea.selectionDirection || 'none',
    };
  };

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const computedStyle = window.getComputedStyle(textarea);
    const minimumHeight = Number.parseFloat(computedStyle.minHeight) || 38;
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 20;
    const verticalPadding = (Number.parseFloat(computedStyle.paddingTop) || 0)
      + (Number.parseFloat(computedStyle.paddingBottom) || 0);
    const borderHeight = (Number.parseFloat(computedStyle.borderTopWidth) || 0)
      + (Number.parseFloat(computedStyle.borderBottomWidth) || 0);
    const oneLineHeight = lineHeight + verticalPadding + borderHeight;
    const previousMinHeight = textarea.style.minHeight;
    textarea.style.boxSizing = 'border-box';
    textarea.style.minHeight = '0px';
    textarea.style.maxHeight = 'none';
    textarea.style.height = 'auto';
    const naturalHeight = textarea.scrollHeight + borderHeight;
    textarea.style.minHeight = previousMinHeight;
    let multilineMeasureHeight = naturalHeight;
    if (mobileViewportAware && window.innerWidth < 1024) {
      const wrapper = textarea.parentElement;
      const layout = wrapper?.parentElement;
      if (wrapper && layout) {
        const layoutStyle = window.getComputedStyle(layout);
        const siblingWidth = Array.from(layout.children)
          .filter((child) => child !== wrapper)
          .reduce((width, child) => width + child.getBoundingClientRect().width, 0);
        const columnGap = Number.parseFloat(layoutStyle.columnGap) || 0;
        const estimatedCompactWidth = layout.clientWidth - siblingWidth - columnGap * (layout.children.length - 1);
        const currentTextareaWidth = textarea.getBoundingClientRect().width;
        if (!isMultiline) {
          compactTextareaWidthAdjustmentRef.current = currentTextareaWidth - estimatedCompactWidth;
        }
        const compactWidth = isMultiline
          ? estimatedCompactWidth + compactTextareaWidthAdjustmentRef.current
          : currentTextareaWidth;
        if (compactWidth > 0) {
          const measurement = textarea.cloneNode() as HTMLTextAreaElement;
          measurement.value = value;
          measurement.classList.remove('col-span-4', 'row-start-1', 'self-start', 'pl-2', 'pr-1', 'pr-9');
          measurement.classList.add('pl-1', value.trim() ? 'pr-9' : 'pr-1');
          measurement.style.position = 'fixed';
          measurement.style.left = '-10000px';
          measurement.style.top = '0';
          measurement.style.width = `${compactWidth}px`;
          measurement.style.height = 'auto';
          measurement.style.minHeight = '0px';
          measurement.style.maxHeight = 'none';
          measurement.style.visibility = 'hidden';
          measurement.style.overflowY = 'hidden';
          document.body.appendChild(measurement);
          multilineMeasureHeight = measurement.scrollHeight + borderHeight;
          measurement.remove();
        }
      }
    }
    const viewportHeight = visibleViewportHeight || window.visualViewport?.height || window.innerHeight;
    const mobileMaxHeight = lineHeight * 5 + verticalPadding + borderHeight;
    const requestedMaxHeight = mobileViewportAware
      ? window.innerWidth < 1024
        ? Math.max(minimumHeight, Math.min(mobileMaxHeight, Math.floor(viewportHeight * 0.3)))
        : 240
      : window.innerWidth < 768 ? 144 : 240;
    const maxHeight = Math.max(minimumHeight, requestedMaxHeight);
    const nextHeight = Math.min(Math.max(minimumHeight, naturalHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.maxHeight = `${maxHeight}px`;
    textarea.style.overflowY = naturalHeight > maxHeight ? 'auto' : 'hidden';
    const nextIsMultiline = multilineMeasureHeight > oneLineHeight + 1 || value.includes('\n');
    setIsMultiline((current) => current === nextIsMultiline ? current : nextIsMultiline);
  }, [attachments.length, isMultiline, mobileViewportAware, value, visibleViewportHeight]);

  const updateViewportPosition = useCallback(() => {
    const viewport = window.visualViewport;
    if (!mobileViewportAware) {
      if (!viewport) return;
      if (inputRef.current !== document.activeElement) {
        setKeyboardInset(0);
        return;
      }
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(inset > 80 ? inset : 0);
      return;
    }

    const height = viewport?.height || window.innerHeight;
    const width = window.innerWidth;
    const visibleBottom = viewport
      ? viewport.offsetTop + viewport.height
      : window.innerHeight;
    setVisibleViewportHeight(height);
    setVisibleViewportBottom(visibleBottom);
    const orientationChanged = baselineViewportWidthRef.current > 0
      && Math.abs(width - baselineViewportWidthRef.current) > 80;
    if (baselineViewportHeightRef.current === 0 || orientationChanged) {
      baselineViewportHeightRef.current = height;
      baselineViewportWidthRef.current = width;
    }

    const textareaFocused = textareaHasFocusRef.current || inputRef.current === document.activeElement;
    const viewportReduced = baselineViewportHeightRef.current > 0
      && baselineViewportHeightRef.current - height > MOBILE_KEYBOARD_VIEWPORT_THRESHOLD;
    const viewportBottomInset = viewport
      ? Math.max(0, window.innerHeight - visibleBottom)
      : 0;
    const isMobile = width < 1024;
    const hasKeyboardOcclusion = viewportReduced
      || viewportBottomInset > MOBILE_KEYBOARD_VIEWPORT_THRESHOLD;
    const nextKeyboardVisible = isMobile
      && !orientationChanged
      && hasKeyboardOcclusion
      && (textareaFocused || keyboardVisibilityRef.current);

    if (!textareaFocused && !nextKeyboardVisible) {
      textareaHasFocusRef.current = false;
      baselineViewportHeightRef.current = height;
      baselineViewportWidthRef.current = width;
    }
    setKeyboardVisible(nextKeyboardVisible);
    if (keyboardVisibilityRef.current !== nextKeyboardVisible) {
      keyboardVisibilityRef.current = nextKeyboardVisible;
      keyboardVisibilityCallbackRef.current?.(nextKeyboardVisible);
    }
  }, [mobileViewportAware]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!mobileViewportAware) {
      if (!viewport) return;
      updateViewportPosition();
      viewport.addEventListener('resize', updateViewportPosition);
      return () => viewport.removeEventListener('resize', updateViewportPosition);
    }

    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateViewportPosition();
      });
    };
    updateViewportPosition();
    viewport?.addEventListener('resize', scheduleUpdate);
    viewport?.addEventListener('scroll', scheduleUpdate);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', scheduleUpdate);
      viewport?.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
    };
  }, [mobileViewportAware, updateViewportPosition]);

  useLayoutEffect(() => {
    if (!mobileViewportAware) return;
    if (!keyboardVisible || window.innerWidth >= 1024) {
      setKeyboardInset((currentInset) => currentInset === 0 ? currentInset : 0);
      return;
    }

    const composer = inputRef.current?.closest('div.relative.mx-auto');
    const footer = composer?.closest('footer');
    if (!composer || !footer) {
      const inset = Math.max(0, window.innerHeight - visibleViewportBottom);
      setKeyboardInset((currentInset) => Math.abs(currentInset - inset) < 0.5 ? currentInset : inset);
      return;
    }

    const footerRect = footer.getBoundingClientRect();
    const inset = Math.max(0, footerRect.bottom - visibleViewportBottom);
    setKeyboardInset((currentInset) => Math.abs(currentInset - inset) < 0.5 ? currentInset : inset);
  });

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
    restoreInputFocusOnCloseRef.current = false;
    setExpanded(false);
    onSend();
  };
  const voiceDuration = `${Math.floor(voiceSeconds / 60).toString().padStart(2, '0')}:${(voiceSeconds % 60).toString().padStart(2, '0')}`;

  return (
    <div
      className="relative mx-auto w-full max-w-3xl lg:max-w-[840px]"
      style={keyboardInset ? { transform: `translateY(-${keyboardInset}px)` } : undefined}
    >
      {voiceListening && (
        <div className={`mb-2 flex min-h-10 items-center gap-2 px-2 text-sm ${
          isLight ? 'text-slate-700' : 'text-white/80'
        }`} role="status" aria-live="polite">
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
          <span className="min-w-0 flex-1">Listening · {voiceDuration}</span>
          <button
            type="button"
            onClick={onVoiceToggle}
            className={`min-h-9 rounded-full px-3 text-xs font-medium ${
              isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            Stop
          </button>
        </div>
      )}

      <div className={`fm-universal-composer-card box-border w-full ${className} ${
        attachments.length > 0
          ? 'rounded-[24px]'
          : mobileViewportAware && isMultiline
            ? 'rounded-[24px] lg:rounded-[999px]'
            : 'rounded-[999px]'
      } border px-1.5 py-1 shadow-[0_8px_32px_rgba(0,0,0,.14)] sm:px-3 sm:py-1.5 lg:min-h-[52px] lg:px-2 lg:py-1 ${
        isLight ? 'border-black/10 bg-white/95' : 'border-white/10 bg-[#171717] shadow-black/25'
      }`}>
        {attachments.length > 0 && (
          <div
            className="grid grid-cols-2 gap-2 px-1 pt-1 sm:grid-cols-3"
            aria-label="Attachments"
            role="list"
          >
            {attachments.map((attachment) => {
              const extension = attachment.name.includes('.')
                ? attachment.name.split('.').pop()?.toUpperCase() || ''
                : attachment.type.split('/').pop()?.toUpperCase() || 'FILE';
              const formattedSize = typeof attachment.size === 'number' && attachment.size > 0
                ? attachment.size < 1024 * 1024
                  ? `${Math.max(1, Math.round(attachment.size / 1024))} KB`
                  : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`
                : '';

              return (
                <div
                  key={attachment.id}
                  role="listitem"
                  className={`relative min-w-0 overflow-hidden rounded-xl ${
                    attachment.previewUrl
                      ? 'aspect-[1.15] max-w-[190px]'
                      : `flex min-h-[76px] items-center gap-3 border p-3 ${
                          isLight ? 'border-black/10 bg-slate-50' : 'border-white/10 bg-[#222]'
                        }`
                  }`}
                >
                  {attachment.previewUrl ? (
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.name}
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    <>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                        isLight ? 'bg-white text-slate-600' : 'bg-white/[0.07] text-white/75'
                      }`}>
                        {attachment.type.includes('spreadsheet')
                          ? <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
                          : <FileText className="h-5 w-5" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1 pr-7">
                        <span className={`block truncate text-xs font-medium ${
                          isLight ? 'text-slate-800' : 'text-white/90'
                        }`} title={attachment.name}>
                          {attachment.name}
                        </span>
                        <span className={`mt-1 block text-[10px] ${
                          isLight ? 'text-slate-500' : 'text-white/45'
                        }`}>
                          {[extension, formattedSize].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </>
                  )}
                  {attachment.previewUrl && (
                    <span
                      className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-[10px] text-white"
                      title={attachment.name}
                    >
                      {attachment.name}
                    </span>
                  )}
                  {onRemoveAttachment && (
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                      className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${
                        isLight
                          ? 'bg-white/95 text-slate-700 hover:bg-white'
                          : 'bg-black/75 text-white hover:bg-black'
                      }`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className={`${
          isMobileMultiline
            ? 'grid grid-cols-[38px_minmax(0,1fr)_38px_38px] gap-x-1 gap-y-1 sm:grid-cols-[44px_minmax(0,1fr)_44px_44px]'
            : 'flex flex-row items-center gap-1 sm:gap-1.5'
        } min-h-[38px] w-full min-w-0 sm:min-h-11 lg:min-h-[38px]`}>
          {(onPickAttachments || menuOptions.length > 0) && (
            <div className={`relative ${isMobileMultiline ? 'col-start-1 row-start-2 self-end' : ''}`} ref={menuRef}>
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
                className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 sm:h-11 sm:w-11 lg:h-9 lg:w-9 ${
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
                          disabled={option.disabled}
                          aria-disabled={option.disabled || undefined}
                          title={option.disabledReason}
                          onClick={() => {
                            if (option.disabled) return;
                            setMenuOpen(false);
                            option.onSelect();
                          }}
                          className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition ${
                            option.disabled
                              ? isLight ? 'cursor-not-allowed text-slate-400' : 'cursor-not-allowed text-white/35'
                              : isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            option.disabled
                              ? isLight ? 'bg-slate-50 text-slate-400' : 'bg-white/[0.04] text-white/35'
                              : isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-white/85'
                          }`}>
                            {option.icon}
                          </span>
                          <span className="min-w-0 flex-1">{option.label}</span>
                          {option.disabled && (
                            <span className={`shrink-0 text-[10px] ${isLight ? 'text-slate-400' : 'text-white/35'}`}>
                                Coming soon
                            </span>
                          )}
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

          <div className={isMobileMultiline ? 'contents' : 'relative min-w-0 flex-1'}>
            <Textarea
              ref={setRefs}
              rows={1}
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
                captureSelection(event.currentTarget);
              }}
              onSelect={(event) => captureSelection(event.currentTarget)}
              onFocus={() => {
                textareaHasFocusRef.current = true;
                baselineViewportHeightRef.current = window.visualViewport?.height || window.innerHeight;
                baselineViewportWidthRef.current = window.innerWidth;
                onFocus?.();
                requestAnimationFrame(updateViewportPosition);
              }}
              onBlur={() => {
                requestAnimationFrame(updateViewportPosition);
              }}
              onClick={onClick}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label="Message FaceMeX"
              style={{ display: 'block' }}
              className={`min-h-[38px] min-w-0 w-full resize-none overflow-x-hidden border-0 bg-transparent py-1.5 pl-1 text-[clamp(14px,4vw,16px)] leading-5 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:whitespace-nowrap sm:min-h-11 sm:py-2 lg:min-h-[30px] lg:py-1.5 ${
                isLight
                  ? 'text-slate-800 placeholder:text-slate-400'
                  : 'text-white/90 placeholder:text-white/45'
              } ${isMobileMultiline ? 'col-span-4 row-start-1 self-start pl-2 pr-1' : value.trim() ? 'pr-9' : 'pr-1'} ${mobileViewportAware ? 'fm-universal-composer-hide-scrollbar' : ''}`}
            />
            {value.trim() && (
              <button
                type="button"
                aria-label="Expand writing area"
                aria-expanded={expanded}
                aria-haspopup="dialog"
                title="Expand writing area"
                onClick={() => {
                  if (inputRef.current) captureSelection(inputRef.current);
                  restoreInputFocusOnCloseRef.current = true;
                  setExpanded(true);
                }}
                className={`${isMobileMultiline ? 'static col-start-2 row-start-2 self-end' : 'absolute bottom-1 right-0'} flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${
                  isLight ? 'text-slate-500 hover:bg-black/5 hover:text-slate-900' : 'text-white/65 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {onVoiceToggle && (
            <button
              type="button"
              onClick={onVoiceToggle}
              aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={voiceListening}
              title={voiceListening ? 'Listening' : 'Voice input'}
              className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 sm:h-11 sm:w-11 lg:h-9 lg:w-9 ${
                isMobileMultiline ? 'col-start-3 row-start-2 self-end' : ''
              } ${
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
            data-can-send={canSend ? 'true' : 'false'}
            aria-label="Send message"
            className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full shadow-none transition disabled:cursor-not-allowed sm:h-11 sm:w-11 lg:h-9 lg:w-9 ${
              isMobileMultiline ? 'col-start-4 row-start-2 self-end' : ''
            } ${
              isLight
                ? 'bg-[#dedede] text-[#3a3a3a] hover:bg-[#d2d2d2] disabled:bg-[#e7e7e7] disabled:text-[#777]'
                : 'bg-[#383838] text-white/85 hover:bg-[#484848] disabled:bg-[#383838] disabled:text-white/35'
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

      <Dialog
        open={expanded}
        onOpenChange={(open) => {
          if (open) restoreInputFocusOnCloseRef.current = true;
          setExpanded(open);
        }}
      >
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const textarea = expandedInputRef.current;
            if (!textarea) return;
            const { start, end, direction } = selectionRef.current;
            textarea.blur();
            textarea.setSelectionRange(start, end, direction);
            textarea.focus();
          }}
          onCloseAutoFocus={(event) => {
            if (!restoreInputFocusOnCloseRef.current) return;
            event.preventDefault();
            const textarea = inputRef.current;
            if (!textarea) return;
            const { start, end, direction } = selectionRef.current;
            textarea.blur();
            textarea.setSelectionRange(start, end, direction);
            textarea.focus();
            restoreInputFocusOnCloseRef.current = false;
          }}
          className={`w-[calc(100%-1rem)] max-w-3xl p-4 sm:p-6 ${
            isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-[#171717] text-white'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">Write a message</DialogTitle>
            <DialogDescription className="sr-only">
              Continue writing from the current cursor position.
            </DialogDescription>
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
            ref={expandedInputRef}
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              captureSelection(event.currentTarget);
            }}
            onSelect={(event) => captureSelection(event.currentTarget)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Expanded message editor"
            style={{ display: 'block' }}
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
                  ? 'bg-[#dedede] text-[#3a3a3a] hover:bg-[#d2d2d2] disabled:bg-[#e7e7e7] disabled:text-[#777]'
                  : 'bg-[#383838] text-white/85 hover:bg-[#484848] disabled:bg-[#383838] disabled:text-white/35'
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
