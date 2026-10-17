import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Beaker,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  History,
  Lightbulb,
  Menu,
  Microscope,
  PenTool,
  Play,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';

type Mission = {
  title: string;
  discipline: string;
  description: string;
  action: string;
  icon: typeof BookOpen;
  accent: string;
};

const disciplines = ['All missions', 'Biography', 'Science', 'Business', 'Technology'];

const missions: Mission[] = [
  {
    title: 'Build a life story from evidence',
    discipline: 'Biography',
    description: 'Interview a person, verify three sources, and turn the evidence into a five-minute story.',
    action: 'Start interview plan',
    icon: BookOpen,
    accent: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    title: 'Test a claim with a mini experiment',
    discipline: 'Science',
    description: 'Form a hypothesis, design a fair test, capture observations, and defend your conclusion.',
    action: 'Open lab notebook',
    icon: FlaskConical,
    accent: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    title: 'Turn a problem into a service',
    discipline: 'Business',
    description: 'Talk to one real user, map the pain point, and sketch a useful offer with a simple price.',
    action: 'Map the opportunity',
    icon: Lightbulb,
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    title: 'Prototype a helpful tool',
    discipline: 'Technology',
    description: 'Define the user, build the smallest working version, and test it with someone outside your team.',
    action: 'Plan a prototype',
    icon: Microscope,
    accent: 'bg-blue-50 text-blue-700 border-blue-200',
  },
];

const steps = [
  ['01', 'Choose a mission', 'Pick a real question, person, or problem you care about.'],
  ['02', 'Make something', 'Collect evidence, run a test, interview, prototype, or teach it.'],
  ['03', 'Show your proof', 'Save your notes, decisions, results, and next improvement.'],
];

export default function CareerAIPage() {
  const [activeDiscipline, setActiveDiscipline] = useState('All missions');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [completed, setCompleted] = useState<string[]>([]);

  const filteredMissions = missions.filter((mission) => {
    const matchesDiscipline = activeDiscipline === 'All missions' || mission.discipline === activeDiscipline;
    const searchTarget = `${mission.title} ${mission.description} ${mission.discipline}`.toLowerCase();
    return matchesDiscipline && searchTarget.includes(query.toLowerCase());
  });

  const toggleComplete = (title: string) => {
    setCompleted((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-slate-950 pt-14 md:pt-16">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-14 left-0 z-40 w-72 border-r border-slate-200 bg-white p-5 transition-transform md:sticky md:top-16 md:block md:h-[calc(100vh-4rem)] md:translate-x-0`}>
          <div className="flex items-center justify-between md:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><Beaker className="h-5 w-5" /></div>
              <div><p className="font-bold">Practical Library</p><p className="text-xs text-slate-500">Learn by doing</p></div>
            </div>
            <button type="button" onClick={() => setSidebarOpen(false)} className="md:hidden" aria-label="Close library menu"><X className="h-5 w-5" /></button>
          </div>
          <nav className="mt-8 space-y-2">
            <p className="px-3 text-[11px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</p>
            <Link to="/career-ai" className="flex items-center gap-3 rounded-xl bg-slate-950 px-3 py-3 text-sm font-semibold text-white"><Play className="h-4 w-4" /> Missions</Link>
            <Link to="/ai/job-assistant" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"><PenTool className="h-4 w-4" /> Career tools</Link>
            <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"><History className="h-4 w-4" /> My evidence</button>
          </nav>
          <div className="mt-10 rounded-2xl bg-[#e9f4f0] p-4">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">This week</p>
            <p className="mt-2 text-2xl font-bold">{completed.length}/4</p>
            <p className="text-sm text-slate-600">missions completed</p>
            <div className="mt-3 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-emerald-600 transition-all" style={{ width: `${completed.length * 25}%` }} /></div>
          </div>
        </aside>
        {sidebarOpen && <button type="button" className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close library menu" />}

        <main className="min-w-0 flex-1 px-4 pb-16 sm:px-6 lg:px-10">
          <header className="flex items-center gap-3 py-5">
            <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg border border-slate-200 bg-white p-2 md:hidden" aria-label="Open library menu"><Menu className="h-5 w-5" /></button>
            <div className="flex-1"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">FaceMeX Library</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">Make knowledge useful.</h1></div>
            <Link to="/ai/resume" className="hidden items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white sm:flex">Build your profile <ArrowRight className="h-4 w-4" /></Link>
          </header>

          <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <div className="rounded-[28px] bg-[#162b27] p-6 text-white shadow-sm sm:p-9">
              <div className="max-w-xl"><p className="text-sm font-semibold text-emerald-300">A project studio for students</p><h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Stop collecting lessons. Start collecting proof.</h2><p className="mt-5 max-w-lg text-sm leading-6 text-white/70 sm:text-base">Turn biography, science, business, and technology into things you can show: an interview, an experiment, a prototype, a report, or a useful solution.</p></div>
              <div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={() => document.getElementById('missions')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-[#10231f]">Explore missions <ArrowRight className="h-4 w-4" /></button><Link to="/mexa" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white">Ask MEXA <Lightbulb className="h-4 w-4" /></Link></div>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center gap-2 text-slate-500"><Users className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-[.16em]">The practical loop</span></div><div className="mt-6 space-y-5">{steps.map(([number, title, description]) => <div key={number} className="flex gap-4"><span className="font-mono text-sm font-bold text-emerald-600">{number}</span><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div></div>)}</div></div>
          </section>

          <section id="missions" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">Choose your next build</p><h2 className="mt-1 text-2xl font-black">Practical missions</h2></div><label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:w-64"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search missions" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search missions" /></label></div>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{disciplines.map((discipline) => <button key={discipline} type="button" onClick={() => setActiveDiscipline(discipline)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${activeDiscipline === discipline ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>{discipline}</button>)}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{filteredMissions.map((mission) => { const Icon = mission.icon; const isComplete = completed.includes(mission.title); return <article key={mission.title} className="flex min-h-[270px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${mission.accent}`}><Icon className="h-5 w-5" /></div>{isComplete && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}</div><p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-slate-400">{mission.discipline}</p><h3 className="mt-2 text-lg font-bold leading-tight">{mission.title}</h3><p className="mt-3 flex-1 text-sm leading-5 text-slate-500">{mission.description}</p><button type="button" onClick={() => toggleComplete(mission.title)} className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"><span>{isComplete ? 'Mark unfinished' : mission.action}</span>{isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Plus className="h-4 w-4" />}</button></article>; })}</div>
            {filteredMissions.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No missions match that search yet.</div>}
          </section>
        </main>
      </div>
    </div>
  );
}
