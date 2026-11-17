import { ArrowUp, Mic, MicOff } from 'lucide-react';
import type { FormEvent } from 'react';
import type { VoiceSessionStatus } from './VoiceStatus';

type VoiceComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onToggleListening: () => void;
  status: VoiceSessionStatus;
  microphoneDisabled: boolean;
};

export default function VoiceComposer({
  value,
  onChange,
  onSubmit,
  onToggleListening,
  status,
  microphoneDisabled,
}: VoiceComposerProps) {
  const isActive = status === 'listening' || status === 'connecting';
  const isBusy = status === 'transcribing' || status === 'processing' || status === 'speaking';
  const microphoneLabel = status === 'listening'
    ? 'Finish recording'
    : status === 'speaking' || status === 'processing' || status === 'transcribing'
      ? 'Interrupt and speak'
      : isActive
        ? 'Cancel microphone setup'
        : 'Start voice conversation';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="facemex-voice-composer" onSubmit={handleSubmit}>
      <button
        className={`facemex-voice-composer__mic${isActive ? ' is-active' : ''}`}
        type="button"
        onClick={onToggleListening}
        aria-label={microphoneLabel}
        title={microphoneLabel}
        disabled={microphoneDisabled}
      >
        {isActive ? <MicOff size={19} /> : <Mic size={19} />}
      </button>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={isActive ? 'Listening… or type a message' : 'Continue your conversation'}
        aria-label="Message FaceMeX"
      />
      <button
        className="facemex-voice-composer__send"
        type="submit"
        disabled={!value.trim() || isBusy}
        aria-label="Send message"
      >
        <ArrowUp size={19} />
      </button>
    </form>
  );
}
