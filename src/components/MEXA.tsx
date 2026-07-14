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
      <main className="relative h-screen overflow-hidden bg-[#FAFAFC] text-[#111827]">

      {/* ================= Premium Background ================= */}

      <div className="absolute inset-0 overflow-hidden">

        <div className="absolute inset-0 bg-[#FAFAFC]" />

        <div className="absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-cyan-300/12 blur-[180px]" />

        <div className="absolute left-1/2 bottom-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-blue-200/10 blur-[220px]" />

        <div className="absolute left-1/2 top-[35%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/70 blur-[120px]" />

        <div className="absolute left-[-180px] top-[35%] h-[300px] w-[300px] rounded-full bg-cyan-200/8 blur-[140px]" />

        <div className="absolute right-[-180px] top-[30%] h-[320px] w-[320px] rounded-full bg-sky-200/8 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px,#000 1px,transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/80" />

      </div>
          {/* ================= HEADER ================= */}

          <header className="absolute top-0 left-0 right-0 z-50">
          
            <div className="mx-auto flex h-[76px] max-w-md items-center justify-between px-5">
          
              {/* Menu */}
          
              <button
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-slate-200
                  bg-white/80
                  shadow-[0_6px_18px_rgba(0,0,0,.06)]
                  backdrop-blur-xl
                  transition
                  active:scale-95
                "
              >
                <Menu size={21} className="text-slate-800" />
              </button>
          
              {/* Logo */}
          
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
          
              {/* Settings */}
          
              <button
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-slate-200
                  bg-white/80
                  shadow-[0_6px_18px_rgba(0,0,0,.06)]
                  backdrop-blur-xl
                  transition
                  active:scale-95
                "
              >
                <SlidersHorizontal
                  size={20}
                  className="text-slate-800"
                />
              </button>
          
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
                  className="absolute h-[390px] w-[390px] rounded-full bg-cyan-400/8 blur-[145px]"
                  style={{ animation: "floatGlow 14s ease-in-out infinite" }}
                />
          
                <div
                  className="absolute h-[340px] w-[340px] rounded-full bg-sky-400/7 blur-[155px]"
                  style={{ animation: "floatGlow 18s ease-in-out infinite reverse" }}
                />
          
                <div
                  className="absolute h-[300px] w-[300px] rounded-full bg-violet-500/6 blur-[165px]"
                  style={{ animation: "floatGlow 20s ease-in-out infinite" }}
                />
          
                <div
                  className="absolute h-[230px] w-[230px] rounded-full bg-cyan-300/8 blur-[100px]"
                  style={{ animation: "floatGlow 10s ease-in-out infinite" }}
                />
          
                {/* Floating Orb */}
          
                <div className="relative flex items-center justify-center">
          
                  {/* Orbit Rings */}
          
                  <div className="absolute h-[182px] w-[182px] rounded-[42%] border border-cyan-300/10 animate-[spin_28s_linear_infinite]" />
          
                  <div className="absolute h-[172px] w-[172px] rounded-[48%] border border-cyan-300/6 animate-[spin_20s_linear_infinite_reverse]" />
          
                  <div className="absolute h-[162px] w-[162px] rounded-[38%] border border-cyan-300/5 animate-[spin_36s_linear_infinite]" />
          
                  {/* Core */}
          
                  <div className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-gradient-to-br from-[#081C38] via-[#0B2247] to-[#071322] shadow-[0_30px_70px_rgba(0,0,0,.22)]">
          
                    <div className="absolute h-20 w-20 rounded-full bg-cyan-300/15 blur-3xl" />
          
                    <span className="text-[54px] text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,.6)]">
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
          
              <p className="mt-8 text-center text-[21px] font-semibold text-slate-700">
                Ready whenever you are
              </p>
          
              {/* Type Button */}
          
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
          
            </div>
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
            <div className="fixed bottom-[92px] left-1/2 z-40 -translate-x-1/2">
          
              {/* Soft outer glow */}
              <div className="absolute inset-0 scale-[1.45] rounded-full bg-cyan-400/15 blur-2xl animate-pulse" />
          
              {/* Glass ring */}
              <div className="absolute inset-[-8px] rounded-full border border-white/30 bg-white/10 backdrop-blur-xl" />
          
              <button
                className="
                  relative
                  flex
                  h-[76px]
                  w-[76px]
                  items-center
                  justify-center
                  rounded-full
                  bg-gradient-to-br
                  from-sky-400
                  via-cyan-400
                  to-blue-500
                  shadow-[0_10px_35px_rgba(34,211,238,.25)]
                  transition-all
                  duration-300
                  active:scale-95
                  hover:scale-105
                  animate-[pulse_3s_ease-in-out_infinite]
                "
              >
                <Mic
                  size={30}
                  strokeWidth={2.3}
                  className="text-white"
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
