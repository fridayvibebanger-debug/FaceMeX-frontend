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
      
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[#04060D]" />
      
            <div className="absolute left-1/2 top-1/3 h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[220px]" />
      
            <div className="absolute bottom-[-220px] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[220px]" />
      
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
          </div>
      
          {/* HEADER */}
      
          <header className="absolute inset-x-0 top-0 z-50 h-20 px-5">
      
            <div className="mx-auto flex h-full max-w-md items-center justify-between">
      
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 backdrop-blur-xl">
                <Menu size={22}/>
              </button>
      
              <div className="text-center">
      
                <h1 className="text-xl font-light tracking-[0.35em]">
                  MEXA
                </h1>
      
                <p className="mt-1 text-[11px] text-white/45">
                  Your AI Life Operating System
                </p>
      
              </div>
      
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 backdrop-blur-xl">
                <SlidersHorizontal size={20}/>
              </button>
      
            </div>
      
          </header>
      
          {/* CENTER */}
      
          <section className="absolute inset-x-0 top-20 bottom-40 flex items-center justify-center">
      
            <div className="flex flex-col items-center">
      
              {/* Orb */}
      
              <div className="relative flex h-44 w-44 items-center justify-center">
      
                <div className="absolute h-44 w-44 rounded-full bg-cyan-500/10 blur-[70px]" />
      
                <div className="absolute h-36 w-36 rounded-[42%] border border-cyan-300/25 animate-[spin_18s_linear_infinite]" />
      
                <div className="absolute h-32 w-32 rounded-[48%] border border-cyan-400/20 animate-[spin_12s_linear_infinite_reverse]" />
      
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#071424] via-[#101C38] to-[#050B16]">
      
                  <span className="text-5xl text-cyan-300">
                    ✦
                  </span>
      
                </div>
      
              </div>
      
              {/* Wave */}
      
              <div className="mt-6 flex items-end gap-1">
      
                {[8,14,22,30,40,30,22,14,8].map((h,i)=>(
                  <span
                    key={i}
                    style={{height:h}}
                    className="w-[3px] rounded-full bg-cyan-300 animate-pulse"
                  />
                ))}
      
              </div>
      
              <h2 className="mt-8 text-3xl font-light">
                MEXA
              </h2>
      
              <p className="mt-2 text-center text-sm text-white/45">
                Ready whenever you are
              </p>
      
              {!showKeyboard && (
      
                <button
                  onClick={()=>setShowKeyboard(true)}
                  className="mt-7 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm text-white/70 backdrop-blur-xl"
                >
                  ⌨ Type instead
                </button>
      
              )}
      
            </div>
      
          </section>
      
          {/* INPUT */}
      
          {showKeyboard && (
      
            <div className="absolute bottom-20 left-0 right-0 px-4">
      
              <div className="mx-auto flex max-w-md items-center rounded-3xl border border-white/10 bg-[#171717]/90 px-4 py-3 backdrop-blur-3xl">
      
                <input
                  className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none"
                  placeholder="Message MEXA..."
                />
      
                <button className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-white">
      
                  <ArrowUp className="text-black" size={18}/>
      
                </button>
      
              </div>
      
            </div>
      
          )}
      
          {!showKeyboard && (
      
            <button
              className="absolute bottom-28 left-1/2 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_45px_rgba(0,255,255,.35)]"
            >
              <Mic size={34}/>
            </button>
      
          )}
      
          {/* NAVIGATION */}
      
          <nav className="absolute bottom-0 left-0 right-0 h-20 border-t border-white/10 bg-[#07111D]/95 backdrop-blur-3xl">
      
            <div className="mx-auto grid h-full max-w-md grid-cols-4">
      
              <button className="flex flex-col items-center justify-center gap-1 text-cyan-300">
                <Sparkles size={22}/>
                <span className="text-[11px]">Assistant</span>
              </button>
      
              <button className="flex flex-col items-center justify-center gap-1 text-white/55">
                <Briefcase size={22}/>
                <span className="text-[11px]">Career</span>
              </button>
      
              <button className="flex flex-col items-center justify-center gap-1 text-white/55">
                <GraduationCap size={22}/>
                <span className="text-[11px]">Study</span>
              </button>
      
              <button className="flex flex-col items-center justify-center gap-1 text-white/55">
                <Building2 size={22}/>
                <span className="text-[11px]">Business</span>
              </button>
            </div>
          </nav>
          
          </section>
          
          </main>
          );
          }
