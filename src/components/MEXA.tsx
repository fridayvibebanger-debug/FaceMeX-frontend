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
      
          <section className="absolute inset-x-0 top-[76px] bottom-[92px] flex items-center justify-center">
      
            <div className="flex flex-col items-center">
      
              {/* ORB */}
      
              <div className="relative flex h-[205px] w-[205px] items-center justify-center">
      
                <div className="absolute h-[205px] w-[205px] rounded-full bg-cyan-300/20 blur-[70px]" />
      
                <div className="absolute h-[178px] w-[178px] rounded-[42%] border border-cyan-400/30 animate-[spin_18s_linear_infinite]" />
      
                <div className="absolute h-[170px] w-[170px] rounded-[48%] border border-cyan-500/20 animate-[spin_13s_linear_infinite_reverse]" />
      
                <div className="absolute h-[160px] w-[160px] rounded-[40%] border border-sky-300/20 animate-[spin_8s_linear_infinite]" />
      
                <div className="relative flex h-[108px] w-[108px] items-center justify-center rounded-full bg-gradient-to-br from-[#06142A] via-[#102445] to-[#0A1628] shadow-[0_15px_50px_rgba(0,180,255,.20)]">
      
                  <div className="absolute h-16 w-16 rounded-full bg-cyan-300/20 blur-3xl" />
      
                  <span className="text-[54px] text-cyan-300">
      
                    ✦
      
                  </span>
      
                </div>
      
              </div>
      
              {/* Voice Wave */}
      
              <div className="mt-8 flex items-end gap-[4px]">
      
                {[10,16,24,36,48,36,24,16,10].map((h,i)=>
      
                  <span
      
                    key={i}
      
                    style={{
      
                      height:h,
      
                      animationDelay:`${i*0.08}s`
      
                    }}
      
                    className="w-[4px] rounded-full bg-cyan-500 animate-pulse"
      
                  />
      
                )}
      
              </div>
      
              <h2 className="mt-8 text-[40px] font-bold tracking-tight">
      
                MEXA
      
              </h2>
      
              <p className="mt-2 text-center text-[15px] text-slate-500">
      
                Ready whenever you are
      
              </p>
      
              {/* Toggle Button */}
      
              <button
      
                onClick={()=>setShowKeyboard(!showKeyboard)}
      
                className="
      
                  mt-8
      
                  rounded-full
      
                  border
      
                  border-black/5
      
                  bg-white/70
      
                  px-7
      
                  py-3
      
                  text-sm
      
                  font-medium
      
                  shadow-sm
      
                  backdrop-blur-xl
      
                  transition-all
      
                  hover:scale-[1.02]
      
                "
      
              >
      
                {showKeyboard ? "Hide keyboard" : "⌨ Type instead"}
      
              </button>
      
            </div>
      
          </section>
      
          {/* ================= INPUT ================= */}
      
          {showKeyboard && (
      
            <div className="absolute bottom-[92px] left-0 right-0 z-40 px-4">
      
              <div className="mx-auto flex max-w-md items-center rounded-full border border-black/5 bg-white/90 px-5 py-3 shadow-xl backdrop-blur-3xl">
      
                <input
      
                  className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400"
      
                  placeholder="Message MEXA..."
      
                />
      
                <button
      
                  className="ml-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#111827] text-white"
      
                >
      
                  <ArrowUp size={18}/>
      
                </button>
      
              </div>
      
            </div>
      
          )}
      
          {!showKeyboard && (
      
            <button
      
              className="
      
                absolute
      
                bottom-[115px]
      
                left-1/2
      
                flex
      
                h-[82px]
      
                w-[82px]
      
                -translate-x-1/2
      
                items-center
      
                justify-center
      
                rounded-full
      
                bg-gradient-to-br
      
                from-cyan-400
      
                to-blue-500
      
                shadow-[0_0_60px_rgba(0,190,255,.35)]
      
              "
      
            >
      
              <Mic size={34} className="text-white"/>
      
            </button>
      
          )}
      
              {/* ================= BOTTOM NAVIGATION ================= */}

          <nav className="absolute bottom-0 left-0 right-0 z-50">
      
            <div className="mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),10px)]">
      
              <div
                className="
                  mb-2
                  flex
                  h-[68px]
                  items-center
                  justify-around
                  rounded-3xl
                  border
                  border-black/5
                  bg-white/92
                  shadow-[0_10px_35px_rgba(15,23,42,.10)]
                  backdrop-blur-3xl
                "
              >
      
                {/* Assistant */}
      
                <button className="group flex flex-col items-center gap-1">
      
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10">
      
                    <Sparkles
                      size={18}
                      className="text-cyan-600"
                    />
      
                  </div>
      
                  <span className="text-[10px] font-semibold text-cyan-600">
      
                    Assistant
      
                  </span>
      
                </button>
      
                {/* Career */}
      
                <button className="group flex flex-col items-center gap-1">
      
                  <div className="flex h-9 w-9 items-center justify-center rounded-full transition group-hover:bg-slate-100">
      
                    <Briefcase
                      size={18}
                      className="text-slate-500"
                    />
      
                  </div>
      
                  <span className="text-[10px] font-medium text-slate-500">
      
                    Career
      
                  </span>
      
                </button>
      
                {/* Study */}
      
                <button className="group flex flex-col items-center gap-1">
      
                  <div className="flex h-9 w-9 items-center justify-center rounded-full transition group-hover:bg-slate-100">
      
                    <GraduationCap
                      size={18}
                      className="text-slate-500"
                    />
      
                  </div>
      
                  <span className="text-[10px] font-medium text-slate-500">
      
                    Study
      
                  </span>
      
                </button>
      
                {/* Business */}
      
                <button className="group flex flex-col items-center gap-1">
      
                  <div className="flex h-9 w-9 items-center justify-center rounded-full transition group-hover:bg-slate-100">
      
                    <Building2
                      size={18}
                      className="text-slate-500"
                    />
      
                  </div>
      
                  <span className="text-[10px] font-medium text-slate-500">
      
                    Business
      
                  </span>
      
                </button>
      
              </div>
      
            </div>
      
          </nav>
      
        </main>
      
      );
      }
