import { useCallback, useEffect, useRef, useState } from 'react';
import { MoreVertical, X } from 'lucide-react';
import { api } from '@/lib/api';
import VoiceComposer from './VoiceComposer';
import VoiceConfirmationCard, { type VoiceActionConfirmation } from './VoiceConfirmationCard';
import VoiceLanguageSelector, {
  VOICE_LANGUAGES,
  type VoiceLanguageCode,
  type VoiceTtsProvider,
} from './VoiceLanguageSelector';
import VoiceOrb from './VoiceOrb';
import VoiceStatus, { type VoiceSessionStatus } from './VoiceStatus';
import './VoiceModeScreen.css';

export type VoiceConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type VoiceModeScreenProps = {
  initialMessages: VoiceConversationMessage[];
  onMessagesChange: (messages: VoiceConversationMessage[]) => void;
  onClose: () => void;
};

type ConversationMode = 'continuous' | 'tap';

const VOICE_RESPONSE_INSTRUCTIONS = [
  'Answer the user conversationally in a single JSON object with string field "response" and field "pendingAction".',
  'Set "pendingAction" to null for ordinary conversation.',
  'If a request would affect another service or person (for example send, submit, publish, purchase, book, or delete), do not perform it and do not claim it was performed.',
  'Instead prepare a proposal and set "pendingAction" to an object with string fields "application", "title", and "details", plus an optional string "preview" and optional "confirmLabel".',
  'The proposal must be specific and ready for the user to review. Never invent missing recipients, amounts, or other material details; ask a question in "response" when information is missing.',
  'Only the user can approve the proposal. FaceMeX may not have an executor connected, so never claim an external action succeeded.',
].join(' ');

function normalizeActionConfirmation(value: unknown): VoiceActionConfirmation | null {
  if (!value || typeof value !== 'object') return null;
  const action = value as Record<string, unknown>;
  if (
    typeof action.application !== 'string' ||
    typeof action.title !== 'string' ||
    typeof action.details !== 'string'
  ) return null;
  if (!action.application.trim() || !action.title.trim() || !action.details.trim()) return null;

  return {
    id: typeof action.id === 'string' ? action.id : `voice-action-${Date.now()}`,
    application: action.application,
    title: action.title,
    details: action.details,
    ...(typeof action.preview === 'string' ? { preview: action.preview } : {}),
    ...(typeof action.confirmLabel === 'string' ? { confirmLabel: action.confirmLabel } : {}),
    ...(typeof action.cancelLabel === 'string' ? { cancelLabel: action.cancelLabel } : {}),
  };
}

function parseVoiceResponse(data: Record<string, unknown>) {
  let response = String(data.response || data.content || data.text || data.reply || '').trim();
  let pendingAction = normalizeActionConfirmation(data.pendingAction || data.confirmation);

  try {
    const parsed: unknown = JSON.parse(response);
    if (parsed && typeof parsed === 'object' && 'response' in parsed && 'pendingAction' in parsed) {
      const envelope = parsed as { response?: unknown; pendingAction?: unknown };
      response = typeof envelope.response === 'string' ? envelope.response.trim() : '';
      pendingAction = normalizeActionConfirmation(envelope.pendingAction);
    }
  } catch {
    // Providers may return ordinary prose when they do not follow the structured response instruction.
  }

  return { response, pendingAction };
}

function createConversationMessage(role: VoiceConversationMessage['role'], content: string): VoiceConversationMessage {
  return {
    id: `${Date.now()}-${role}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function VoiceModeScreen({
  initialMessages,
  onMessagesChange,
  onClose,
}: VoiceModeScreenProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [language, setLanguage] = useState<VoiceLanguageCode | ''>('');
  const [configuredLanguage, setConfiguredLanguage] = useState('en-US');
  const [provider, setProvider] = useState<VoiceTtsProvider>('elevenlabs');
  const [availableProviders, setAvailableProviders] = useState<Record<VoiceTtsProvider, boolean>>({
    elevenlabs: false,
    polly: false,
  });
  const [deepgramAvailable, setDeepgramAvailable] = useState(false);
  const [voiceSettingsLoaded, setVoiceSettingsLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmation, setConfirmation] = useState<VoiceActionConfirmation | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<ConversationMode>('continuous');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const messagesRef = useRef(messages);
  const microphoneRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const submitRecordingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef('');
  const voiceRequestControllerRef = useRef<AbortController | null>(null);
  const sessionActiveRef = useRef(false);
  const responsePendingRef = useRef(false);
  const requestIdRef = useRef(0);
  const modeRef = useRef(mode);
  const startListeningRef = useRef<() => Promise<void>>(async () => undefined);
  const sendMessageRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const processRecordingRef = useRef<(audio: Blob) => Promise<void>>(async () => undefined);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    let active = true;
    api.get('/api/voice/providers')
      .then((data) => {
        if (!active) return;
        const available = {
          elevenlabs: Boolean(data?.tts?.providers?.elevenlabs?.available),
          polly: Boolean(data?.tts?.providers?.polly?.available),
        };
        setDeepgramAvailable(Boolean(data?.transcription?.available));
        setConfiguredLanguage(
          typeof data?.transcription?.language === 'string'
            ? data.transcription.language
            : 'en-US',
        );
        setAvailableProviders(available);
        const defaultProvider = data?.tts?.defaultProvider as VoiceTtsProvider | null;
        setProvider((current) =>
          available[current]
            ? current
            : defaultProvider && available[defaultProvider]
              ? defaultProvider
              : available.elevenlabs
                ? 'elevenlabs'
                : 'polly'
        );
        setVoiceSettingsLoaded(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load voice provider settings.');
      });
    return () => {
      active = false;
    };
  }, []);

  const appendMessage = useCallback((message: VoiceConversationMessage) => {
    const nextMessages = [...messagesRef.current, message];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
  }, []);

  const clearPlayback = useCallback(() => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = '';
    }
  }, []);

  const stopRecording = useCallback((submit: boolean) => {
    if (recordingTimerRef.current !== null) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    submitRecordingRef.current = submit;
    recorder.stop();
  }, []);

  const releaseAudio = useCallback(() => {
    microphoneRef.current?.getTracks().forEach((track) => track.stop());
    microphoneRef.current = null;
    analyserRef.current = null;
    setAnalyser(null);
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') {
      void context.close();
    }
  }, []);

  const prepareAudio = useCallback(async () => {
    if (microphoneRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access requires a secure browser context with media support.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    try {
      if (!sessionActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const nextAnalyser = context.createAnalyser();
      nextAnalyser.fftSize = 256;
      source.connect(nextAnalyser);
      microphoneRef.current = stream;
      audioContextRef.current = context;
      analyserRef.current = nextAnalyser;
      setAnalyser(nextAnalyser);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      throw error;
    }
  }, []);

  const beginListening = useCallback(async () => {
    if (!sessionActiveRef.current) return;
    if (!navigator.onLine) {
      setStatus('disconnected');
      setErrorMessage('You are offline. Voice conversation will reconnect when the network returns.');
      return;
    }
    if (!deepgramAvailable) {
      sessionActiveRef.current = false;
      setStatus('error');
      setErrorMessage('Deepgram speech recognition is not configured. Please contact the administrator.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      sessionActiveRef.current = false;
      setStatus('error');
      setErrorMessage('Audio recording is not supported in this browser.');
      return;
    }
    setStatus('connecting');
    setErrorMessage('');

    try {
      await prepareAudio();
      if (!sessionActiveRef.current) return;
      const stream = microphoneRef.current;
      if (!stream) throw new Error('Microphone access is not available.');
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/webm',
      ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      submitRecordingRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        recorderRef.current = null;
        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];
        const shouldSubmit = submitRecordingRef.current;
        submitRecordingRef.current = false;
        if (!shouldSubmit) return;
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (!audio.size) {
          setStatus('error');
          setErrorMessage('No audio was recorded. Check your microphone and try again.');
          return;
        }
        if (audio.size > 8 * 1024 * 1024) {
          setStatus('error');
          setErrorMessage('This recording is too large. Keep voice messages under 30 seconds.');
          return;
        }
        void processRecordingRef.current(audio);
      };
      recorder.onerror = () => {
        recorderRef.current = null;
        setStatus('error');
        setErrorMessage('The microphone recording failed. Check microphone permissions and try again.');
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setTranscript('');
      setStatus('listening');
      setErrorMessage('');
      recordingTimerRef.current = window.setTimeout(() => {
        setStatus('transcribing');
        stopRecording(true);
      }, 30_000);
    } catch (error) {
      sessionActiveRef.current = false;
      releaseAudio();
      setStatus('error');
      const isPermissionError = error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');
      setErrorMessage(isPermissionError
        ? 'Microphone permission was denied. Allow microphone access in your browser settings and try again.'
        : error instanceof Error
          ? error.message
          : 'Unable to start the microphone.');
    }
  }, [deepgramAvailable, prepareAudio, releaseAudio, stopRecording]);

  const processRecording = useCallback(async (audio: Blob) => {
    const requestId = ++requestIdRef.current;
    voiceRequestControllerRef.current?.abort();
    const controller = new AbortController();
    voiceRequestControllerRef.current = controller;
    setStatus('transcribing');
    setErrorMessage('');

    try {
      const data = await api.postAudio(
        language
          ? `/api/voice/transcribe?language=${encodeURIComponent(language)}`
          : '/api/voice/transcribe',
        audio,
        controller.signal,
      );
      if (requestId !== requestIdRef.current) return;
      const recognizedText = typeof data?.text === 'string' ? data.text.trim() : '';
      if (!recognizedText) {
        throw new Error('No speech was recognized. Try speaking closer to the microphone.');
      }
      setTranscript(recognizedText);
      voiceRequestControllerRef.current = null;
      await sendMessageRef.current(recognizedText);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      responsePendingRef.current = false;
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to transcribe this recording.');
    }
  }, [language]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || responsePendingRef.current) return;
    responsePendingRef.current = true;
    const requestId = ++requestIdRef.current;
    voiceRequestControllerRef.current?.abort();
    const controller = new AbortController();
    voiceRequestControllerRef.current = controller;
    clearPlayback();
    stopRecording(false);
    setErrorMessage('');
    setConfirmation(null);
    setTranscript(trimmed);
    setStatus('processing');

    appendMessage(createConversationMessage('user', trimmed));

    try {
      const conversation = messagesRef.current
        .slice(-17)
        .map(({ role, content }) => `${role === 'assistant' ? 'FaceMeX' : 'User'}: ${content.trim().slice(-2000)}`)
        .join('\n\n');
      const data = await api.postViaSameOriginProxy('/api/ai/reply', {
        message: conversation,
        style: VOICE_RESPONSE_INSTRUCTIONS,
      }, controller.signal);
      if (requestId !== requestIdRef.current) return;
      if (data?.success === false) {
        throw new Error(data.error || 'The AI service could not complete this response.');
      }

      const { response, pendingAction } = parseVoiceResponse(data || {});
      if (!response) throw new Error('The AI service returned an empty response.');

      appendMessage(createConversationMessage('assistant', response));
      setTranscript('');
      if (pendingAction) {
        setConfirmation(pendingAction);
        setStatus('idle');
        responsePendingRef.current = false;
        voiceRequestControllerRef.current = null;
        return;
      }

      const speech = await api.post('/api/voice/speak', {
        text: response,
        provider,
      }, controller.signal);
      if (requestId !== requestIdRef.current) return;
      if (typeof speech?.audio !== 'string' || !speech.audio) {
        throw new Error('The speech service returned no playable audio.');
      }

      const decodedAudio = window.atob(speech.audio);
      const audioBytes = new Uint8Array(decodedAudio.length);
      for (let index = 0; index < decodedAudio.length; index += 1) {
        audioBytes[index] = decodedAudio.charCodeAt(index);
      }
      const audioBlob = new Blob([audioBytes], { type: speech.mimeType || 'audio/mpeg' });
      audioUrlRef.current = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrlRef.current);
      audioRef.current = audio;
      audio.onended = () => {
        if (requestId !== requestIdRef.current) return;
        clearPlayback();
        voiceRequestControllerRef.current = null;
        responsePendingRef.current = false;
        if (sessionActiveRef.current && modeRef.current === 'continuous') {
          void startListeningRef.current();
        } else {
          sessionActiveRef.current = false;
          releaseAudio();
          setStatus('idle');
        }
      };
      audio.onerror = () => {
        if (requestId !== requestIdRef.current) return;
        clearPlayback();
        voiceRequestControllerRef.current = null;
        responsePendingRef.current = false;
        setStatus('error');
        setErrorMessage('The generated speech could not be played. Try again or choose another provider.');
      };
      setStatus('speaking');
      await audio.play();
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      clearPlayback();
      voiceRequestControllerRef.current = null;
      responsePendingRef.current = false;
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to get a voice response.');
    }
  }, [appendMessage, clearPlayback, provider, releaseAudio, stopRecording]);

  startListeningRef.current = beginListening;
  sendMessageRef.current = sendMessage;
  processRecordingRef.current = processRecording;

  const finishRecording = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return;
    setStatus('transcribing');
    stopRecording(true);
  }, [stopRecording]);

  const startConversation = useCallback(() => {
    sessionActiveRef.current = true;
    void beginListening();
  }, [beginListening]);

  const stopConversation = useCallback(() => {
    sessionActiveRef.current = false;
    responsePendingRef.current = false;
    requestIdRef.current += 1;
    voiceRequestControllerRef.current?.abort();
    voiceRequestControllerRef.current = null;
    clearPlayback();
    stopRecording(false);
    releaseAudio();
    setStatus('idle');
    setErrorMessage('');
  }, [clearPlayback, releaseAudio, stopRecording]);

  const toggleListening = useCallback(() => {
    if (status === 'listening') {
      finishRecording();
      return;
    }
    if (status === 'speaking' || status === 'processing' || status === 'transcribing') {
      requestIdRef.current += 1;
      voiceRequestControllerRef.current?.abort();
      voiceRequestControllerRef.current = null;
      clearPlayback();
      responsePendingRef.current = false;
      setStatus('interrupted');
      sessionActiveRef.current = true;
      void startListeningRef.current();
      return;
    }
    if (status === 'connecting') {
      stopConversation();
      return;
    }
    if (sessionActiveRef.current) {
      void startListeningRef.current();
      return;
    }
    startConversation();
  }, [clearPlayback, finishRecording, startConversation, status, stopConversation]);

  const handleSubmit = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    sessionActiveRef.current = false;
    stopRecording(false);
    void sendMessage(text);
  }, [draft, sendMessage, stopRecording]);

  const handleConfirmation = useCallback((approved: boolean) => {
    if (!confirmation) return;
    const action = confirmation;
    setConfirmation(null);
    if (approved) {
      void sendMessage(
        `I explicitly approve the proposed action "${action.title}" in ${action.application}. ` +
        `Its details are: ${action.details}. The current FaceMeX session has no connected external action executor; ` +
        'do not claim this was sent, submitted, or executed. Tell me what can safely happen next.'
      );
    } else if (sessionActiveRef.current && modeRef.current === 'continuous') {
      void beginListening();
    } else {
      sessionActiveRef.current = false;
      releaseAudio();
      setStatus('idle');
    }
  }, [beginListening, confirmation, releaseAudio, sendMessage]);

  useEffect(() => {
    const handleOffline = () => {
      if (!sessionActiveRef.current) return;
      requestIdRef.current += 1;
      voiceRequestControllerRef.current?.abort();
      clearPlayback();
      responsePendingRef.current = false;
      stopRecording(false);
      setStatus('disconnected');
      setErrorMessage('You are offline. Voice conversation will reconnect when the network returns.');
    };
    const handleOnline = () => {
      if (!sessionActiveRef.current) return;
      setErrorMessage('');
      void beginListening();
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [beginListening, clearPlayback, stopRecording]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      sessionActiveRef.current = false;
      responsePendingRef.current = false;
      requestIdRef.current += 1;
      voiceRequestControllerRef.current?.abort();
      stopRecording(false);
      clearPlayback();
      releaseAudio();
    };
  }, [clearPlayback, releaseAudio, stopRecording]);

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const isActive = status === 'listening' || status === 'connecting';
  const selectorsLocked = isActive || status === 'transcribing' || status === 'processing' || status === 'speaking';
  const selectedLanguage = language
    ? VOICE_LANGUAGES.find((item) => item.code === language)?.label || language
    : configuredLanguage;

  return (
    <main className="facemex-voice-screen">
      <header className="facemex-voice-screen__header">
        <button type="button" className="facemex-voice-screen__round-button" onClick={onClose} aria-label="Close Voice Mode">
          <X size={24} />
        </button>
        <VoiceStatus status={status} />
        <div className="facemex-voice-menu-wrap">
          <button
            type="button"
            className="facemex-voice-screen__round-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Voice Mode menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={23} />
          </button>
          {menuOpen && (
            <div className="facemex-voice-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { stopConversation(); setMenuOpen(false); }}>
                Stop voice session
              </button>
              <button type="button" role="menuitem" onClick={() => { stopConversation(); onClose(); }}>
                Exit Voice Mode
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="facemex-voice-screen__content">
        <section className="facemex-voice-main" aria-label="Voice conversation">
          {confirmation && (
            <div className="facemex-voice-confirm-wrap">
              <VoiceConfirmationCard
                action={confirmation}
                onConfirm={() => handleConfirmation(true)}
                onCancel={() => handleConfirmation(false)}
              />
            </div>
          )}
          <div className="facemex-voice-main__orb">
            <VoiceOrb status={status} analyser={analyser} />
          </div>
          <div className="facemex-voice-main__copy">
            <p className="facemex-voice-main__eyebrow">FACEMEX VOICE</p>
            <p className="facemex-voice-main__text">
              {transcript || latestAssistantMessage?.content || 'Hi, how can I help you today?'}
            </p>
            {latestUserMessage && status === 'idle' && !transcript && (
              <p className="facemex-voice-main__last-user">You said: {latestUserMessage.content}</p>
            )}
          </div>

          {!confirmation && (
            <>
              <VoiceLanguageSelector
                language={language}
                onLanguageChange={setLanguage}
                defaultLanguage={configuredLanguage}
                provider={provider}
                onProviderChange={setProvider}
                availableProviders={availableProviders}
                disabled={selectorsLocked}
              />

              <div className="facemex-voice-mode-toggle" role="group" aria-label="Conversation mode">
                <button
                  type="button"
                  className={mode === 'continuous' ? 'is-selected' : ''}
                  aria-pressed={mode === 'continuous'}
                  onClick={() => setMode('continuous')}
                >
                  Continuous
                </button>
                <button
                  type="button"
                  className={mode === 'tap' ? 'is-selected' : ''}
                  aria-pressed={mode === 'tap'}
                  onClick={() => setMode('tap')}
                >
                  Tap to speak
                </button>
              </div>
              <p className="facemex-voice-language-note">
                {selectedLanguage} · Deepgram transcription · {provider === 'elevenlabs' ? 'ElevenLabs' : 'Amazon Polly'} speech
              </p>
            </>
          )}

          {errorMessage && (
            <div className="facemex-voice-error" role="alert">
              <p>{errorMessage}</p>
              {(status === 'error' || status === 'disconnected') && (
                <button type="button" onClick={startConversation}>Try again</button>
              )}
            </div>
          )}
        </section>

        {!confirmation && (
          <aside className="facemex-voice-context">
            {latestAssistantMessage && (
              <div className="facemex-voice-context-card">
                <span className="facemex-voice-context-card__label">YOUR CONVERSATION</span>
                <p>{latestAssistantMessage.content}</p>
              </div>
            )}
            <div className="facemex-voice-suggestions" aria-label="Conversation suggestions">
              <span className="facemex-voice-suggestions__label">Try asking</span>
              {['Plan my day', 'Help me write', 'Explain a topic'].map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setDraft(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>

      <footer className="facemex-voice-screen__footer">
        {errorMessage && status === 'disconnected' && !navigator.onLine && (
          <p className="facemex-voice-network-note">Waiting for your connection…</p>
        )}
        <VoiceComposer
          value={draft}
          onChange={setDraft}
          onSubmit={handleSubmit}
          onToggleListening={toggleListening}
          status={status}
          microphoneDisabled={!voiceSettingsLoaded}
        />
        <p className="facemex-voice-footer-note">
          {status === 'speaking'
            ? 'Tap the microphone to interrupt'
            : status === 'listening'
              ? 'Tap the microphone when you are done speaking'
              : status === 'transcribing'
                ? 'Transcribing with Deepgram…'
                : status === 'processing'
                  ? 'FaceMeX is thinking…'
                  : 'Your microphone is only active during a voice session'}
        </p>
      </footer>
    </main>
  );
}
