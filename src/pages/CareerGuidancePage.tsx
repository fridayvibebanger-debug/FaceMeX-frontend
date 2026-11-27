import { useEffect, useRef, useState } from 'react';
import { BookOpen, Compass, GraduationCap, Loader2, Target } from 'lucide-react';
import { requestWorkspaceFeatureAI, type WorkspaceFeatureMessage } from '@/lib/workspaceFeatureAI';
import FeatureWorkspaceShell from '@/components/workspace-ai/FeatureWorkspaceShell';
import UniversalComposer from '@/components/workspace-ai/UniversalComposer';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const CAREER_GUIDANCE_INSTRUCTION = `You are FaceMeX Career Guidance, a practical and supportive career-development assistant.
Help the user explore career paths based on their interests, qualifications, current skills, goals and challenges. Explain typical skills, possible learning pathways, entry-level expectations, skill gaps, practical activities, development opportunities and realistic next steps when relevant.
Ask one focused question if important personal context is missing. Use earlier conversation details for follow-ups. Do not turn this into a job-listings search.
Do not guarantee employment, salary, admission or qualifications. Do not invent institutions, accredited courses, entry requirements or official opportunities. Clearly distinguish general guidance from requirements the user should verify with an official provider. Keep advice understandable and actionable.`;

const STARTER_PROMPTS = [
  {
    label: 'Explore career paths',
    prompt: 'Help me explore career paths that match my interests. Ask me about my interests and background if needed.',
    Icon: Compass,
  },
  {
    label: 'Find my skills gaps',
    prompt: 'Help me identify the skills I need to build for my career goal and suggest practical ways to develop them.',
    Icon: Target,
  },
  {
    label: 'Plan my next steps',
    prompt: 'Help me create a realistic career-development plan with learning activities and clear next steps.',
    Icon: BookOpen,
  },
];

export default function CareerGuidancePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [busy, messages.length]);

  const sendMessage = async (messageText: string) => {
    const text = messageText.trim();
    if (!text || busy) return;

    setBusy(true);
    setError('');
    try {
      const history: WorkspaceFeatureMessage[] = [
        { role: 'system', content: CAREER_GUIDANCE_INSTRUCTION },
        ...messages.slice(-12).map(({ role, content }) => ({ role, content })),
        { role: 'user', content: text },
      ];
      const answer = await requestWorkspaceFeatureAI({
        feature: 'career_guidance',
        messages: history,
        task: 'workspace_assistant',
      });
      setMessages((current) => [
        ...current,
        { role: 'user', content: text },
        { role: 'assistant', content: answer },
      ]);
      setPrompt('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Career guidance is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FeatureWorkspaceShell title="Career Guidance" desktopLabel="Personal career development" icon={<Compass className="h-4 w-4" />}>
      <section className="mx-auto flex h-full w-full max-w-4xl flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6" aria-label="Career guidance conversation">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-4 pt-5 sm:px-3 sm:pt-7" aria-live="polite">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-[44vh] max-w-2xl flex-col justify-center px-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.07] text-white/85">
                <GraduationCap className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Build a career path that fits you.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                Share your interests, qualifications, skills, goals or challenges. Get practical guidance without job listings or unrealistic promises.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {STARTER_PROMPTS.map(({ label, prompt: starter, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => void sendMessage(starter)}
                    disabled={busy}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-left text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <article className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[82%] ${
                  message.role === 'user'
                    ? 'bg-[#292929] text-white'
                    : 'border border-white/[0.07] bg-[#171717] text-white/80'
                }`}>
                  {message.content}
                </article>
              </div>
            ))
          )}
          {busy && (
            <p className="flex items-center gap-2 text-sm text-white/45" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Preparing career guidance…
            </p>
          )}
          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">{error}</p>}
          <div ref={messageEndRef} />
        </div>

        <footer className="shrink-0 border-t border-white/[0.06] bg-[#0d0d0d]/95 px-1 pb-1 pt-3 sm:px-3">
          <UniversalComposer
            className="mx-auto w-full max-w-[840px]"
            value={prompt}
            onChange={setPrompt}
            onSend={() => void sendMessage(prompt)}
            busy={busy}
            tone="dark"
            placeholder="Ask about your career…"
            mobileViewportAware
          />
        </footer>
      </section>
    </FeatureWorkspaceShell>
  );
}
