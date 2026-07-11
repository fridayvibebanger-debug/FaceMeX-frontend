import React, { useEffect, useRef, useState } from "react";
import {
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Mic,
  Paperclip,
  ArrowUp,
} from "lucide-react";

export default function MEXA() {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [transcript, setTranscript] = useState("");
  
  const [messages, setMessages] = useState<
  {
    role: "user" | "assistant";
    content: string;
  }[]
>([]);
  
  const recognitionRef = useRef<any>(null);
  // ===========================
// Voice Recognition
// ===========================

useEffect(() => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("Speech Recognition is not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    setIsListening(true);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  recognition.onerror = (event: any) => {
    console.error("Speech Recognition Error:", event);
    setIsListening(false);
  };

  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript;

    setTranscript(text);

    sendToMexa(text);
  };

  recognitionRef.current = recognition;

  return () => {
    recognition.stop();
  };
}, []);


// ===========================
// Start Listening
// ===========================

const startListening = () => {
  recognitionRef.current?.start();
};


// ===========================
// Send to MEXA
// ===========================

const sendToMexa = async (text: string) => {
  setIsThinking(true);

  try {
    // Temporary response
    setTimeout(() => {
     setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: text,
        },
        {
          role: "assistant",
          content: `You said: ${text}`,
        },
      ]);
      setIsThinking(false);
    }, 1200);

  } catch (error) {
    console.error(error);
    setIsThinking(false);
  }
};

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white">

      {/* Sidebar */}

      <aside className="hidden w-72 border-r border-white/10 bg-[#171717] lg:flex lg:flex-col">

        <div className="flex items-center justify-between p-4">

          <h1 className="text-xl font-bold">
            MEXA
          </h1>

          <button>
            <Menu size={20}/>
          </button>

        </div>

        <button className="mx-4 flex items-center gap-2 rounded-xl bg-white/10 p-3 hover:bg-white/20">

          <Plus size={18}/>

          New Chat

        </button>

        <div className="mt-6 flex-1 overflow-y-auto">

        </div>

        <div className="border-t border-white/10 p-4">

          <button className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 p-3">

            <Sparkles size={18}/>

            Upgrade

          </button>

        </div>

      </aside>

      {/* Main */}

      <main className="flex flex-1 flex-col">

        {/* Header */}

        <header className="flex h-16 items-center justify-between border-b border-white/10 px-5">

          <div className="flex items-center gap-3">
        
            <button className="rounded-xl p-2 hover:bg-white/10 lg:hidden">
              <Menu size={20}/>
            </button>
        
            <div>
        
              <h2 className="text-lg font-bold">
                MEXA
              </h2>
        
              <p className="text-xs text-white/50">
                Your AI Companion
              </p>
        
            </div>
        
          </div>
        
          <div className="flex items-center gap-2">
        
            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">
              Deep Research
            </button>
        
            <button className="rounded-xl border border-white/10 p-2 hover:bg-white/10">
              <Search size={18}/>
            </button>
        
            <button className="rounded-xl border border-white/10 p-2 hover:bg-white/10">
              <Settings size={18}/>
            </button>
        
          </div>
        
        </header>

        {/* Messages */}

       <div className="flex flex-1 flex-col items-center justify-center px-6">

            <button
              type="button"
              onClick={startListening}
              className={`relative flex h-44 w-44 items-center justify-center rounded-full transition-all duration-300
          
                ${
                  isListening
                    ? "bg-blue-500 scale-110 animate-pulse"
                    : isThinking
                    ? "bg-orange-500 animate-pulse"
                    : isSpeaking
                    ? "bg-green-500"
                    : "bg-emerald-500 hover:scale-105"
                }
          
                shadow-[0_0_80px_rgba(16,185,129,.45)]
              `}
            >
          
              <span className="text-6xl">
                🎤
              </span>
          
            </button>
          
            <h2 className="mt-8 text-3xl font-bold">

              {isListening
                ? "I'm listening..."
                : isThinking
                ? "Thinking..."
                : isSpeaking
                ? "Speaking..."
                : "Hi, I'm MEXA"}
            
            </h2>
            
            <p className="mt-3 max-w-xl text-center text-white/60">
            
              {isListening
                ? "Tell me anything."
                : transcript
                ? transcript
                : "Tap the orb and speak naturally. I can help with jobs, school, business, research, coding and everyday questions."}
            
            </p>
           <div className="mt-10 w-full max-w-3xl">
  
              {messages.map((message, index) => (
            
                <div
                  key={index}
                  className={`rounded-3xl p-6 border ${
                    message.role === "assistant"
                      ? "border-white/10 bg-[#171717]"
                      : "border-emerald-500/20 bg-emerald-900/20"
                  }`}
                >
                
                  <div className="mb-3 flex items-center gap-3">
                
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        message.role === "assistant"
                          ? "bg-emerald-500"
                          : "bg-blue-500"
                      }`}
                    >
                      {message.role === "assistant" ? "M" : "U"}
                    </div>
                
                    <div>
                
                      <h3 className="font-semibold">
                        {message.role === "assistant" ? "MEXA" : "You"}
                      </h3>
                
                    </div>
                
                  </div>
                
                  <p className="leading-8">
                
                    {message.content}
                
                  </p>
                
                </div>
              ))}
            
            </div>
        {/* Input */}

        <div className="border-t border-white/10 p-5">

          <div className="flex items-center rounded-3xl border border-white/10 bg-[#171717] px-4 py-3">

            <button>

              <Paperclip size={18}/>

            </button>

            <input
              value={message}
              onChange={(e)=>setMessage(e.target.value)}
              placeholder="Message MEXA..."
              className="flex-1 bg-transparent px-4 outline-none"
            />

            <button>

              <Mic size={20}/>

            </button>

            <button className="ml-3 rounded-full bg-white p-2 text-black">

              <ArrowUp size={18}/>

            </button>

          </div>

        </div>

      </main>

    </div>
  );
}
