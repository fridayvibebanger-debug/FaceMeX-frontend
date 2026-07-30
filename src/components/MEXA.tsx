import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUp, Mic, Briefcase, GraduationCap, Building2, Sparkles } from "lucide-react";

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
  const [activeModule, setActiveModule] = useState<string | null>(null);
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
    : "relative overflow-hidden bg-[linear-gradient(180deg,#f7f5ef_0%,#f0eee8_100%)] text-[#111827]";

  const shellStyle = isEmbedded
    ? { minHeight: "560px", height: "100%", paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" }
    : { minHeight: "100dvh", height: viewportHeight ? `${viewportHeight}px` : "100dvh", paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)" };

  const micButtonClassName = `relative flex h-[76px] w-[76px] items-center justify-center rounded-full transition-all duration-300 active:scale-95 ${status === "idle" ? "bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 shadow-[0_10px_35px_rgba(34,211,238,.25)]" : status === "listening" ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(34,211,238,.65)] scale-110" : status === "thinking" ? "bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 shadow-[0_0_55px_rgba(139,92,246,.55)]" : "bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(16,185,129,.55)]"}`;

  const statusLabel =
    status === "idle"
      ? "Sleeping"
      : status === "listening"
      ? "Listening..."
      : status === "thinking"
      ? "Thinking..."
      : "Speaking...";

  const statusAccent =
    status === "idle"
      ? "text-slate-700 bg-slate-100"
      : status === "listening"
      ? "text-cyan-700 bg-cyan-100"
      : status === "thinking"
      ? "text-slate-700 bg-slate-100"
      : "text-indigo-700 bg-indigo-100";

  const commandPlaceholder =
    status === "idle"
      ? "Say 'Hey MEXA' or tap the mic"
      : status === "listening"
      ? "Listening…"
      : status === "thinking"
      ? "Thinking…"
      : "Speaking…";

  const moduleConfigs = [
    {
      label: "Assistant",
      prompt: "How can I help today?",
      suggestions: ["Plan my day", "Explain this document", "Help me make money", "Read my emails"],
      buttonClassName: "border-white/10 bg-white/5",
    },
    {
      label: "Career",
      prompt: "What career goal would you like help with?",
      suggestions: ["Find jobs", "Improve CV", "Prepare interview", "Write cover letter"],
      buttonClassName: "border-white/10 bg-white/5",
    },
    {
      label: "Study",
      prompt: "What would you like to learn?",
      suggestions: ["Teach Python", "Explain Calculus", "Quiz me", "Create study notes"],
      buttonClassName: "border-white/10 bg-white/5",
    },
    {
      label: "Business",
      prompt: "What would you like your business to accomplish today?",
      suggestions: ["Create invoices", "Reply to customers", "Schedule meetings", "Prepare payroll"],
      buttonClassName: "border-white/10 bg-white/5",
    },
    {
      label: "Workspace",
      prompt: "What would you like to work on?",
      suggestions: ["Write proposal", "Organize tasks", "Draft presentation", "Summarize meeting"],
      buttonClassName: "border-white/10 bg-white/5",
    },
    {
      label: "Video lessons",
      prompt: "What would you like to learn from video?",
      suggestions: ["Explain YouTube lesson", "Create notes", "Generate quiz", "Summarize video"],
      buttonClassName: "border-white/10 bg-white/5",
    },
  ] as const;

  const workspaceTools = [
    "Draft message",
    "Summarize file",
    "Create checklist",
    "Plan project",
    "Write email",
    "Prepare brief",
  ];

  const activeModuleConfig = moduleConfigs.find((item) => item.label === activeModule) ?? null;

  const handleModuleClick = (label: string) => {
    if (label === "Business") {
      navigate("/enterprise");
      return;
    }

    if (label === "Workspace") {
      navigate("/ai/job-assistant");
      return;
    }

    setActiveModule(label);
  };

  const hasConversation = messages.length > 0;

  return (
      <>
        <div className="lg:hidden">
          <main className="relative h-screen overflow-hidden bg-[linear-gradient(180deg,#f7f5ef_0%,#f0eee8_100%)] text-[#111827]">

          {/* ================= Premium Background ================= */}

          <div className="absolute inset-0 overflow-hidden">

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(251,251,249,0.92)_0%,rgba(240,238,232,0.92)_100%)]" />

            <div className="absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-stone-300/25 blur-[180px]" />

            <div className="absolute left-1/2 bottom-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-slate-300/20 blur-[220px]" />

            <div className="absolute left-1/2 top-[35%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/60 blur-[120px]" />

            <div className="absolute left-[-180px] top-[35%] h-[300px] w-[300px] rounded-full bg-stone-200/30 blur-[140px]" />

            <div className="absolute right-[-180px] top-[30%] h-[320px] w-[320px] rounded-full bg-slate-200/25 blur-[140px]" />

            <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/70" />

          </div>
              {/* ================= HEADER ================= */}

              <header className="absolute top-0 left-0 right-0 z-50">
              
                <div className="mx-auto flex h-[76px] max-w-md items-center justify-center px-5">
                  <div className="flex flex-col items-center">
              
                    <div className="flex items-center gap-2">
              
                      <h1
                        className="
                          text-[32px]
                          font-black
                          tracking-[0.26em]
                          text-slate-900
                          leading-none
                        "
                      >
                        MEXA
                      </h1>
              
                      <span className="text-cyan-500 text-lg">
                        ✦
                      </span>
              
                    </div>
              
                    <p
                      className="
                        mt-1
                        text-[11px]
                        font-medium
                        tracking-wide
                        text-slate-500
                      "
                    >
                      Your AI Life Operating System
                    </p>
              
                  </div>
              
                </div>
              
              </header>
          
              {/* ================= CENTER ================= */}

              <section
                className="
                  absolute
                  inset-x-0
                  top-[72px]
                  bottom-[118px]
                  overflow-y-auto
                  overflow-x-hidden
                  px-6
                  scrollbar-hide
                "
              >
                <div className="flex flex-col items-center pt-6 pb-40">
            
                  {/* AI Orb */}
            
                  <div className="relative mt-2 flex h-[190px] w-[190px] items-center justify-center">
            
                    {/* Premium Ambient Glow */}
            
                    <div
                      className="absolute h-[390px] w-[390px] rounded-full bg-cyan-400/6 blur-[150px]"
                      style={{ animation: "floatGlow 14s ease-in-out infinite" }}
                    />
            
                    <div
                      className="absolute h-[340px] w-[340px] rounded-full bg-sky-400/5 blur-[160px]"
                      style={{ animation: "floatGlow 18s ease-in-out infinite reverse" }}
                    />
            
                    <div
                      className="absolute h-[300px] w-[300px] rounded-full bg-violet-500/4 blur-[170px]"
                      style={{ animation: "floatGlow 20s ease-in-out infinite" }}
                    />
            
                    <div
                      className="absolute h-[230px] w-[230px] rounded-full bg-cyan-300/5 blur-[110px]"
                      style={{ animation: "floatGlow 10s ease-in-out infinite" }}
                    />
            
                    {/* Floating Orb */}
            
                    <div className="relative flex items-center justify-center">
            
                      {/* Orbit Rings */}
            
                      <div className="absolute h-[192px] w-[192px] rounded-[43%] border border-white/10 animate-[spin_34s_linear_infinite]" />
            
                      <div className="absolute h-[176px] w-[176px] rounded-[47%] border border-cyan-300/20 animate-[spin_22s_linear_infinite_reverse]" />
            
                      <div className="absolute h-[160px] w-[160px] rounded-[41%] border border-stone-300/20 animate-[spin_38s_linear_infinite]" />
            
                      {/* Core */}
            
                      <div className="relative flex h-[108px] w-[108px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#0b1a33_0%,#0a223f_55%,#071322_100%)] shadow-[0_30px_70px_rgba(0,0,0,.22)] ring-1 ring-white/5">
            
                        <div className="absolute h-20 w-20 rounded-full bg-cyan-300/10 blur-3xl" />
            
                        <span className="text-[54px] text-cyan-200/90 drop-shadow-[0_0_20px_rgba(34,211,238,.4)]">
                          ✦
                        </span>
            
                      </div>
            
                    </div>
            
                  </div>
            
                  {/* Voice Indicator */}
            
                  <div className="mt-10 flex items-center gap-[6px]">
                    {[18,26,34,42,50,42,34,26,18].map((h,i)=>(
                      <span
                        key={i}
                        className="rounded-full bg-gradient-to-t from-cyan-500 via-cyan-300 to-white shadow-[0_0_12px_rgba(34,211,238,.45)]"
                        style={{
                          width:"4px",
                          height:`${h}px`,
                          animation:`voiceWave 1.8s ease-in-out ${i*0.12}s infinite`
                        }}
                      />
                    ))}
                  </div>
            
                  {/* Status */}
            
                  <div className="mt-7 max-w-sm text-center">

                  {transcript && (
                    <p className="mb-3 text-sm text-slate-500">
                      {transcript}
                    </p>
                  )}
                
                  <p className="text-[20px] font-semibold text-slate-700">
                    {reply || "Ready whenever you are"}
                  </p>
                
                  <button
                    onClick={() => setShowKeyboard(!showKeyboard)}
                    className="
                      mt-7
                      h-12
                      rounded-full
                      border
                      border-slate-200
                      bg-white/95
                      px-8
                      text-[15px]
                      font-medium
                      text-slate-700
                      shadow-[0_8px_24px_rgba(0,0,0,.08)]
                      transition-all
                      active:scale-95
                    "
                  >
                    ⌨ Type instead
                  </button>
                
                </div>   {/* ← THIS IS MISSING */}
                
                </div>   {/* closes flex container */}
                
                </section>
          
                  {/* ================= INPUT ================= */}

                  {showKeyboard && (
                  
                    <div className="fixed bottom-[90px] left-0 right-0 z-40 px-4">
                  
                      <div
                        className="
                        mx-auto
                        flex
                        max-w-md
                        items-center
                        rounded-full
                        border
                        border-black/5
                        bg-white/95
                        px-5
                        py-3
                        shadow-[0_10px_35px_rgba(15,23,42,.10)]
                        backdrop-blur-3xl
                      "
                      >
                  
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
                          className="
                          flex-1
                          bg-transparent
                          text-[15px]
                          text-slate-800
                          outline-none
                          placeholder:text-slate-400
                        "
                        />
                  
                        <button
                          onClick={handleSubmit}
                          className="
                          ml-3
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-full
                          bg-slate-900
                          transition
                          hover:scale-105
                        "
                        >
                          <ArrowUp size={18} className="text-white"/>
                        </button>
                  
                      </div>
                  
                    </div>
                  
                  )}
              
                  {!showKeyboard && (
                    <div className="fixed bottom-[92px] left-1/2 z-40 -translate-x-1/2">
                  
                      {/* Soft outer glow */}
                      <div className="absolute inset-0 scale-[1.45] rounded-full bg-cyan-400/15 blur-2xl animate-pulse" />
                  
                      {/* Glass ring */}
                      <div className="absolute inset-[-8px] rounded-full border border-white/30 bg-white/10 backdrop-blur-xl" />
                  
                      <button
                        onClick={() => {
                          if (status === "listening") {
                            stopListening();
                          } else {
                            startListening();
                          }
                        }}
                        className={`
                          relative
                          flex
                          h-[76px]
                          w-[76px]
                          items-center
                          justify-center
                          rounded-full
                          transition-all
                          duration-500
                          active:scale-95
                          ${
                            status === "idle"
                              ? "bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 shadow-[0_10px_35px_rgba(34,211,238,.25)]"
                              : status === "listening"
                              ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(34,211,238,.65)] scale-110"
                              : status === "thinking"
                              ? "bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 shadow-[0_0_55px_rgba(139,92,246,.55)]"
                              : "bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 shadow-[0_0_60px_rgba(16,185,129,.55)]"
                          }
                        `}
                      >
                        {/* Outer glow */}
                        <div
                          className={`
                            absolute
                            inset-0
                            rounded-full
                            transition-all
                            duration-500
                            ${
                              status === "listening"
                                ? "animate-ping bg-cyan-300/30"
                                : status === "speaking"
                                ? "animate-pulse bg-emerald-300/20"
                                : ""
                            }
                          `}
                        />
                      
                        <Mic
                          size={30}
                          strokeWidth={2.3}
                          className={`
                            relative
                            z-10
                            text-white
                            transition-all
                            duration-300
                            ${
                              status === "listening"
                                ? "animate-pulse"
                                : status === "thinking"
                                ? "animate-bounce"
                                : ""
                            }
                          `}
                        />
                      </button>
                  
                    </div>
                  )}
              
                  {/* ================= BOTTOM NAVIGATION ================= */}
                  
                  <nav
                    className="
                      fixed
                      bottom-0
                      left-0
                      right-0
                      z-50
                      bg-transparent
                      pb-[env(safe-area-inset-bottom)]
                    "
                  >
                    <div className="mx-auto max-w-md px-3 pb-2">
                  
                      <div
                        className="
                          flex
                          h-16
                          items-center
                          justify-around
                          rounded-[22px]
                          border
                          border-slate-200
                          bg-white/95
                          backdrop-blur-3xl
                          shadow-[0_8px_30px_rgba(15,23,42,.08)]
                        "
                      >
                  
                        {/* Assistant */}
                  
                        <button
                          type="button"
                          onClick={() => handleModuleClick("Assistant")}
                          className="flex flex-col items-center gap-1"
                        >
                  
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10">
                  
                            <Sparkles
                              size={17}
                              className="text-cyan-600"
                            />
                  
                          </div>
                  
                          <span className="text-[10px] font-semibold text-cyan-600">
                            Assistant
                          </span>
                  
                        </button>
                  
                        {/* Career */}
                  
                        <button
                          type="button"
                          onClick={() => handleModuleClick("Career")}
                          className="flex flex-col items-center gap-1 transition-opacity hover:opacity-100"
                        >
                  
                          <Briefcase
                            size={18}
                            className="text-slate-500"
                          />
                  
                          <span className="text-[10px] text-slate-500">
                            Career
                          </span>
                  
                        </button>
                  
                        {/* Study */}
                  
                        <button
                          type="button"
                          onClick={() => handleModuleClick("Study")}
                          className="flex flex-col items-center gap-1 transition-opacity hover:opacity-100"
                        >
                  
                          <GraduationCap
                            size={18}
                            className="text-slate-500"
                          />
                  
                          <span className="text-[10px] text-slate-500">
                            Study
                          </span>
                  
                        </button>
                  
                        {/* Business */}
                  
                        <button
                          type="button"
                          onClick={() => handleModuleClick("Business")}
                          className="flex flex-col items-center gap-1 transition-opacity hover:opacity-100"
                        >
                  
                          <Building2
                            size={18}
                            className="text-slate-500"
                          />
                  
                          <span className="text-[10px] text-slate-500">
                            Business
                          </span>
                  
                        </button>
                  
                      </div>
                  
                    </div>
                  
                  </nav>
              
                </main>
              </div>

      {!isEmbedded && (
        <div className="hidden min-h-screen w-full bg-[linear-gradient(180deg,#f7f4ee_0%,#f1eee7_48%,#ebe8df_100%)] text-stone-900 lg:flex">
          <main className="relative flex-1 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute left-1/2 top-[-220px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-stone-300/20 blur-[190px]" />
              <div className="absolute right-[-180px] top-[100px] h-[340px] w-[340px] rounded-full bg-neutral-300/18 blur-[150px]" />
              <div className="absolute left-[-140px] bottom-[120px] h-[320px] w-[320px] rounded-full bg-white/45 blur-[130px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_58%)]" />
            </div>

            <div className="relative z-10 flex h-full flex-col">
              <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-8 py-16">
                <div className="relative flex h-[100px] w-[100px] items-center justify-center">
                  <div className="absolute h-[108px] w-[108px] rounded-[43%] border border-white/10 animate-[spin_34s_linear_infinite]" />
                  <div className="absolute h-[98px] w-[98px] rounded-[47%] border border-cyan-300/20 animate-[spin_22s_linear_infinite_reverse]" />
                  <div className="absolute h-[88px] w-[88px] rounded-[41%] border border-stone-300/20 animate-[spin_38s_linear_infinite]" />
                  <div className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#0b1a33_0%,#0a223f_55%,#071322_100%)] shadow-[0_30px_70px_rgba(0,0,0,.22)] ring-1 ring-white/5">
                    <div className="absolute h-16 w-16 rounded-full bg-cyan-300/10 blur-3xl" />
                    <span className="text-[28px] text-cyan-200/90 drop-shadow-[0_0_20px_rgba(34,211,238,.4)]">✦</span>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">MEXA✦</p>
                  <h1 className="mt-2 text-5xl font-semibold text-stone-900">MEXA</h1>
                </div>

                <p className="mt-4 max-w-2xl text-center text-sm leading-6 text-stone-600">
                  Your AI Life Operating System
                </p>

                <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {moduleConfigs.map((module, index) => (
                    <button
                      key={module.label}
                      type="button"
                      onClick={() => handleModuleClick(module.label)}
                      className={`rounded-full border border-stone-300/75 bg-white/65 px-4 py-3 text-xs font-medium text-stone-800 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-md transition hover:bg-white active:scale-[0.98] ${module.buttonClassName}`}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      {module.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activeModuleConfig && (
              <motion.div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-[6px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <motion.div
                  className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-950/88 px-5 py-6 text-center shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
                  initial={{ opacity: 0, scale: 0.985, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.985, y: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div className="mx-auto flex h-[64px] w-[64px] items-center justify-center rounded-full bg-gradient-to-br from-[#081C38] via-[#0B2247] to-[#071322] shadow-[0_14px_36px_rgba(0,0,0,0.3)]">
                    <span className="text-[26px] text-cyan-300">✦</span>
                  </div>

                  <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-slate-400">MEXA✦</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{activeModuleConfig.label}</h2>

                  <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300">Listening...</p>
                    <p className="mt-2 text-base font-medium text-white">{activeModuleConfig.prompt}</p>
                  </div>

                  {activeModuleConfig.label === "Workspace" ? (
                    <div className="mt-4 grid gap-2 text-left sm:grid-cols-2">
                      {workspaceTools.map((tool) => (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => setDraft(tool)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] text-slate-200 transition hover:bg-white/10"
                        >
                          • {tool}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-2 text-left sm:grid-cols-2">
                      {activeModuleConfig.suggestions.map((suggestion) => (
                        <div
                          key={suggestion}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-200"
                        >
                          • {suggestion}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-center">
                    <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-cyan-500/15 ring-1 ring-cyan-300/40 shadow-[0_0_40px_rgba(34,211,238,0.24)]">
                      <div className="absolute h-[82px] w-[82px] rounded-full border border-cyan-300/25 animate-pulse" />
                      <Mic size={28} className="relative z-10 text-cyan-200" />
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-300">Tap or say “Hey MEXA”</p>

                  <button
                    type="button"
                    onClick={() => setActiveModule(null)}
                    className="mt-5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium text-white transition hover:bg-white/10"
                  >
                    Close
                  </button>
                </motion.div>
              </motion.div>
            )}
          </main>
        </div>
      )}
    </>
  );
}
