export const VOICE_LANGUAGES = [
  { code: 'en-ZA', label: 'English' },
  { code: 'af-ZA', label: 'Afrikaans' },
  { code: 'nso-ZA', label: 'Sepedi' },
  { code: 'zu-ZA', label: 'isiZulu' },
  { code: 've-ZA', label: 'Tshivenda' },
  { code: 'ts-ZA', label: 'Xitsonga' },
] as const;

export type VoiceLanguageCode = (typeof VOICE_LANGUAGES)[number]['code'];

export type VoiceTtsProvider = 'elevenlabs' | 'polly';

export function voicesForLanguage(voices: SpeechSynthesisVoice[], language: VoiceLanguageCode) {
  const languageBase = language.split('-')[0].toLowerCase();
  return voices.filter((voice) => voice.lang.split('-')[0].toLowerCase() === languageBase);
}

type SharedProps = {
  language: VoiceLanguageCode;
  onLanguageChange: (language: VoiceLanguageCode) => void;
  disabled?: boolean;
};

type ProviderProps = Omit<SharedProps, 'language' | 'onLanguageChange'> & {
  language: VoiceLanguageCode | '';
  onLanguageChange: (language: VoiceLanguageCode | '') => void;
  defaultLanguage: string;
  provider: VoiceTtsProvider;
  onProviderChange: (provider: VoiceTtsProvider) => void;
  availableProviders: Record<VoiceTtsProvider, boolean>;
};

type DeviceVoiceProps = SharedProps & {
  voiceURI: string;
  voices: SpeechSynthesisVoice[];
  onVoiceChange: (voiceURI: string) => void;
};

type VoiceLanguageSelectorProps = ProviderProps | DeviceVoiceProps;

export default function VoiceLanguageSelector(props: VoiceLanguageSelectorProps) {
  const { language, disabled = false } = props;
  const providerProps = 'availableProviders' in props ? props : null;
  const deviceVoiceProps = 'voices' in props ? props : null;
  const matchingVoices = deviceVoiceProps
    ? voicesForLanguage(deviceVoiceProps.voices, deviceVoiceProps.language)
    : [];
  const supportedVoice = deviceVoiceProps &&
    matchingVoices.some((voice) => voice.voiceURI === deviceVoiceProps.voiceURI);

  return (
    <div className="facemex-voice-selectors">
      <label className="facemex-voice-select">
        <span>Language</span>
        <select
          value={language}
          onChange={(event) => {
            if (providerProps) {
              providerProps.onLanguageChange(event.target.value as VoiceLanguageCode | '');
            } else {
              deviceVoiceProps?.onLanguageChange(event.target.value as VoiceLanguageCode);
            }
          }}
          aria-label="Voice language"
          disabled={disabled}
        >
          {providerProps && (
            <option value="">Configured default ({providerProps.defaultLanguage})</option>
          )}
          {VOICE_LANGUAGES.map((option) => (
            <option key={option.code} value={option.code}>{option.label}</option>
          ))}
        </select>
      </label>
      {providerProps ? (
        <label className="facemex-voice-select">
          <span>Provider</span>
          <select
            value={providerProps.provider}
            onChange={(event) => providerProps.onProviderChange(event.target.value as VoiceTtsProvider)}
            aria-label="Speech provider"
            disabled={disabled || (!providerProps.availableProviders.elevenlabs && !providerProps.availableProviders.polly)}
          >
            {!providerProps.availableProviders.elevenlabs && !providerProps.availableProviders.polly && (
              <option value={providerProps.provider}>No speech provider configured</option>
            )}
            {providerProps.availableProviders.elevenlabs && <option value="elevenlabs">ElevenLabs</option>}
            {providerProps.availableProviders.polly && <option value="polly">Amazon Polly</option>}
          </select>
        </label>
      ) : deviceVoiceProps ? (
        <label className="facemex-voice-select">
          <span>Voice</span>
          <select
            value={supportedVoice ? deviceVoiceProps.voiceURI : ''}
            onChange={(event) => deviceVoiceProps.onVoiceChange(event.target.value)}
            aria-label="Speech voice"
            disabled={disabled || !matchingVoices.length}
          >
            {!matchingVoices.length && <option value="">Not available on this device</option>}
            {matchingVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} · {voice.lang}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
