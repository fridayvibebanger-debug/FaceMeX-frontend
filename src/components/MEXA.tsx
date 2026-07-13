import {
  Sparkles,
  Briefcase,
  GraduationCap,
  Building2,
  Menu,
  SlidersHorizontal,
  ArrowUp,
} from "lucide-react";

export default function MEXA() {
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

      <div className="flex flex-1 flex-col items-center px-6 pt-5 pb-36">

        {/* ORB */}
        <div className="relative mt-4 flex h-[220px] w-[220px] items-center justify-center">
      
          {/* Glow */}
          <div className="absolute h-[220px] w-[220px] rounded-full bg-cyan-400/10 blur-[80px]" />
          <div className="absolute h-[150px] w-[150px] rounded-full bg-violet-500/10 blur-[60px]" />
      
          {/* Rings */}
          <div className="absolute h-[185px] w-[185px] rounded-[42%] border border-cyan-300/25 animate-[spin_18s_linear_infinite]" />
          <div className="absolute h-[178px] w-[178px] rounded-[48%] border border-cyan-400/20 animate-[spin_12s_linear_infinite_reverse]" />
          <div className="absolute h-[170px] w-[170px] rounded-[38%] border border-indigo-400/20 animate-[spin_8s_linear_infinite]" />
      
          {/* Core */}
          <div className="relative flex h-[118px] w-[118px] items-center justify-center rounded-full bg-gradient-to-br from-[#071424] via-[#101C38] to-[#050B16] shadow-[0_0_40px_rgba(0,220,255,.25)]">
      
            <div className="absolute h-20 w-20 rounded-full bg-cyan-300/10 blur-3xl" />
      
            <span className="text-[54px] text-cyan-300 drop-shadow-[0_0_20px_rgba(0,255,255,.8)]">
              ✦
            </span>
      
          </div>
      
        </div>
      
        {/* Voice Wave */}
      
        <div className="mt-6 flex items-end gap-[4px]">
          {[10,16,24,36,48,36,24,16,10].map((h,i)=>(
            <span
              key={i}
              className="w-[4px] rounded-full bg-cyan-300 animate-pulse"
              style={{
                height:h,
                animationDelay:`${i*0.1}s`
              }}
            />
          ))}
        </div>
      
        {/* Text */}
      
        <h2 className="mt-8 text-center text-[38px] font-extralight leading-none text-white">
            I'm listening...
        </h2>
      
        <p className="mt-3 max-w-[280px] text-center text-[16px] leading-7 text-white/50">
            How can I help you today?
        </p>
      
        {/* Type Button */}
      
        <button
          className="
            mt-8
            rounded-full
            border
            border-white/10
            bg-white/5
            px-7
            py-3
            text-sm
            text-white/70
            backdrop-blur-xl
          "
        >
            Type instead
        </button>
      
      </div>
      
          {/* ================= INPUT BAR ================= */}

          <div className="fixed bottom-[86px] left-0 right-0 z-40 px-5">
            <div className="mx-auto flex max-w-md items-center rounded-full border border-white/10 bg-[#111827]/80 px-5 py-3 backdrop-blur-2xl">
              <input
                type="text"
                placeholder="Ask MEXA anything..."
                className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/35 outline-none"
              />
          
              <button className="ml-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(0,255,255,.45)]">
                <ArrowUp className="h-5 w-5 text-[#041018]" />
              </button>
            </div>
          </div>
          
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
