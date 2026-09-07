import { useMemo, useState } from 'react';
import {
  Atom,
  Award,
  Beaker,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle,
  Clock,
  Dna,
  FlaskConical,
  Globe,
  GraduationCap,
  Microscope,
  Play,
  Search,
  Sparkles,
  Telescope,
  Zap,
} from 'lucide-react';

type Subject = 'biology' | 'chemistry' | 'physics' | 'mathematics' | 'environment' | 'engineering';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type LabVariable = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
};

type Lab = {
  id: string;
  name: string;
  description: string;
  subject: Subject;
  difficulty: Difficulty;
  duration: number;
  completed: boolean;
  badge: string;
  theory: string;
  objective: string;
  variables: LabVariable[];
  prediction: string;
};

type SubjectCard = {
  id: Subject;
  name: string;
  icon: typeof Atom;
  description: string;
  accent: string;
  labs: Lab[];
};

const subjectCards: SubjectCard[] = [
  {
    id: 'biology',
    name: 'Biology',
    icon: Dna,
    description: 'Cells, genetics, ecosystems, and living systems',
    accent: 'from-emerald-500/30 via-emerald-500/10 to-transparent',
    labs: [
      {
        id: 'gene-expression',
        name: 'Gene Expression Lab',
        description: 'Observe how transcription factors drive expression under different conditions.',
        subject: 'biology',
        difficulty: 'beginner',
        duration: 18,
        completed: true,
        badge: 'Molecular biology',
        theory: 'Gene expression is regulated by signals, promoter activity, and environmental conditions.',
        objective: 'Optimize the expression rate by adjusting transcription and nutrient levels.',
        prediction: 'Higher promoter activity and nutrient availability will increase RNA output.',
        variables: [
          { key: 'promoter', label: 'Promoter strength', min: 10, max: 100, step: 5, value: 72, unit: '%' },
          { key: 'nutrient', label: 'Nutrient supply', min: 0, max: 100, step: 5, value: 58, unit: '%' },
          { key: 'temperature', label: 'Temperature', min: 15, max: 45, step: 1, value: 29, unit: '°C' },
        ],
      },
      {
        id: 'osmosis',
        name: 'Osmosis & Cell Balance',
        description: 'Track how membrane permeability changes water movement across cells.',
        subject: 'biology',
        difficulty: 'intermediate',
        duration: 22,
        completed: false,
        badge: 'Cell biology',
        theory: 'Water moves across semipermeable membranes from low solute concentration to high solute concentration.',
        objective: 'Measure how solute concentration affects cell volume and equilibrium.',
        prediction: 'The more concentrated the external solution, the greater the cell shrinkage.',
        variables: [
          { key: 'solute', label: 'External solute', min: 0, max: 100, step: 5, value: 35, unit: '%' },
          { key: 'membrane', label: 'Membrane permeability', min: 10, max: 100, step: 5, value: 68, unit: '%' },
          { key: 'time', label: 'Exposure time', min: 1, max: 30, step: 1, value: 12, unit: 'min' },
        ],
      },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: Beaker,
    description: 'Molecules, reactions, and equilibrium',
    accent: 'from-sky-500/30 via-sky-500/10 to-transparent',
    labs: [
      {
        id: 'titration',
        name: 'Acid–Base Titration',
        description: 'Determine the concentration of an unknown solution by titration.',
        subject: 'chemistry',
        difficulty: 'intermediate',
        duration: 24,
        completed: false,
        badge: 'Analytical chemistry',
        theory: 'The endpoint of a titration marks the moment the acid and base have neutralized each other.',
        objective: 'Calculate the concentration of the unknown solution from a neutralization curve.',
        prediction: 'As titrant is added, pH rises sharply near the equivalence point.',
        variables: [
          { key: 'volume', label: 'Titrant volume', min: 0, max: 50, step: 1, value: 18, unit: 'mL' },
          { key: 'concentration', label: 'Titrant concentration', min: 0.05, max: 1, step: 0.05, value: 0.35, unit: 'M' },
          { key: 'ph', label: 'Solution pH', min: 1, max: 14, step: 0.5, value: 7, unit: 'pH' },
        ],
      },
      {
        id: 'kinetics',
        name: 'Reaction Kinetics',
        description: 'Measure the speed of a reaction under changing temperature and catalysts.',
        subject: 'chemistry',
        difficulty: 'advanced',
        duration: 27,
        completed: false,
        badge: 'Physical chemistry',
        theory: 'Reaction rate depends on temperature, particle collision frequency, and activation energy.',
        objective: 'Identify which conditions accelerate the reaction most efficiently.',
        prediction: 'Higher temperature and a catalyst will reduce activation energy and speed up the reaction.',
        variables: [
          { key: 'temperature', label: 'Temperature', min: 20, max: 90, step: 2, value: 56, unit: '°C' },
          { key: 'catalyst', label: 'Catalyst level', min: 0, max: 100, step: 5, value: 70, unit: '%' },
          { key: 'pressure', label: 'Pressure', min: 1, max: 5, step: 0.2, value: 2.4, unit: 'atm' },
        ],
      },
    ],
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: Zap,
    description: 'Motion, energy, waves, and force systems',
    accent: 'from-violet-500/30 via-violet-500/10 to-transparent',
    labs: [
      {
        id: 'projectile',
        name: 'Projectile Motion Lab',
        description: 'Model launch angle and initial velocity to predict flight path.',
        subject: 'physics',
        difficulty: 'beginner',
        duration: 16,
        completed: true,
        badge: 'Mechanics',
        theory: 'Projectile motion combines horizontal motion and vertical acceleration under gravity.',
        objective: 'Find the angle that maximizes horizontal range for a fixed launch speed.',
        prediction: 'The range increases to a maximum near 45° when air resistance is negligible.',
        variables: [
          { key: 'velocity', label: 'Launch velocity', min: 10, max: 80, step: 2, value: 42, unit: 'm/s' },
          { key: 'angle', label: 'Launch angle', min: 15, max: 75, step: 5, value: 46, unit: '°' },
          { key: 'gravity', label: 'Gravity', min: 1, max: 20, step: 0.5, value: 9.8, unit: 'm/s²' },
        ],
      },
      {
        id: 'waves',
        name: 'Wave Interference Sandbox',
        description: 'Compare constructive and destructive interference patterns.',
        subject: 'physics',
        difficulty: 'intermediate',
        duration: 21,
        completed: false,
        badge: 'Wave physics',
        theory: 'When two waves overlap, they superimpose and can amplify or cancel depending on phase.',
        objective: 'Adjust frequency and phase to see how interference changes the pattern.',
        prediction: 'Aligned waves produce higher amplitude, while out-of-phase waves reduce amplitude.',
        variables: [
          { key: 'frequency', label: 'Frequency', min: 20, max: 200, step: 5, value: 92, unit: 'Hz' },
          { key: 'phase', label: 'Phase shift', min: 0, max: 180, step: 5, value: 44, unit: '°' },
          { key: 'amplitude', label: 'Wave amplitude', min: 0.5, max: 5, step: 0.25, value: 2.1, unit: 'm' },
        ],
      },
    ],
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: Calculator,
    description: 'Functions, calculus, and model building',
    accent: 'from-amber-500/30 via-amber-500/10 to-transparent',
    labs: [
      {
        id: 'derivatives',
        name: 'Derivative Explorer',
        description: 'Visualize how slope changes as a function moves across the graph.',
        subject: 'mathematics',
        difficulty: 'intermediate',
        duration: 19,
        completed: false,
        badge: 'Calculus',
        theory: 'The derivative measures the instantaneous rate of change of a function at any point.',
        objective: 'Use tangent slope to explain how a polynomial changes as x increases.',
        prediction: 'The slope becomes steeper where the function curves more sharply.',
        variables: [
          { key: 'x', label: 'Input value x', min: -10, max: 10, step: 0.5, value: 2.5, unit: 'units' },
          { key: 'a', label: 'Coefficient a', min: 0.5, max: 5, step: 0.25, value: 2.75, unit: 'n/a' },
          { key: 'b', label: 'Shift b', min: -5, max: 5, step: 0.25, value: 1.5, unit: 'units' },
        ],
      },
      {
        id: 'vector',
        name: 'Vector Space Studio',
        description: 'Add and transform vectors to understand direction and magnitude.',
        subject: 'mathematics',
        difficulty: 'advanced',
        duration: 25,
        completed: false,
        badge: 'Linear algebra',
        theory: 'Vectors combine direction and magnitude, allowing many physical and geometric systems to be modeled.',
        objective: 'Calculate the resulting vector and interpret its angle and length.',
        prediction: 'The combined vector length is the square root of the sum of squared component contributions.',
        variables: [
          { key: 'vx', label: 'X component', min: -20, max: 20, step: 1, value: 7, unit: 'u' },
          { key: 'vy', label: 'Y component', min: -20, max: 20, step: 1, value: 12, unit: 'u' },
          { key: 'scale', label: 'Scale factor', min: 0.5, max: 3, step: 0.1, value: 1.4, unit: 'x' },
        ],
      },
    ],
  },
  {
    id: 'environment',
    name: 'Environmental Science',
    icon: Globe,
    description: 'Ecosystems, resource cycles, and sustainability',
    accent: 'from-teal-500/30 via-teal-500/10 to-transparent',
    labs: [
      {
        id: 'carbon-cycle',
        name: 'Carbon Cycle Tracker',
        description: 'Monitor how carbon moves through land, water, and atmosphere.',
        subject: 'environment',
        difficulty: 'beginner',
        duration: 17,
        completed: false,
        badge: 'Earth systems',
        theory: 'Carbon cycles through the atmosphere, biosphere, oceans, and geosphere in feedback-driven systems.',
        objective: 'Identify the effect of increased CO₂ on ecosystem balance.',
        prediction: 'More atmospheric carbon tends to raise warming and alter plant growth patterns.',
        variables: [
          { key: 'co2', label: 'CO₂ level', min: 300, max: 1000, step: 25, value: 420, unit: 'ppm' },
          { key: 'forest', label: 'Forest cover', min: 10, max: 100, step: 5, value: 62, unit: '%' },
          { key: 'water', label: 'Water availability', min: 10, max: 100, step: 5, value: 54, unit: '%' },
        ],
      },
      {
        id: 'biodiversity',
        name: 'Biodiversity Balance',
        description: 'Test how species loss affects ecosystem resilience.',
        subject: 'environment',
        difficulty: 'advanced',
        duration: 28,
        completed: false,
        badge: 'Ecology',
        theory: 'Biodiversity strengthens ecosystem resilience by creating more pathways for energy and nutrient flow.',
        objective: 'Predict which species losses damage the system most severely.',
        prediction: 'Removing key producers or predators destabilizes the whole food web.',
        variables: [
          { key: 'species', label: 'Species richness', min: 5, max: 50, step: 2, value: 22, unit: 'species' },
          { key: 'habitat', label: 'Habitat quality', min: 20, max: 100, step: 5, value: 70, unit: '%' },
          { key: 'stress', label: 'Environmental stress', min: 0, max: 100, step: 5, value: 38, unit: '%' },
        ],
      },
    ],
  },
  {
    id: 'engineering',
    name: 'Engineering',
    icon: FlaskConical,
    description: 'Design, systems thinking, and applied problem solving',
    accent: 'from-rose-500/30 via-rose-500/10 to-transparent',
    labs: [
      {
        id: 'bridge',
        name: 'Bridge Load Test',
        description: 'Study how loads and materials affect structural stability.',
        subject: 'engineering',
        difficulty: 'beginner',
        duration: 20,
        completed: false,
        badge: 'Structural engineering',
        theory: 'Bridges spread weight across beams and supports to reduce stress at any single point.',
        objective: 'Find the material and span configuration that minimizes bending strain.',
        prediction: 'Shorter spans and stronger supports produce lower deformation.',
        variables: [
          { key: 'span', label: 'Bridge span', min: 5, max: 30, step: 1, value: 18, unit: 'm' },
          { key: 'load', label: 'Load weight', min: 1, max: 40, step: 1, value: 16, unit: 'kN' },
          { key: 'strength', label: 'Material strength', min: 20, max: 100, step: 5, value: 72, unit: '%' },
        ],
      },
      {
        id: 'circuits',
        name: 'Circuit Design Lab',
        description: 'Model current and voltage behavior in a simple circuit.',
        subject: 'engineering',
        difficulty: 'intermediate',
        duration: 23,
        completed: false,
        badge: 'Electrical systems',
        theory: 'Current flows along closed paths and depends on resistance, voltage, and power draw.',
        objective: 'Balance supply, load, and component choices to keep the circuit efficient.',
        prediction: 'Higher voltage with optimized resistance reduces power loss across the system.',
        variables: [
          { key: 'voltage', label: 'Voltage', min: 1, max: 24, step: 1, value: 12, unit: 'V' },
          { key: 'resistance', label: 'Resistance', min: 10, max: 200, step: 5, value: 58, unit: 'Ω' },
          { key: 'load', label: 'Load demand', min: 5, max: 100, step: 5, value: 35, unit: '%' },
        ],
      },
    ],
  },
];

const difficultyColors: Record<Difficulty, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

const subjectLookup = Object.fromEntries(subjectCards.map((subject) => [subject.id, subject])) as Record<
  Subject,
  SubjectCard
>;

export default function PracticalLabLibrary() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | Difficulty>('all');

  const visibleSubjects = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return subjectCards.filter((subject) => {
      const matchesSubject = !normalized ||
        subject.name.toLowerCase().includes(normalized) ||
        subject.description.toLowerCase().includes(normalized) ||
        subject.labs.some((lab) => lab.name.toLowerCase().includes(normalized) || lab.description.toLowerCase().includes(normalized));

      const matchesDifficulty = filterDifficulty === 'all' || subject.labs.some((lab) => lab.difficulty === filterDifficulty);
      return matchesSubject && matchesDifficulty;
    });
  }, [searchTerm, filterDifficulty]);

  const selectedSubjectData = selectedSubject ? subjectLookup[selectedSubject] : null;

  const visibleLabs = useMemo(() => {
    const base = selectedSubjectData ? selectedSubjectData.labs : visibleSubjects.flatMap((subject) => subject.labs);

    return base.filter((lab) => {
      const matchesSearch = !searchTerm ||
        lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lab.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lab.theory.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = filterDifficulty === 'all' || lab.difficulty === filterDifficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [selectedSubjectData, visibleSubjects, searchTerm, filterDifficulty]);

  const activeLab = useMemo(() => {
    if (selectedLabId) {
      return visibleLabs.find((lab) => lab.id === selectedLabId) ?? visibleLabs[0] ?? null;
    }

    return visibleLabs[0] ?? null;
  }, [selectedLabId, visibleLabs]);

  const [labValues, setLabValues] = useState<Record<string, Record<string, number>>>({});

  const updateVariable = (labId: string, key: string, nextValue: number) => {
    setLabValues((current) => ({
      ...current,
      [labId]: {
        ...(current[labId] ?? {}),
        [key]: nextValue,
      },
    }));
  };

  const getLabValue = (labId: string, key: string, fallback: number) => {
    return labValues[labId]?.[key] ?? fallback;
  };

  const totalCompleted = subjectCards.reduce((sum, subject) => sum + subject.labs.filter((lab) => lab.completed).length, 0);
  const totalLabs = subjectCards.reduce((sum, subject) => sum + subject.labs.length, 0);
  const progress = Math.round((totalCompleted / totalLabs) * 100);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-16 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                <GraduationCap className="h-3.5 w-3.5" />
                Practical university learning lab
              </div>
              <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
                <Microscope className="h-8 w-8 text-blue-600" />
                STEM Simulation Library
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                Learn theory by experimenting with real scientific and mathematical systems. Each lab connects concept, practice, and measurable outcomes for college and university students.
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="text-3xl font-bold text-blue-600">{progress}%</div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Completed</div>
              </div>
              <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <div className="text-lg font-semibold">{totalCompleted}/{totalLabs}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Labs</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search biology, chemistry, maths, physics..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <select
              value={filterDifficulty}
              onChange={(event) => setFilterDifficulty(event.target.value as 'all' | Difficulty)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!selectedSubject ? (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold sm:text-2xl">Discipline pathways</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Choose a subject to explore hands-on experiments and concept labs.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleSubjects.map((subject) => {
                const Icon = subject.icon;
                const completed = subject.labs.filter((lab) => lab.completed).length;

                return (
                  <button
                    key={subject.id}
                    onClick={() => {
                      setSelectedSubject(subject.id);
                      setSelectedLabId(subject.labs[0]?.id ?? null);
                    }}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className={`bg-gradient-to-br ${subject.accent} p-5`}>
                      <div className="flex items-center justify-between">
                        <div className="rounded-2xl bg-white/80 p-3 text-slate-900 shadow-sm dark:bg-slate-900/80 dark:text-white">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          {completed}/{subject.labs.length}
                        </div>
                      </div>
                      <h3 className="mt-5 text-2xl font-bold">{subject.name}</h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subject.description}</p>
                    </div>
                    <div className="space-y-3 p-5">
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
                          style={{ width: `${(completed / subject.labs.length) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>{subject.labs.length} labs</span>
                        <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                          Open lab <Sparkles className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => setSelectedSubject(null)}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                ← Back to disciplines
              </button>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <BookOpen className="h-3.5 w-3.5" />
                {selectedSubjectData?.name}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {visibleLabs.map((lab) => (
                  <button
                    key={lab.id}
                    onClick={() => setSelectedLabId(lab.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      activeLab?.id === lab.id
                        ? 'border-blue-500 bg-blue-50/80 dark:border-blue-500 dark:bg-blue-950/30'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{lab.name}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{lab.badge}</p>
                      </div>
                      {lab.completed && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-1 font-medium ${difficultyColors[lab.difficulty]}`}>
                        {lab.difficulty}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Clock className="h-3 w-3" />
                        {lab.duration} min
                      </span>
                    </div>
                  </button>
                ))}
              </aside>

              {activeLab ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        <Atom className="h-3.5 w-3.5" />
                        {activeLab.badge}
                      </div>
                      <h3 className="text-2xl font-bold">{activeLab.name}</h3>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">
                      <Play className="h-4 w-4" />
                      Launch experiment
                    </button>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Theory</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{activeLab.theory}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Objective</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{activeLab.objective}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Experiment controls</h4>
                        <div className="mt-4 space-y-4">
                          {activeLab.variables.map((variable) => {
                            const currentValue = getLabValue(activeLab.id, variable.key, variable.value);

                            return (
                              <div key={variable.key}>
                                <div className="mb-2 flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                                  <span>{variable.label}</span>
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {currentValue.toFixed(variable.step < 1 ? 2 : 0)} {variable.unit}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={variable.min}
                                  max={variable.max}
                                  step={variable.step}
                                  value={currentValue}
                                  onChange={(event) => updateVariable(activeLab.id, variable.key, Number(event.target.value))}
                                  className="h-2 w-full cursor-pointer accent-blue-600"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Live result</h4>
                        <div className="mt-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-white shadow-lg">
                          <div className="text-xs uppercase tracking-[0.25em] text-blue-100">Prediction</div>
                          <div className="mt-3 text-xl font-bold">{activeLab.prediction}</div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">What to observe</h4>
                        <ul className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                          <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-blue-500" /> Read the trend before and after changing each variable.</li>
                          <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-violet-500" /> Compare the effect of controlled vs. uncontrolled changes.</li>
                          <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" /> Connect the pattern back to the underlying theory.</li>
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Assessment</h4>
                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <Award className="h-4 w-4 text-amber-500" />
                          Goal: explain the relationship between variable change and outcome using evidence from this simulation.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
