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
        <main className="relative h-screen overflow-hidden bg-[#F7F8FC] text-[#101828]">
      
          {/* ================= Background ================= */}
      
          <div className="absolute inset-0 overflow-hidden">
      
            <div className="absolute inset-0 bg-[#F7F8FC]" />
      
            <div className="absolute top-[-180px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-300/20 blur-[170px]" />
      
            <div className="absolute bottom-[-220px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-200/20 blur-[170px]" />
      
            <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-white" />
      
          </div>
      
          {/* ================= HEADER ================= */}
      
          <header className="absolute top-0 left-0 right-0 z-50">
      
            <div className="mx-auto flex h-[74px] max-w-md items-center justify-between px-5">
      
              <button className="flex h-11 w-11 items-center justify-center rounded-full border border-black/5 bg-white/70 shadow-sm backdrop-blur-xl">
      
                <Menu size={22} />
      
              </button>
      
              <div className="text-center">
      
                <h1 className="text-[28px] font-bold tracking-[0.28em]">
      
                  MEXA
      
                </h1>
      
                <p className="text-[11px] text-slate-500">
      
                  Your AI Life Operating System
      
                </p>
      
              </div>
      
              <button className="flex h-11 w-11 items-center justify-center rounded-full border border-black/5 bg-white/70 shadow-sm backdrop-blur-xl">
      
                <SlidersHorizontal size={20} />
      
              </button>
      
            </div>
      
          </header>
      
          {/* ================= CENTER ================= */}

          <section className="absolute inset-x-0 top-[92px] bottom-[120px] flex flex-col items-center justify-center px-6">
          
            {/* AI Orb */}
          
            <div className="relative flex h-[180px] w-[180px] items-center justify-center">
          
              <div className="absolute h-[220px] w-[220px] rounded-full bg-cyan-400/10 blur-[90px]" />
          
              <div className="absolute h-[170px] w-[170px] rounded-full border border-cyan-300/15 animate-[spin_18s_linear_infinite]" />
          
              <div className="absolute h-[162px] w-[162px] rounded-full border border-cyan-300/10 animate-[spin_12s_linear_infinite_reverse]" />
          
              <div className="relative flex h-[98px] w-[98px] items-center justify-center rounded-full bg-gradient-to-br from-[#081C38] via-[#0D234A] to-[#071322] shadow-[0_15px_40px_rgba(0,0,0,.15)]">
          
                <span className="text-[48px] text-cyan-300">
                  ✦
                </span>
          
              </div>
          
            </div>
          
            {/* Premium Voice Wave */}
          
            <div className="mt-12 flex h-9 items-end gap-[4px]">
          
              {[8,14,22,30,40,30,22,14,8].map((h,i)=>(
                <span
                  key={i}
                  className="w-[5px] rounded-full bg-gradient-to-t from-cyan-500 to-cyan-300 animate-pulse"
                  style={{
                    height:`${h}px`,
                    animationDelay:`${i*0.08}s`
                  }}
                />
              ))}
          
            </div>
          
            {/* No second MEXA title */}
          
            <p className="mt-8 text-center text-[20px] font-medium text-slate-700">
                Ready whenever you are
            </p>
          
            {/* Type Button */}
          
            <button
                onClick={()=>setShowKeyboard(!showKeyboard)}
                className="
                mt-8
                h-12
                rounded-full
                border
                border-slate-200
                bg-white
                px-7
                text-[15px]
                font-medium
                text-slate-700
                shadow-sm
                transition
                hover:shadow-md
                "
            >
                ⌨ Type instead
            </button>
          
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

          <div className="fixed bottom-[108px] left-1/2 z-40 -translate-x-1/2">
          
          <button
            className="
                flex
                h-[78px]
                w-[78px]
                items-center
                justify-center
                rounded-full
                bg-gradient-to-br
                from-cyan-400
                to-blue-500
                shadow-[0_15px_45px_rgba(0,180,255,.35)]
                transition
                duration-300
                hover:scale-105
                active:scale-95
                "
          >
          
          <Mic size={34} className="text-white"/>
          
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
          
                <button className="flex flex-col items-center gap-1">
          
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
          
                <button className="flex flex-col items-center gap-1 transition-opacity hover:opacity-100">
          
                  <Briefcase
                    size={18}
                    className="text-slate-500"
                  />
          
                  <span className="text-[10px] text-slate-500">
                    Career
                  </span>
          
                </button>
          
                {/* Study */}
          
                <button className="flex flex-col items-center gap-1 transition-opacity hover:opacity-100">
          
                  <GraduationCap
                    size={18}
                    className="text-slate-500"
                  />
          
                  <span className="text-[10px] text-slate-500">
                    Study
                  </span>
          
                </button>
          
                {/* Business */}
          
                <button className="flex flex-col items-center gap-1 transition-opacity hover:opacity-100">
          
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
      
      );
      }
