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
      
          {/* ================= PREMIUM BACKGROUND ================= */}

          <div className="absolute inset-0 overflow-hidden">
          
            <div className="absolute inset-0 bg-[#F7F8FC]" />
          
            {/* Top Blue Glow */}
          
            <div
              className="
              absolute
              left-1/2
              top-[18%]
              h-[520px]
              w-[520px]
              -translate-x-1/2
              rounded-full
              bg-cyan-400/20
              blur-[150px]
              animate-pulse
            "
            />
          
            {/* Purple Glow */}
          
            <div
              className="
              absolute
              left-1/2
              top-[42%]
              h-[480px]
              w-[480px]
              -translate-x-1/2
              rounded-full
              bg-violet-400/15
              blur-[180px]
              animate-pulse
            "
              style={{
                animationDuration: "6s"
              }}
            />
          
            {/* Soft White */}
          
            <div
              className="
              absolute
              left-1/2
              top-[30%]
              h-[360px]
              w-[360px]
              -translate-x-1/2
              rounded-full
              bg-white/60
              blur-[90px]
            "
            />
          
          </div>
          
          {/* ================= AI ORB ================= */}
          
          <div className="relative flex h-[190px] w-[190px] items-center justify-center">
          
            {/* Glow */}
          
            <div className="absolute h-[210px] w-[210px] rounded-full bg-cyan-400/10 blur-[90px]" />
          
            {/* Rings */}
          
            <div className="absolute h-[180px] w-[180px] rounded-[42%] border border-cyan-300/20 animate-[spin_18s_linear_infinite]" />
          
            <div className="absolute h-[172px] w-[172px] rounded-[48%] border border-cyan-300/15 animate-[spin_13s_linear_infinite_reverse]" />
          
            <div className="absolute h-[164px] w-[164px] rounded-[45%] border border-violet-300/15 animate-[spin_9s_linear_infinite]" />
          
            {/* Core */}
          
            <div
              className="
              relative
              flex
              h-[104px]
              w-[104px]
              items-center
              justify-center
              rounded-full
              bg-gradient-to-br
              from-[#081B38]
              via-[#11274D]
              to-[#07101F]
              shadow-[0_20px_50px_rgba(0,0,0,.18)]
            "
            >
          
              <span className="text-[50px] text-cyan-300">
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
          
            {/* TYPE BUTTON */}

            <button
              onClick={() => setShowKeyboard(!showKeyboard)}
              className="
                mt-9
                h-[50px]
                rounded-full
                border
                border-slate-200
                bg-white/90
                px-8
                text-[15px]
                font-medium
                text-slate-700
                shadow-[0_8px_20px_rgba(15,23,42,.06)]
                backdrop-blur-xl
                transition-all
                hover:scale-[1.02]
                active:scale-95
              "
            >
              ⌨ Type instead
            </button>
            
            {/* FLOATING MIC */}
            
            {!showKeyboard && (
            
            <div className="fixed bottom-[108px] left-1/2 z-40 -translate-x-1/2">
            
            <button
            className="
            relative
            flex
            h-[84px]
            w-[84px]
            items-center
            justify-center
            rounded-full
            bg-gradient-to-br
            from-cyan-400
            via-sky-500
            to-blue-600
            shadow-[0_25px_60px_rgba(0,180,255,.38)]
            transition-all
            duration-300
            hover:scale-105
            active:scale-95
            "
            >
            
            {/* Outer Glow */}
            
            <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-2xl" />
            
            <div
            className="
            relative
            flex
            h-[84px]
            w-[84px]
            items-center
            justify-center
            rounded-full
            "
            >
            
            <Mic
            size={34}
            strokeWidth={2.4}
            className="text-white"
            />
            
            </div>
            
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
