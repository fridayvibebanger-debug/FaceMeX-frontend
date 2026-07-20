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
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const updateViewport = () => {
      const nextHeight = window.visualViewport?.height ?? window.innerHeight;
      setViewportHeight(nextHeight);
      const keyboardOpen = (window.innerHeight - nextHeight) > 140;
      setIsKeyboardVisible(keyboardOpen);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    const target = conversationRef.current;
    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      target.scrollTo({ top: target.scrollHeight, behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, showKeyboard, isKeyboardVisible]);

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
    ? "relative flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 text-slate-900 shadow-2xl shadow-slate-900/10 lg:bg-slate-950 lg:text-white lg:border-white/10"
    : "relative overflow-hidden bg-[#FAFAFC] text-[#111827]";

  const shellStyle = isEmbedded
    ? { minHeight: "560px", height: "100%", paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }
    : { minHeight: "100dvh", height: viewportHeight ? `${viewportHeight}px` : "100dvh", paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" };

  const micButtonClassName = `relative flex h-[76px] w-[76px] items-center justify-center rounded-full transition-all duration-300 active:scale-95 ${status === "idle" ? "bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 shadow-[0_10px_35px_rgba(34,211,238,.25)]" : status === "listening" ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(34,211,238,.65)] scale-110" : status === "thinking" ? "bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 shadow-[0_0_55px_rgba(139,92,246,.55)]" : "bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(16,185,129,.55)]"}`;

  return (
    <main className={rootClassName} style={shellStyle}>
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

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {!isEmbedded && (
          <header className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 shadow-[0_6px_18px_rgba(0,0,0,.06)] backdrop-blur-xl transition active:scale-95">
              <Menu size={21} className="text-slate-800" />
            </button>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <h1 className="text-[32px] font-black tracking-[0.26em] text-slate-900 leading-none">MEXA</h1>
                <span className="text-cyan-500 text-lg">✦</span>
              </div>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500">Your AI Life Operating System</p>
            </div>

            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 shadow-[0_6px_18px_rgba(0,0,0,.06)] backdrop-blur-xl transition active:scale-95">
              <SlidersHorizontal size={20} className="text-slate-800" />
            </button>
          </header>
        )}

        <section className={isEmbedded ? "relative flex-1 min-h-0 overflow-hidden px-3 py-3" : "relative flex-1 min-h-0 overflow-hidden px-3 py-3 sm:px-4"}>
          <div className="mx-auto flex h-full max-w-2xl flex-col">
            <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-3 shadow-[0_10px_30px_rgba(15,23,42,.05)] backdrop-blur-xl">
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

            <div ref={conversationRef} className="mt-3 flex-1 min-h-0 overflow-y-auto pb-40">
              {messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-[20px] border border-slate-200/70 bg-white/75 p-3 shadow-sm backdrop-blur">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {message.role === "assistant" ? "MEXA" : "You"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{message.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-2 py-8 text-center">
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

                  <div className="mt-6 max-w-sm">
                    {transcript && <p className="mb-3 text-sm text-slate-500">{transcript}</p>}
                    <p className="text-[20px] font-semibold text-slate-700">{assistantSummary}</p>
                    <button type="button" onClick={() => setShowKeyboard((value) => !value)} className="mt-7 h-12 rounded-full border border-slate-200 bg-white/95 px-8 text-[15px] font-medium text-slate-700 shadow-[0_8px_24px_rgba(0,0,0,.08)] transition-all active:scale-95">
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
            </div>
          </div>
        </section>

        <div className={`absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 transition-all duration-300 ${showKeyboard ? "pointer-events-none translate-y-6 opacity-0 scale-95" : "translate-y-0 opacity-100 scale-100"}`} style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}>
          <button
            type="button"
            onClick={() => {
              if (status === "listening") {
                stopListening();
              } else if (status === "speaking") {
                stopSpeech();
              } else {
                startListening();
              }
            }}
            className={micButtonClassName}
          >
            <div className={`absolute inset-0 rounded-full transition-all duration-300 ${status === "listening" ? "animate-ping bg-cyan-300/30" : status === "speaking" ? "animate-pulse bg-emerald-300/20" : ""}`} />
            <Mic size={30} strokeWidth={2.3} className={`relative z-10 text-white transition-all duration-300 ${status === "listening" ? "animate-pulse" : status === "thinking" ? "animate-bounce" : ""}`} />
          </button>
        </div>

        <div className={`absolute inset-x-0 bottom-0 z-20 px-3 transition-all duration-300 ${showKeyboard ? "pointer-events-none translate-y-8 opacity-0" : "translate-y-0 opacity-100"}`} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}>
          <nav className="mx-auto flex max-w-md items-center justify-around rounded-[24px] border border-slate-200/70 bg-white/90 px-2 py-2 shadow-[0_12px_40px_rgba(15,23,42,.10)] backdrop-blur-3xl">
            <button type="button" className="flex flex-col items-center gap-1 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10"><Sparkles size={17} className="text-cyan-600" /></div>
              <span className="text-[10px] font-semibold text-cyan-600">Assistant</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-1 px-3 py-2">
              <Briefcase size={18} className="text-slate-500" />
              <span className="text-[10px] text-slate-500">Career</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-1 px-3 py-2">
              <GraduationCap size={18} className="text-slate-500" />
              <span className="text-[10px] text-slate-500">Study</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-1 px-3 py-2">
              <Building2 size={18} className="text-slate-500" />
              <span className="text-[10px] text-slate-500">Business</span>
            </button>
          </nav>
        </div>

        <div className={`absolute inset-x-0 bottom-0 z-40 px-3 transition-all duration-300 ${showKeyboard ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"}`} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}>
          <div className="mx-auto flex max-w-md items-center rounded-full border border-black/5 bg-white/95 px-3 py-3 shadow-[0_18px_45px_rgba(15,23,42,.16)] backdrop-blur-3xl">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Message MEXA..."
              className="flex-1 bg-transparent text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button type="button" onClick={handleSubmit} disabled={isBusy || !draft.trim()} className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60">
              <ArrowUp size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

