import {
  Menu,
  SlidersHorizontal,
  Mic,
  ArrowUp,
} from "lucide-react";

export default function MEXA() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060D] text-white">

      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#04060D]" />

        <div className="absolute left-1/2 top-[38%] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[220px]" />
        <div className="absolute bottom-[-220px] left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[220px]" />
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-500/5 blur-[180px]" />

        <div className="absolute left-[18%] top-[20%] h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        <div className="absolute right-[22%] top-[30%] h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
        <div className="absolute left-[28%] bottom-[18%] h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/45" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">

        {/* Header */}
        <header className="relative flex items-center justify-between px-6 pt-12">

          <button className="flex h-11 w-11 items-center justify-center">
            <Menu size={28} />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <h1 className="text-[30px] font-extralight tracking-[0.35em]">
              MEXA
              <span className="ml-1 text-cyan-300">✦</span>
            </h1>

            <p className="mt-2 text-sm text-white/45">
              Your AI Life Operating System
            </p>
          </div>

          <button className="flex h-11 w-11 items-center justify-center">
            <SlidersHorizontal size={24} />
          </button>

        </header>

        {/* Hero */}
        <div className="mt-16 flex flex-col items-center">

          <div className="relative flex h-[280px] w-[280px] items-center justify-center">

            <div className="absolute h-full w-full rounded-full bg-cyan-500/20 blur-[90px]" />

            <div className="absolute h-[210px] w-[210px] animate-[spin_16s_linear_infinite] rounded-[42%] border border-cyan-300/35" />

            <div className="absolute h-[210px] w-[210px] animate-[spin_10s_linear_infinite_reverse] rounded-[38%] border border-blue-400/35" />

            <div className="absolute h-[210px] w-[210px] animate-[spin_7s_linear_infinite] rounded-[46%] border border-indigo-400/35" />

            <div className="relative flex h-[150px] w-[150px] items-center justify-center rounded-full bg-gradient-to-br from-[#071323] via-[#101c38] to-[#060b15]">

              <div className="absolute h-24 w-24 rounded-full bg-cyan-300/10 blur-3xl" />

              <span className="text-7xl text-cyan-300">
                ✦
              </span>

            </div>

          </div>

          {/* Voice Wave */}
          <div className="mt-10 flex gap-2">
            {[8,14,20,28,40,28,20,14,8].map((h,i)=>(
              <span
                key={i}
                className="w-[4px] rounded-full bg-cyan-300 animate-pulse"
                style={{
                  height:`${h}px`,
                  animationDelay:`${i*120}ms`
                }}
              />
            ))}
          </div>

          <h2 className="mt-10 text-center text-5xl font-light">
            I'm listening...
          </h2>

          <p className="mt-3 text-center text-2xl text-white/55">
            How can I help you today?
          </p>

        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Input */}
        <div className="px-6 pb-8">

          <div className="flex items-center rounded-full border border-white/10 bg-white/5 backdrop-blur-xl">

            <button className="ml-2 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white">
              <Mic size={22} />
            </button>

            <input
              placeholder="Ask MEXA anything..."
              className="flex-1 bg-transparent px-4 text-white placeholder:text-white/35 outline-none"
            />

            <button className="mr-2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black">
              <ArrowUp size={18} />
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
