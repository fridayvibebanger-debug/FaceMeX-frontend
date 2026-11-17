export type VoiceSessionStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'transcribing'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'error'
  | 'disconnected';

const STATUS_LABELS: Record<VoiceSessionStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  listening: 'Listening',
  transcribing: 'Transcribing',
  processing: 'Thinking',
  speaking: 'Speaking',
  interrupted: 'Interrupted',
  error: 'Error',
  disconnected: 'Disconnected',
};

type VoiceStatusProps = {
  status: VoiceSessionStatus;
};

export default function VoiceStatus({ status }: VoiceStatusProps) {
  return (
    <div className={`facemex-voice-status facemex-voice-status--${status}`} role="status" aria-live="polite">
      <span className="facemex-voice-status__dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </div>
  );
}
