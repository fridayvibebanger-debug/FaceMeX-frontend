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

export default function MEXA() {
  const [showKeyboard, setShowKeyboard] = useState(false);
  
  return (
    <main className="relative h-screen overflow-hidden bg-[#04060D] text-white">

      {/* ================= BACKGROUND ================= */}

      <div className="absolute inset-0">

        <div className="absolute inset-0 bg-[#04060D]" />

        {/* Main cyan glow */}

        <div className="absolute left-1/2 top-[34%] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[220px]" />

        {/* Purple */}

        <div className="absolute bottom-[-220px] left-1/2 h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[220px]" />

        {/* Top */}

        <div className="absolute left-1/2 top-[-150px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[180px]" />

        {/* Stars */}

        <div className="absolute left-[18%] top-[18%] h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />

        <div className="absolute right-[18%] top-[20%] h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />

        <div className="absolute left-[10%] bottom-[26%] h-1 w-1 rounded-full bg-cyan-300/70" />

        <div className="absolute right-[12%] bottom-[32%] h-1 w-1 rounded-full bg-cyan-300/60" />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

      </div>

      {/* ================= CONTENT ================= */}

      <section className="relative z-20 flex h-full flex-col">

        {/* HEADER */}

        <header className="fixed top-0 left-0 right-0 z-50 px-5 pt-5">
        <div className="flex items-center justify-between">
      
          <button className="h-11 w-11 rounded-full bg-white/5 backdrop-blur-md">
            <Menu className="h-6 w-6 text-white"/>
          </button>
      
          <div className="text-center">
            <h1 className="text-2xl font-extralight tracking-[0.40em] text-white">
              MEXA
            </h1>
      
            <p className="mt-1 text-xs text-white/45 tracking-wide">
              Your AI Life Operating System
            </p>
          </div>
      
          <button className="h-10 w-10 rounded-full bg-white/5 backdrop-blur-md">
            <SlidersHorizontal className="h-5 w-5 text-white"/>
          </button>
      
        </div>
      </header>

      {/* ================= HERO ================= */}

        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-20 pb-28">
        
          {/* ORB */}
        
          <div className="relative flex h-[180px] w-[180px] items-center justify-center">
        
            <div className="absolute h-[180px] w-[180px] rounded-full bg-cyan-400/10 blur-[70px]" />
            <div className="absolute h-[130px] w-[130px] rounded-full bg-violet-500/10 blur-[60px]" />
        
            <div className="absolute h-[155px] w-[155px] rounded-[42%] border border-cyan-300/25 animate-[spin_18s_linear_infinite]" />
        
            <div className="absolute h-[148px] w-[148px] rounded-[48%] border border-cyan-400/20 animate-[spin_12s_linear_infinite_reverse]" />
        
            <div className="absolute h-[142px] w-[142px] rounded-[38%] border border-indigo-400/20 animate-[spin_8s_linear_infinite]" />
        
            <div className="relative flex h-[98px] w-[98px] items-center justify-center rounded-full bg-gradient-to-br from-[#071424] via-[#101C38] to-[#050B16] shadow-[0_0_40px_rgba(0,220,255,.25)]">
        
              <div className="absolute h-16 w-16 rounded-full bg-cyan-300/10 blur-3xl" />
        
              <span className="text-[46px] text-cyan-300 drop-shadow-[0_0_18px_rgba(0,255,255,.8)]">
                ✦
              </span>
        
            </div>
        
          </div>
        
          {/* Voice Wave */}
        
          <div className="mt-7 flex items-end gap-[3px]">
            {[8, 14, 22, 30, 40, 30, 22, 14, 8].map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-cyan-300 animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        
          {/* TEXT */}
        
          <h2 className="mt-8 text-center text-[30px] font-light tracking-tight text-white">
            MEXA
          </h2>
        
          <p className="mt-2 max-w-[270px] text-center text-[15px] leading-7 text-white/45">
            Ready whenever you are
          </p>
        
          {/* TYPE BUTTON */}
        
          <button
            onClick={() => setShowKeyboard(true)}
            className="
              mt-8
              rounded-full
              border
              border-white/10
              bg-white/[0.04]
              px-6
              py-2.5
              text-sm
              font-medium
              text-white/75
              backdrop-blur-xl
              transition-all
              hover:bg-white/[0.08]
              active:scale-95
            "
          >
            ⌨ Type instead
          </button>
        
          {/* MICROPHONE */}
        
          <button
            className="
              mt-12
              flex
              h-[72px]
              w-[72px]
              items-center
              justify-center
              rounded-full
              bg-gradient-to-br
              from-cyan-400
              via-cyan-500
              to-blue-500
              shadow-[0_0_35px_rgba(0,255,255,.35)]
              transition-all
              duration-300
              hover:scale-105
              active:scale-95
            "
          >
            <Mic className="h-8 w-8 text-white" strokeWidth={2.4} />
          </button>
        
        </div>
        
        {/* ================= CHAT BAR ================= */}
        
        {showKeyboard && (
          <div className="fixed bottom-[88px] left-0 right-0 z-40 px-4">
        
            <div
              className="
                mx-auto
                flex
                max-w-md
                items-end
                rounded-[28px]
                border
                border-white/10
                bg-[#171717]/90
                px-4
                py-3
                backdrop-blur-3xl
                shadow-[0_10px_40px_rgba(0,0,0,.45)]
              "
            >
        
              <input
                type="text"
                placeholder="Message MEXA..."
                className="
                  flex-1
                  bg-transparent
                  text-[15px]
                  text-white
                  placeholder:text-white/40
                  outline-none
                "
              />
        
              <button
                className="
                  ml-3
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-white
                  text-black
                  transition-all
                  hover:scale-105
                "
              >
                <ArrowUp className="h-4 w-4" />
              </button>
        
            </div>
        
          </div>
        )}
          
          {/* Bottom Navigation */}
          
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#07111D]/95 backdrop-blur-3xl">
            <div className="mx-auto grid h-20 max-w-md grid-cols-4">
              <button className="flex flex-col items-center justify-center gap-1 text-cyan-300">
                <Sparkles size={22} />
                <span className="text-[11px] font-medium">Assistant</span>
              </button>
          
              <button className="flex flex-col items-center justify-center gap-1 text-white/60">
                <Briefcase size={22} />
                <span className="text-[11px]">Career</span>
              </button>
          
              <button className="flex flex-col items-center justify-center gap-1 text-white/60">
                <GraduationCap size={22} />
                <span className="text-[11px]">Study</span>
              </button>
          
              <button className="flex flex-col items-center justify-center gap-1 text-white/60">
                <Building2 size={22} />
                <span className="text-[11px]">Business</span>
              </button>
            </div>
          </nav>
          
          </section>
          
          </main>
          );
          }
