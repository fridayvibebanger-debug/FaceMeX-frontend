import { useMemo, useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface VoiceCommandPanelProps {
  departmentTitle: string;
}

export function VoiceCommandPanel({ departmentTitle }: VoiceCommandPanelProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [route, setRoute] = useState('Tap the mic to speak a command.');

  const sampleCommands = useMemo(
    () => [
      'MEXA, prepare payroll.',
      'MEXA, send the supplier summary.',
      'MEXA, create invoices.',
      'MEXA, schedule interviews.',
      'MEXA, review this contract.',
      'MEXA, plan tomorrow deliveries.',
    ],
    []
  );

  const handleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRoute('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-ZA';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      setTranscript('Listening…');
    };

    recognition.onresult = (event: any) => {
      const message = Array.from(event.results)
        .map((result: any) => result[0]?.transcript)
        .join(' ')
        .trim();
      setTranscript(message);

      const lower = message.toLowerCase();
      if (lower.includes('payroll')) {
        setRoute(`Route to the Finance co-worker for payroll work in ${departmentTitle}.`);
      } else if (lower.includes('invoice') || lower.includes('supplier')) {
        setRoute(`Route to the Finance co-worker for invoice and supplier management.`);
      } else if (lower.includes('interview')) {
        setRoute(`Route to the HR co-worker for interview scheduling.`);
      } else if (lower.includes('contract')) {
        setRoute(`Route to the Legal co-worker for contract review.`);
      } else if (lower.includes('delivery') || lower.includes('deliverys')) {
        setRoute(`Route to the Logistics co-worker for delivery planning.`);
      } else {
        setRoute(`Intent captured. ${departmentTitle} will route this to the nearest specialist.`);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setRoute('Voice capture stopped. Try again.');
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  return (
    <div className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-sky-600 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">Voice Command Mode</div>
          <div className="text-sm text-slate-600">Hands-free operations for {departmentTitle}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Transcript</div>
        <div className="mt-2 text-sm text-slate-700">{transcript || 'No voice input yet.'}</div>
      </div>

      <div className="mt-4 rounded-[20px] border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
        {route}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sampleCommands.map((command) => (
          <span key={command} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            {command}
          </span>
        ))}
      </div>

      <button
        onClick={handleVoice}
        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition ${listening ? 'bg-emerald-600' : 'bg-slate-900'}`}
      >
        <Mic className="h-4 w-4" />
        {listening ? 'Listening…' : 'Start Voice Command'}
      </button>
    </div>
  );
}
