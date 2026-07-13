import {
  Menu,
  SlidersHorizontal,
  Mic,
  Sparkles,
  ArrowUp,
} from "lucide-react";

export default function MEXA() {
  // Hooks
  // State
  // Effects
  // Functions

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060D] text-white">
 
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">

        <div className="absolute inset-0 bg-[#04060D]" />
      
        {/* Blue glow */}
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[180px]" />
      
        {/* Purple glow */}
        <div className="absolute bottom-[-150px] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[180px]" />
      
        {/* Small floating lights */}
        <div className="absolute left-[18%] top-[20%] h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
      
        <div className="absolute right-[22%] top-[32%] h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
      
        <div className="absolute bottom-[28%] left-[30%] h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
      
      <div className="relative z-10">
        
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10">

        <button className="text-white">
          <Menu size={28} />
        </button>
  
        <div className="text-center">
          <h1 className="text-[30px] font-light tracking-[0.35em]">
            MEXA
          </h1>
  
          <p className="mt-1 text-sm text-white/45">
            Your AI Life Operating System
          </p>
        </div>
  
        <button className="text-white">
          <SlidersHorizontal size={24} />
        </button>
  
      </header>

      {/* Hero */}
      <div className="mt-14 flex flex-col items-center justify-center">

        {/* Outer Glow */}
        <div className="relative flex h-[230px] w-[230px] items-center justify-center">
        
          {/* Blue Glow */}
          <div className="absolute h-full w-full rounded-full bg-cyan-500/20 blur-[90px] animate-pulse" />
  
          {/* Purple Glow */}
          <div className="absolute h-[180px] w-[180px] rounded-full bg-violet-500/20 blur-[70px]" />
            
          {/* Animated Orb */}
          <div className="relative flex h-[160px] w-[160px] items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-[#091A2E] via-[#101A3A] to-[#0A1020] shadow-[0_0_80px_rgba(0,220,255,0.35)]">
    
            <div className="absolute inset-2 rounded-full border border-cyan-300/20" />
      
            <div className="absolute h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl" />
      
            <span className="text-6xl font-light text-cyan-300">
              ✦
            </span>
      
          </div>
      
        </div>

       {/* Listening Text */}
        <p className="mt-10 text-cyan-300 text-lg font-medium">
          I'm listening...
        </p>
      
        <h2 className="mt-2 max-w-md text-center text-3xl font-light leading-tight text-white">
          How can I help you today?
        </h2>
      
      </div>

      {/* Wave Animation */}

      {/* Microphone */}

      {/* Keyboard Button */}

      {/* Bottom Navigation */}

      {/* Drawer */}

      {/* Settings */}

      </div> {/* relative z-10 */}

    </div> {/* absolute background */}

  </div> {/* page */}

);
}
