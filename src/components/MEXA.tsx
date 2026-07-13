import {
  Menu,
  SlidersHorizontal,
  Mic,
  Sparkles,
  ArrowUp,
} from "lucide-react";

export default function MEXA() {
  // Hooks
  // State
  // Effects
  // Functions

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060D] text-white">
  
      {/* Background */}
      <div className="absolute inset-0">
  
        <div className="absolute inset-0 bg-[#04060D]" />
  
        <div className="absolute left-1/2 top-[38%] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[220px]" />
  
        <div className="absolute bottom-[-220px] left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[220px]" />
  
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-500/5 blur-[180px]" />
  
        <div className="absolute left-[18%] top-[20%] h-2 w-2 animate-pulse rounded-full bg-cyan-400/80" />
        <div className="absolute right-[22%] top-[30%] h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400/80" />
        <div className="absolute left-[12%] top-[58%] h-1 w-1 rounded-full bg-cyan-300/40" />
        <div className="absolute right-[16%] top-[62%] h-1 w-1 rounded-full bg-cyan-300/40" />
        <div className="absolute left-[28%] bottom-[18%] h-2 w-2 animate-pulse rounded-full bg-cyan-300/60" />
        <div className="absolute right-[30%] bottom-[22%] h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400/60" />
  
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/45" />
  
      </div>
  
      {/* Content */}
      <div className="relative z-10">
  
        {/* Header */}
        <header className="relative flex items-center justify-between px-6 pt-12">
  
          <button className="flex h-11 w-11 items-center justify-center text-white">
            <Menu size={30} strokeWidth={2} />
          </button>
  
          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <h1 className="text-[28px] font-extralight tracking-[0.28em] text-white">
              MEXA
              <span className="ml-1 text-[16px] align-top text-cyan-300">✦</span>
            </h1>
  
            <p className="mt-2 text-[14px] font-light text-white/45">
              Your AI Life Operating System
            </p>
          </div>
  
          <button className="flex h-11 w-11 items-center justify-center text-white">
            <SlidersHorizontal size={26} strokeWidth={2} />
          </button>
  
        </header>
  
        {/* Hero */}
        <div className="mt-14 flex flex-col items-center">
  
          {/* Orb */}
          <div className="relative flex h-[280px] w-[280px] items-center justify-center">
  
            <div className="absolute h-full w-full rounded-full bg-cyan-500/20 blur-[90px] animate-pulse" />
            <div className="absolute h-[180px] w-[180px] rounded-full bg-violet-500/20 blur-[70px]" />
  
            <div className="absolute h-[280px] w-[280px] rounded-full bg-cyan-400/10 blur-[90px]" />
  
            <div className="absolute h-[210px] w-[210px] animate-[spin_16s_linear_infinite] rounded-[42%] border border-cyan-300/35 bg-gradient-to-br from-cyan-300/15 to-indigo-500/10 shadow-[0_0_40px_rgba(80,220,255,.35)]" />
  
            <div className="absolute h-[210px] w-[210px] animate-[spin_11s_linear_infinite_reverse] rounded-[38%] border border-blue-400/35" />
  
            <div className="absolute h-[210px] w-[210px] animate-[spin_8s_linear_infinite] rounded-[46%] border border-indigo-400/40" />
  
            <div className="relative flex h-[150px] w-[150px] items-center justify-center rounded-full bg-gradient-to-br from-[#071323] via-[#111d39] to-[#070d18] shadow-[0_0_60px_rgba(0,210,255,.25)]">
  
              <div className="absolute h-24 w-24 rounded-full bg-cyan-300/10 blur-3xl" />
  
              <span className="text-7xl font-light text-cyan-300 drop-shadow-[0_0_30px_rgba(0,255,255,.8)]">
                ✦
              </span>
  
            </div>
  
          </div>
  
          {/* Voice Animation */}
          <div className="mt-10 flex items-center justify-center gap-2">
            {[8, 14, 20, 28, 40, 28, 20, 14, 8].map((h, i) => (
              <span
                key={i}
                className="w-[4px] rounded-full bg-cyan-300 animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
  
          {/* Listening */}
          <h2 className="mt-10 text-center text-5xl font-light tracking-tight text-white">
            I'm listening...
          </h2>
  
          <p className="mt-3 text-center text-2xl text-white/55">
            How can I help you today?
          </p>
  
        </div>
  
        {/* Microphone */}
  
        {/* Keyboard */}
  
        {/* Bottom Navigation */}
  
      </div>
  
    </div>
  );
