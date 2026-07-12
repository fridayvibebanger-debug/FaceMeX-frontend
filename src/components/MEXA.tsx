import React, { useEffect, useRef, useState } from "react";
import {
  Menu,
  Sparkles,
  Mic,
  Keyboard,
  Settings
} from "lucide-react";

export default function MEXA() {
  const [greeting, setGreeting] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [orbState, setOrbState] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour < 12)
      setGreeting("Good morning, Keem.");
    else if (hour < 18)
      setGreeting("Good afternoon, Keem.");
    else
      setGreeting("Good evening, Keem.");

    setOrbState("listening");
  }, []);

  useEffect(() => {

  const cycle = [

    "listening",

    "thinking",

    "speaking",

    "idle"

  ] as const;

  let index = 0;

  const timer = setInterval(() => {

    index++;

    setOrbState(cycle[index % cycle.length]);

  }, 3000);

  return () => clearInterval(timer);

}, []);

  useEffect(() => {

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("Speech Recognition not supported");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";

  recognition.interimResults = false;

  recognition.continuous = true;

  recognition.maxAlternatives = 1;

  recognition.onstart = () => {

    setOrbState("listening");

  };

  recognition.onend = () => {

    recognition.start();

  };

  recognition.onresult = (event: any) => {

    const speech =
      event.results[event.results.length - 1][0].transcript;

    console.log(speech);

    if (
      speech.toLowerCase().includes("mexa") ||
      speech.toLowerCase().includes("hey mexa") ||
      speech.toLowerCase().includes("hello mexa")
    ) {

      setOrbState("thinking");

      // AI comes next

    }

  };

  recognitionRef.current = recognition;

  recognition.start();

  return () => recognition.stop();

}, []);

  return (
    <div className="flex h-screen w-full flex-col bg-[#0b0b0d] text-white">

      {/* Header */}

      <header className="flex items-center justify-between p-5">

        <button>
          <Menu className="h-6 w-6"/>
        </button>

        <h1 className="font-semibold text-lg">
          MEXA
        </h1>

        <button>
          <Settings className="h-5 w-5"/>
        </button>

      </header>

      {/* Center */}

      <main className="flex flex-1 flex-col items-center justify-center px-8">

        {/* AI Orb */}

        <div className="relative flex items-center justify-center">

        {/* Outer Glow */}
      
        <div
          className={`
            absolute
            h-72
            w-72
            rounded-full
            blur-3xl
            transition-all
            duration-700
            ${
              orbState === "listening"
                ? "bg-cyan-500/35 animate-pulse scale-105"
                : orbState === "thinking"
                ? "bg-violet-500/35 animate-ping"
                : orbState === "speaking"
                ? "bg-emerald-400/40 animate-pulse scale-110"
                : "bg-cyan-500/20"
            }
          `}
        />
      
        {/* Rotating Ring */}
      
        <div
          className="
            absolute
            h-56
            w-56
            rounded-full
            border
            border-cyan-400/30
            animate-spin
          "
          style={{
            animationDuration: "10s",
          }}
        />
      
        {/* Second Ring */}
      
        <div
          className="
            absolute
            h-48
            w-48
            rounded-full
            border
            border-emerald-400/20
            animate-spin
          "
          style={{
            animationDuration: "6s",
            animationDirection: "reverse",
          }}
        />
      
        {/* Main Orb */}
      
        <div
          className={`
            relative
            h-40
            w-40
            rounded-full
            bg-gradient-to-br
            from-cyan-300
            via-sky-400
            to-emerald-400
            shadow-[0_0_120px_rgba(34,211,238,.45)]
            transition-all
            duration-700
            ${
              orbState === "speaking"
                ? "scale-110"
                : orbState === "thinking"
                ? "animate-bounce"
                : "animate-pulse"
            }
          `}
        >
      
          <div className="absolute inset-4 rounded-full bg-[#07080c]" />
      
          <div
            className="
              absolute
              inset-8
              rounded-full
              bg-gradient-to-br
              from-cyan-400
              to-emerald-400
              opacity-70
              blur-md
            "
          />
      
        </div>
      
      </div>

        <div className="mt-10 text-center">

          <div className="flex items-center justify-center gap-2">

            <Sparkles className="h-5 w-5 text-emerald-400"/>

            <span className="text-xl font-semibold">
              {greeting}
            </span>

          </div>

          <p className="mt-6 max-w-xl text-base text-zinc-400 leading-8">

            FaceMeX gained <b>4,218</b> new users overnight.

            <br/><br/>

            Two investors replied.

            <br/>

            Three schools requested demos.

            <br/>

            Primelink Deliver has 18 deliveries today.

            <br/><br/>

            I've already prepared everything.

            <br/><br/>

            What would you like to work on first?

          </p>

        </div>

      </main>

      {/* Bottom */}

      <footer className="p-5">

        <div className="flex justify-center gap-4">

          <button
            onClick={() => setKeyboardOpen(true)}
            className="flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-3 hover:bg-zinc-900"
          >
            <Keyboard size={18}/>
            Keyboard
          </button>

          <button
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            <Mic size={18}/>
            Listening...
          </button>

        </div>

      </footer>

      {keyboardOpen && (

        <div className="border-t border-zinc-800 bg-[#111] p-4">

          <input
            autoFocus
            placeholder="Ask MEXA anything..."
            className="
            w-full
            rounded-xl
            bg-[#1b1b1b]
            p-4
            outline-none
            text-white
            "
          />

        </div>

      )}

    </div>
  );
}
