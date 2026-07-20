import { useState } from "react";
import {
  Menu,
  SlidersHorizontal,
  ArrowUp,
  Mic,
  Sparkles,
  Briefcase,
  GraduationCap,
  Building2,
} from "lucide-react";

type AssistantStatus = "idle" | "listening" | "thinking" | "speaking";

type MEXAProps = {
  embedded?: boolean;
};

export default function MEXA({ embedded = false }: MEXAProps) {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [draft, setDraft] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  const [isBusy, setIsBusy] = useState(false);

  const stopListening = () => {
    recognition?.stop();
    setStatus("idle");
  };

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    setIsBusy(true);
    setStatus("thinking");
    setTranscript(trimmed);
    setDraft("");
    setReply("");

    try {
      const endpoint = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/mexa`
        : "/api/mexa";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json().catch(() => ({}));
      const aiReply = String(data.reply || "I’m ready to help.");
      setReply(aiReply);
      setStatus("speaking");

      const utterance = new SpeechSynthesisUtterance(aiReply);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setStatus("idle");
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error(error);
      setReply("I hit a temporary issue, but I’m here and ready to help.");
      setStatus("idle");
    } finally {
      setIsBusy(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }

    const recog = new SpeechRecognition();
    let finalTranscript = "";

    recog.lang = "en-US";
    recog.continuous = false;
    recog.interimResults = true;

    recog.onstart = () => {
      setStatus("listening");
      setTranscript("");
    };

    recog.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += chunk;
        } else {
          interim += chunk;
        }
      }
      setTranscript(finalTranscript || interim);
    };

    recog.onerror = (event: any) => {
      console.error(event);
      setStatus("idle");
    };

    recog.onend = () => {
      if (!finalTranscript.trim()) {
        setStatus("idle");
        return;
      }
      void submitMessage(finalTranscript);
    };

    setRecognition(recog);
    recog.start();
  };

  const statusLabel =
    status === "listening"
      ? "Listening for your command…"
      : status === "thinking"
        ? "Thinking through your request…"
        : status === "speaking"
          ? "Speaking your response…"
          : "Ready whenever you are";

  const shellClassName = embedded
    ? "flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,.10)] lg:border-white/10 lg:bg-slate-950 lg:text-white"
    : "flex h-dvh min-h-0 flex-col overflow-hidden bg-[#FAFAFC] text-[#111827]";

  return (
    <main className={shellClassName}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#FAFAFC]" />
        <div className="absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-cyan-300/12 blur-[180px]" />
        <div className="absolute left-1/2 bottom-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-blue-200/10 blur-[220px]" />
        <div className="absolute left-1/2 top-[35%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/70 blur-[120px]" />
        <div className="absolute left-[-180px] top-[35%] h-[300px] w-[300px] rounded-full bg-cyan-200/8 blur-[140px]" />
        <div className="absolute right-[-180px] top-[30%] h-[320px] w-[320px] rounded-full bg-sky-200/8 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,#000 1px,transparent 0)", backgroundSize: "26px 26px" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/80" />
      </div>

      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between px-4 sm:px-5">
        <button className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 shadow-[0_6px_18px_rgba(0,0,0,.06)] backdrop-blur-xl transition active:scale-95">
          <Menu size={21} className="text-slate-800" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-black tracking-[0.24em] text-slate-900 leading-none sm:text-[32px]">MEXA</h1>
            <span className="text-lg text-cyan-500">✦</span>
          </div>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500">Your AI Life Operating System</p>
        </div>

        <button className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 shadow-[0_6px_18px_rgba(0,0,0,.06)] backdrop-blur-xl transition active:scale-95">
          <SlidersHorizontal size={20} className="text-slate-800" />
        </button>
      </header>

      <section className="relative z-10 flex-1 overflow-hidden px-4 pb-4 sm:px-6">
        <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-2 text-center">
          <div className="relative flex h-[170px] w-[170px] items-center justify-center sm:h-[190px] sm:w-[190px]">
            <div className="absolute h-[360px] w-[360px] rounded-full bg-cyan-400/8 blur-[140px]" style={{ animation: "floatGlow 14s ease-in-out infinite" }} />
            <div className="absolute h-[320px] w-[320px] rounded-full bg-sky-400/7 blur-[150px]" style={{ animation: "floatGlow 18s ease-in-out infinite reverse" }} />
            <div className="absolute h-[280px] w-[280px] rounded-full bg-violet-500/6 blur-[160px]" style={{ animation: "floatGlow 20s ease-in-out infinite" }} />
            <div className="absolute h-[220px] w-[220px] rounded-full bg-cyan-300/8 blur-[95px]" style={{ animation: "floatGlow 10s ease-in-out infinite" }} />
            <div className="relative flex items-center justify-center">
              <div className="absolute h-[172px] w-[172px] rounded-[42%] border border-cyan-300/10 animate-[spin_28s_linear_infinite]" />
              <div className="absolute h-[162px] w-[162px] rounded-[48%] border border-cyan-300/6 animate-[spin_20s_linear_infinite_reverse]" />
              <div className="absolute h-[152px] w-[152px] rounded-[38%] border border-cyan-300/5 animate-[spin_36s_linear_infinite]" />
              <div className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-gradient-to-br from-[#081C38] via-[#0B2247] to-[#071322] shadow-[0_30px_70px_rgba(0,0,0,.22)]">
                <div className="absolute h-20 w-20 rounded-full bg-cyan-300/15 blur-3xl" />
                <span className="text-[54px] text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,.6)]">✦</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-[6px]">
            {[18, 26, 34, 42, 50, 42, 34, 26, 18].map((height, index) => (
              <span key={index} className="rounded-full bg-gradient-to-t from-cyan-500 via-cyan-300 to-white shadow-[0_0_12px_rgba(34,211,238,.45)]" style={{ width: "4px", height: `${height}px`, animation: `voiceWave 1.8s ease-in-out ${index * 0.12}s infinite` }} />
            ))}
          </div>

          <div className="mt-5 max-w-md">
            {transcript && <p className="mb-3 text-sm text-slate-500">{transcript}</p>}
            <p className="text-[18px] font-semibold text-slate-700 sm:text-[20px]">{reply || statusLabel}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => setShowKeyboard((value) => !value)} className="h-12 rounded-full border border-slate-200 bg-white/95 px-6 text-[15px] font-medium text-slate-700 shadow-[0_8px_24px_rgba(0,0,0,.08)] transition-all active:scale-95">
                {showKeyboard ? "Hide keyboard" : "⌨ Type instead"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-20 border-t border-slate-200/70 bg-white/80 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {showKeyboard ? (
            <div className="flex items-center rounded-full border border-black/5 bg-white/95 px-3 py-3 shadow-[0_10px_30px_rgba(15,23,42,.10)]">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitMessage(draft);
                  }
                }}
                placeholder="Message MEXA..."
                className="flex-1 bg-transparent text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button onClick={() => void submitMessage(draft)} disabled={isBusy || !draft.trim()} className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60">
                <ArrowUp size={18} className="text-white" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-around rounded-[24px] border border-slate-200 bg-white/95 px-2 py-2 shadow-[0_8px_30px_rgba(15,23,42,.08)]">
              <button className="flex flex-col items-center gap-1 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10"><Sparkles size={17} className="text-cyan-600" /></div>
                <span className="text-[10px] font-semibold text-cyan-600">Assistant</span>
              </button>
              <button className="flex flex-col items-center gap-1 px-3 py-2">
                <Briefcase size={18} className="text-slate-500" />
                <span className="text-[10px] text-slate-500">Career</span>
              </button>
              <button className="flex flex-col items-center gap-1 px-3 py-2">
                <GraduationCap size={18} className="text-slate-500" />
                <span className="text-[10px] text-slate-500">Study</span>
              </button>
              <button className="flex flex-col items-center gap-1 px-3 py-2">
                <Building2 size={18} className="text-slate-500" />
                <span className="text-[10px] text-slate-500">Business</span>
              </button>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={() => {
                if (status === "listening") {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-full transition-all duration-500 active:scale-95 sm:h-[76px] sm:w-[76px] ${status === "idle" ? "bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 shadow-[0_10px_35px_rgba(34,211,238,.25)]" : status === "listening" ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(34,211,238,.65)] scale-110" : status === "thinking" ? "bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 shadow-[0_0_55px_rgba(139,92,246,.55)]" : "bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(16,185,129,.55)]"}`}
            >
              <div className={`absolute inset-0 rounded-full transition-all duration-500 ${status === "listening" ? "animate-ping bg-cyan-300/30" : status === "speaking" ? "animate-pulse bg-emerald-300/20" : ""}`} />
              <Mic size={28} strokeWidth={2.3} className={`relative z-10 text-white transition-all duration-300 sm:h-[30px] sm:w-[30px] ${status === "listening" ? "animate-pulse" : status === "thinking" ? "animate-bounce" : ""}`} />
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

