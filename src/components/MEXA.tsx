import { Menu, SlidersHorizontal } from "lucide-react";

export default function MEXA() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#04060D] text-white">

      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">

        {/* Main */}
        <div className="absolute inset-0 bg-[#04060D]" />

        {/* Cyan Glow */}
        <div className="absolute left-1/2 top-[36%] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[180px]" />

        {/* Purple Glow */}
        <div className="absolute bottom-[-220px] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[180px]" />

        {/* Top Glow */}
        <div className="absolute left-1/2 top-[-160px] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[140px]" />

        {/* Stars */}

        <div className="absolute left-[18%] top-[22%] h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />

        <div className="absolute right-[15%] top-[18%] h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />

        <div className="absolute right-[26%] top-[48%] h-1 w-1 rounded-full bg-cyan-300/60" />

        <div className="absolute left-[12%] bottom-[28%] h-1 w-1 rounded-full bg-cyan-300/60" />

        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-transparent to-black/45" />

      </div>

      {/* Content */}

      <section className="relative z-10 flex h-full flex-col">

        {/* Header */}

        <header className="flex items-center justify-between px-6 pt-14">

          <button className="flex h-11 w-11 items-center justify-center">

            <Menu
              size={28}
              strokeWidth={2}
            />

          </button>

          <div className="text-center">

            <h1 className="text-[30px] font-extralight tracking-[0.38em]">

              MEXA

            </h1>

            <p className="mt-2 text-sm text-white/45">

              Your AI Life Operating System

            </p>

          </div>

          <button className="flex h-11 w-11 items-center justify-center">

            <SlidersHorizontal
              size={24}
              strokeWidth={2}
            />

          </button>

        </header>

        {/* Orb goes here */}

      {/* ================= ORB ================= */}

      <div className="mt-12 flex flex-col items-center">
      
        <div className="relative flex h-[330px] w-[330px] items-center justify-center">
      
          {/* Background Glow */}
          <div className="absolute h-[320px] w-[320px] rounded-full bg-cyan-400/10 blur-[120px]" />
      
          <div className="absolute h-[250px] w-[250px] rounded-full bg-violet-500/15 blur-[100px]" />
      
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
            h-[250px]
            w-[250px]
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
            h-[245px]
            w-[245px]
            rounded-[40%]
            border
            border-indigo-400/30
            animate-[spin_8s_linear_infinite]
            "
          />
      
          {/* Floating blobs */}
      
          <div
            className="
            absolute
            h-[210px]
            w-[210px]
            rounded-full
            bg-cyan-400/10
            blur-3xl
            animate-pulse
            "
          />
      
          <div
            className="
            absolute
            h-[180px]
            w-[180px]
            rounded-full
            bg-blue-400/10
            blur-3xl
            animate-pulse
            "
          />
      
          {/* Core */}
      
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
            from-[#081322]
            via-[#111D39]
            to-[#050C17]
            shadow-[0_0_90px_rgba(0,220,255,.30)]
            "
          >
      
            {/* Inner Glow */}
      
            <div className="absolute h-28 w-28 rounded-full bg-cyan-300/10 blur-3xl" />
      
            {/* Glass Reflection */}
      
            <div className="absolute left-8 top-7 h-10 w-6 rotate-[-25deg] rounded-full bg-white/10 blur-md" />
      
            {/* Logo */}
            <span className="text-[74px] text-cyan-300 drop-shadow-[0_0_35px_rgba(0,255,255,.9)]">
              ✦
            </span>
  
          </div>
        </div>
  
        {/* =============== END ORB =============== */}
  
        {/* Voice Wave */}
        <div className="mt-2 flex items-center justify-center gap-[5px]">
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
  
        {/* Text */}
        <h2 className="mt-10 text-center text-[46px] font-extralight tracking-tight text-white">
          I'm listening...
        </h2>
  
        <p className="mt-3 text-center text-xl font-light text-white/50">
          How can I help you today?
        </p>
        
        {/* Floating Microphone */}
        <div className="mt-14 flex justify-center">
          <button
            className="
              flex h-[88px] w-[88px]
              items-center justify-center
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
            <Mic
              className="h-10 w-10 text-white"
              strokeWidth={2.2}
            />
          </button>
        </div>
        
        {/* Keyboard Button */}
        <div className="mt-8 flex justify-center">
          <button
            className="
              rounded-full
              border border-white/10
              bg-white/5
              px-7
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
        
        {/* Bottom Spacer */}
        <div className="h-36" />
        
        {/* Bottom Navigation */}
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
        
        </main>
      </div>
  
    {/* Background overlay */}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
  
  </div>
  );
  }
