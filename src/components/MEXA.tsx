import React from "react";

export default function MEXA() {
  return (
    <div className="flex h-full w-full bg-white dark:bg-[#0b0b0b]">

      {/* Sidebar */}
      <aside className="hidden w-72 border-r border-slate-200 lg:flex lg:flex-col">
        Sidebar
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col">

        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          Header
        </header>

        {/* Chat */}
        <section className="flex-1 overflow-y-auto">
          Chat
        </section>

        {/* Input */}
        <footer className="border-t border-slate-200 p-4">
          Input
        </footer>

      </main>

    </div>
  );
}
