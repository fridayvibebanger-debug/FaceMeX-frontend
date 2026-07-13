import {
  Menu,
  SlidersHorizontal,
  Mic,
  Sparkles,
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

        <header className="flex items-center justify-between px-6 pt-14">

          <button className="flex h-11 w-11 items-center justify-center">

            <Menu size={30} strokeWidth={2} />

          </button>

          <div className="text-center">

            <h1 className="text-[30px] font-extralight tracking-[0.34em]">

              MEXA

            </h1>

            <p className="mt-2 text-sm text-white/45">

              Your AI Life Operating System

            </p>

          </div>

          <button className="flex h-11 w-11 items-center justify-center">

            <SlidersHorizontal size={24} strokeWidth={2} />

          </button>

        </header>

        {/* HERO */}
    <div className="flex flex-1 flex-col items-center justify-center px-6">
    
      {/* ================= ORB ================= */}
      <div className="relative flex h-[330px] w-[330px] items-center justify-center">
    
        {/* Main Glow */}
        <div className="absolute h-[330px] w-[330px] rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute h-[250px] w-[250px] rounded-full bg-violet-500/15 blur-[90px]" />
    
        {/* Ring 1 */}
        <div
          className="
            absolute
            h-[255px]
            w-[255px]
            rounded-[42%]
            border
            border-cyan-300/35
            animate-[spin_18s_linear_infinite]
          "
        />
    
        {/* Ring 2 */}
        <div
          className="
            absolute
            h-[248px]
            w-[248px]
            rounded-[48%]
            border
            border-cyan-400/25
            animate-[spin_12s_linear_infinite_reverse]
          "
        />
    
        {/* Ring 3 */}
        <div
          className="
            absolute
            h-[240px]
            w-[240px]
            rounded-[38%]
            border
            border-indigo-400/30
            animate-[spin_8s_linear_infinite]
          "
        />
    
        {/* Floating Energy */}
        <div className="absolute h-[210px] w-[210px] rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />
        <div className="absolute h-[170px] w-[170px] rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
    
        {/* Glass Core */}
        <div
          className="
            relative
            flex
            h-[165px]
            w-[165px]
            items-center
            justify-center
            rounded-full
            bg-gradient-to-br
            from-[#071424]
            via-[#101C38]
            to-[#050B16]
            shadow-[0_0_80px_rgba(0,220,255,.28)]
          "
        >
          {/* Inner Glow */}
          <div className="absolute h-28 w-28 rounded-full bg-cyan-300/10 blur-3xl" />
    
          {/* Glass Reflection */}
          <div className="absolute left-7 top-7 h-10 w-5 rotate-[-25deg] rounded-full bg-white/10 blur-md" />
    
          {/* Logo */}
          <span className="text-[74px] text-cyan-300 drop-shadow-[0_0_35px_rgba(0,255,255,.9)]">
            ✦
          </span>
        </div>
    
      </div>
    
      {/* ================= END ORB ================= */}
    
      {/* ================= VOICE WAVE ================= */}

      <div className="mt-4 flex items-center justify-center gap-[5px]">
        {[10, 18, 28, 40, 56, 40, 28, 18, 10].map((h, i) => (
          <span
            key={i}
            className="w-[4px] rounded-full bg-cyan-300 animate-pulse"
            style={{
              height: `${h}px`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      
      {/* ================= TEXT ================= */}
      
      <h2 className="mt-10 text-center text-[44px] font-extralight leading-none tracking-tight text-white">
        I'm listening...
      </h2>
      
      <p className="mt-4 max-w-[280px] text-center text-[19px] font-light leading-relaxed text-white/50">
        How can I help you today?
      </p>
      
      {/* ================= MICROPHONE ================= */}

      <div className="mt-14 flex justify-center">
        <button
          className="
            relative
            flex
            h-[92px]
            w-[92px]
            items-center
            justify-center
            rounded-full
            bg-gradient-to-br
            from-cyan-400
            via-cyan-500
            to-blue-500
            shadow-[0_0_70px_rgba(0,255,255,.55)]
            transition-all
            duration-300
            hover:scale-105
            active:scale-95
          "
        >
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl" />
      
          <Mic
            className="relative h-10 w-10 text-white"
            strokeWidth={2.3}
          />
        </button>
      </div>
      
      {/* ================= KEYBOARD ================= */}
      
      <div className="mt-8 flex justify-center">
        <button
          className="
            rounded-full
            border
            border-white/10
            bg-white/5
            px-8
            py-3
            text-sm
            font-medium
            text-white/70
            backdrop-blur-xl
            transition-all
            hover:bg-white/10
          "
        >
          Type instead
        </button>
      </div>
      
      {/* ================= INPUT BAR ================= */}
      
      <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-center px-5">
        <div
          className="
            flex
            w-full
            max-w-md
            items-center
            gap-3
            rounded-full
            border
            border-white/10
            bg-white/5
            px-5
            py-4
            backdrop-blur-3xl
            shadow-[0_0_40px_rgba(0,0,0,.35)]
          "
        >
          <input
            type="text"
            placeholder="Ask MEXA anything..."
            className="
              flex-1
              bg-transparent
              text-[15px]
              text-white
              placeholder:text-white/35
              outline-none
            "
          />
      
          <button
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              bg-cyan-400
              text-[#041018]
              shadow-[0_0_25px_rgba(0,255,255,.45)]
              transition
              hover:scale-105
              active:scale-95
            "
          >
            <ArrowUp size={18} strokeWidth={2.8} />
          </button>
        </div>
      </div>
      
      {/* Bottom Spacer */}
      
      <div className="h-40" />

      </div> {/* END HERO */}
      
      {/* ================= BOTTOM NAVIGATION ================= */}
      
      <nav
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-50
          border-t
          border-white/10
          bg-black/40
          backdrop-blur-3xl
        "
      >
        <div className="mx-auto flex h-24 max-w-md items-center justify-around">
      
          <button className="flex flex-col items-center gap-1 text-cyan-300">
            <Sparkles size={22} />
            <span className="text-[11px] font-medium">
              MEXA
            </span>
          </button>
      
          <button className="flex flex-col items-center gap-1 text-white/50">
            <ArrowUp size={22} />
            <span className="text-[11px]">
              History
            </span>
          </button>
      
          <button className="flex flex-col items-center gap-1 text-white/50">
            <SlidersHorizontal size={22} />
            <span className="text-[11px]">
              Settings
            </span>
          </button>
      
        </div>
      </nav>
      
      </section>
      
      {/* Overlay */}
      
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
      
      </main>
      );
      }
