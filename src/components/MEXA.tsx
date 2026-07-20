import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, SlidersHorizontal, ArrowUp, Mic, Sparkles, Briefcase, GraduationCap, Building2 } from "lucide-react";

type AssistantStatus = "idle" | "listening" | "thinking" | "speaking";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type MEXAProps = {
  embedded?: boolean;
};

export default function MEXA({ embedded = false }: MEXAProps) {
  const navigate = useNavigate();
  const isEmbedded = embedded;

  const [showKeyboard, setShowKeyboard] = useState(false);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("mexa_messages");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch {
        window.localStorage.removeItem("mexa_messages");
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length) {
      window.localStorage.setItem("mexa_messages", JSON.stringify(messages));
    }
  }, [messages]);

  const assistantSummary = useMemo(() => {
    const latest = messages[messages.length - 1];
    if (latest?.role === "assistant") {
      return latest.content;
    }
    return reply || "Ready whenever you are";
  }, [messages, reply]);

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setStatus("idle");
  };

  const handleRoute = (targetRoute?: string) => {
    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  const pushMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const sendToAssistant = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    setIsBusy(true);
    setStatus("thinking");
    setTranscript(trimmed);
    setDraft("");
    setReply("");

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    pushMessage(userMessage);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/mexa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-6),
        }),
      });

      const data = await response.json().catch(() => ({}));
      const assistantReply = String(data.reply || "I’m ready to help.");

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: assistantReply,
        createdAt: new Date().toISOString(),
      };

      pushMessage(assistantMessage);
      setReply(assistantReply);

      if (data.route) {
        handleRoute(data.route);
      }

      setStatus("speaking");
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(assistantReply);
        utterance.lang = "en-US";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = () => setStatus("idle");
        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } else {
        setStatus("idle");
      }
    } catch (error) {
      console.error(error);
      const fallback: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: "I hit a temporary issue, but I’m here and ready to help.",
        createdAt: new Date().toISOString(),
      };
      pushMessage(fallback);
      setReply(fallback.content);
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
          finalTranscript = `${finalTranscript}${chunk}`;
        } else {
          interim = `${interim}${chunk}`;
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
      void sendToAssistant(finalTranscript);
    };

    setRecognition(recog);
    recog.start();
  };

  const stopListening = () => {
    recognition?.stop();
    setStatus("idle");
  };

  const handleSubmit = () => {
    if (!draft.trim()) return;
    void sendToAssistant(draft);
  };

  const rootClassName = isEmbedded
    ? "relative flex h-[560px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-4 text-slate-900 shadow-2xl shadow-slate-900/10 lg:bg-slate-950 lg:text-white lg:border-white/10"
    : "relative h-screen overflow-hidden bg-[#FAFAFC] text-[#111827]";

  return (
    <main className={rootClassName}>
      {!isEmbedded && (
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
      )}

      <div className={isEmbedded ? "relative flex h-full flex-col" : "relative z-10 flex h-full flex-col"}>
        {!isEmbedded && (
          <header className="flex items-center justify-between px-1 pt-1">
            <button className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 shadow-[0_6px_18px_rgba(0,0,0,.06)] backdrop-blur-xl transition active:scale-95">
              <Menu size={21} className="text-slate-800" />
            </button>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <h1 className="text-[32px] font-black tracking-[0.26em] text-slate-900 leading-none">MEXA</h1>
                <span className="text-cyan-500 text-lg">✦</span>
              </div>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500">Your AI Life Operating System</p>
            </div>

            <button className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 shadow-[0_6px_18px_rgba(0,0,0,.06)] backdrop-blur-xl transition active:scale-95">
              <SlidersHorizontal size={20} className="text-slate-800" />
            </button>
          </header>
        )}

        <section className={isEmbedded ? "flex-1 overflow-y-auto px-1 py-2" : "flex-1 overflow-y-auto px-2 py-4 sm:px-4"}>
          {isEmbedded ? (
            <div className="flex h-full flex-col gap-3">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">MEXA assistant</p>
                    <p className="text-xs text-slate-500 lg:text-slate-400">Career, study, and business help</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 lg:text-slate-300">{assistantSummary}</p>
              </div>

              {messages.length > 0 && (
                <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm">
                  {messages.slice(-4).map((message) => (
                    <div key={message.id} className="mb-2 last:mb-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {message.role === "assistant" ? "MEXA" : "You"}
                      </p>
                      <p className="text-sm text-slate-600">{message.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center pb-24 pt-6">
              <div className="relative mt-2 flex h-[190px] w-[190px] items-center justify-center">
                <div className="absolute h-[390px] w-[390px] rounded-full bg-cyan-400/8 blur-[145px]" style={{ animation: "floatGlow 14s ease-in-out infinite" }} />
                <div className="absolute h-[340px] w-[340px] rounded-full bg-sky-400/7 blur-[155px]" style={{ animation: "floatGlow 18s ease-in-out infinite reverse" }} />
                <div className="absolute h-[300px] w-[300px] rounded-full bg-violet-500/6 blur-[165px]" style={{ animation: "floatGlow 20s ease-in-out infinite" }} />
                <div className="absolute h-[230px] w-[230px] rounded-full bg-cyan-300/8 blur-[100px]" style={{ animation: "floatGlow 10s ease-in-out infinite" }} />
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-[182px] w-[182px] rounded-[42%] border border-cyan-300/10 animate-[spin_28s_linear_infinite]" />
                  <div className="absolute h-[172px] w-[172px] rounded-[48%] border border-cyan-300/6 animate-[spin_20s_linear_infinite_reverse]" />
                  <div className="absolute h-[162px] w-[162px] rounded-[38%] border border-cyan-300/5 animate-[spin_36s_linear_infinite]" />
                  <div className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-gradient-to-br from-[#081C38] via-[#0B2247] to-[#071322] shadow-[0_30px_70px_rgba(0,0,0,.22)]">
                    <div className="absolute h-20 w-20 rounded-full bg-cyan-300/15 blur-3xl" />
                    <span className="text-[54px] text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,.6)]">✦</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-[6px]">
                {[18, 26, 34, 42, 50, 42, 34, 26, 18].map((height, index) => (
                  <span key={index} className="rounded-full bg-gradient-to-t from-cyan-500 via-cyan-300 to-white shadow-[0_0_12px_rgba(34,211,238,.45)]" style={{ width: "4px", height: `${height}px`, animation: `voiceWave 1.8s ease-in-out ${index * 0.12}s infinite` }} />
                ))}
              </div>

              <div className="mt-7 max-w-sm text-center">
                {transcript && <p className="mb-3 text-sm text-slate-500">{transcript}</p>}
                <p className="text-[20px] font-semibold text-slate-700">{assistantSummary}</p>
                {messages.length > 0 && (
                  <div className="mt-5 max-h-44 w-full overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-3 text-left shadow-sm">
                    {messages.slice(-3).map((message) => (
                      <div key={message.id} className="mb-2 last:mb-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{message.role === "assistant" ? "MEXA" : "You"}</p>
                        <p className="text-sm text-slate-600">{message.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setShowKeyboard((value) => !value)} className="mt-7 h-12 rounded-full border border-slate-200 bg-white/95 px-8 text-[15px] font-medium text-slate-700 shadow-[0_8px_24px_rgba(0,0,0,.08)] transition-all active:scale-95">
                  {showKeyboard ? "Hide keyboard" : "⌨ Type instead"}
                </button>

                {status !== "idle" && (
                  <p className="mt-3 text-sm font-medium text-cyan-600">
                    {status === "listening" ? "Listening for your command…" : status === "thinking" ? "Thinking through your request…" : "Speaking your response…"}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {showKeyboard && (
          <div className="mt-3">
            <div className="mx-auto flex max-w-md items-center rounded-full border border-black/5 bg-white/95 px-5 py-3 shadow-[0_10px_35px_rgba(15,23,42,.10)] backdrop-blur-3xl">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleSubmit(); } }} placeholder="Message MEXA..." className="flex-1 bg-transparent text-[15px] text-slate-800 outline-none placeholder:text-slate-400" />
              <button onClick={handleSubmit} disabled={isBusy || !draft.trim()} className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60">
                <ArrowUp size={18} className="text-white" />
              </button>
            </div>
          </div>
        )}

        {!showKeyboard && (
          <div className={isEmbedded ? "mt-3 flex justify-center" : "mt-3 flex justify-center pb-3"}>
            <button onClick={() => { if (status === "listening") { stopListening(); } else if (status === "speaking") { stopSpeech(); } else { startListening(); } }} className={`relative flex h-[76px] w-[76px] items-center justify-center rounded-full transition-all duration-500 active:scale-95 ${status === "idle" ? "bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 shadow-[0_10px_35px_rgba(34,211,238,.25)]" : status === "listening" ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(34,211,238,.65)] scale-110" : status === "thinking" ? "bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 shadow-[0_0_55px_rgba(139,92,246,.55)]" : "bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(16,185,129,.55)]"}`}>
              <div className={`absolute inset-0 rounded-full transition-all duration-500 ${status === "listening" ? "animate-ping bg-cyan-300/30" : status === "speaking" ? "animate-pulse bg-emerald-300/20" : ""}`} />
              <Mic size={30} strokeWidth={2.3} className={`relative z-10 text-white transition-all duration-300 ${status === "listening" ? "animate-pulse" : status === "thinking" ? "animate-bounce" : ""}`} />
            </button>
          </div>
        )}

        {!isEmbedded && (
          <nav className="mt-auto border-t border-slate-200/70 bg-white/70 px-3 py-3 backdrop-blur-3xl">
            <div className="mx-auto flex max-w-md items-center justify-around rounded-[22px] border border-slate-200 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,.08)]">
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
          </nav>
        )}
      </div>
    </main>
  );
}
