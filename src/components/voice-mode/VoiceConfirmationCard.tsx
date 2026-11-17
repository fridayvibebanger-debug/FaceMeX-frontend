import { Check, X } from 'lucide-react';

export type VoiceActionConfirmation = {
  id: string;
  application: string;
  title: string;
  details: string;
  preview?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type VoiceConfirmationCardProps = {
  action: VoiceActionConfirmation;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function VoiceConfirmationCard({
  action,
  onConfirm,
  onCancel,
}: VoiceConfirmationCardProps) {
  return (
    <section className="facemex-voice-confirm" aria-labelledby="facemex-voice-confirm-title">
      <div className="facemex-voice-confirm__app">
        <span className="facemex-voice-confirm__app-icon" aria-hidden="true">
          {action.application.slice(0, 1).toUpperCase()}
        </span>
        <span>{action.application}</span>
      </div>
      <h2 id="facemex-voice-confirm-title">{action.title}</h2>
      <p className="facemex-voice-confirm__details">{action.details}</p>
      {action.preview && <pre className="facemex-voice-confirm__preview">{action.preview}</pre>}
      <div className="facemex-voice-confirm__actions">
        <button type="button" className="facemex-voice-confirm__cancel" onClick={onCancel}>
          <X size={15} />
          {action.cancelLabel || 'Cancel'}
        </button>
        <button type="button" className="facemex-voice-confirm__approve" onClick={onConfirm}>
          <Check size={15} />
          {action.confirmLabel || 'Confirm'}
        </button>
      </div>
      <p className="facemex-voice-confirm__notice">
        Your approval is required; connected services are needed to carry this out.
      </p>
    </section>
  );
}
