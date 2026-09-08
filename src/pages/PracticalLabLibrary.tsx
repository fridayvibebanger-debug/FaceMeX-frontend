import { useEffect, useMemo, useState } from 'react';
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
  topic?: string;
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

type LearningProgress = {
  completedLabs: string[];
  scores: Record<string, number>;
  lastLabId?: string;
};

type LearningLayer = 'subject' | 'topic' | 'lesson' | 'simulation' | 'assessment';

const LEARNING_PROGRESS_KEY = 'facemex_learning_progress_v1';

const learningLayers: LearningLayer[] = ['subject', 'topic', 'lesson', 'simulation', 'assessment'];

type TeachingMode = 'learner' | 'facilitator';

const subjectCards: SubjectCard[] = [
  {
    id: 'biology',
    name: 'Biology',
    icon: Dna,
    description: 'Cells, genetics, ecosystems, and living systems',
    accent: 'from-emerald-500/30 via-emerald-500/10 to-transparent',
    labs: [
      {
        id: 'dna-replication',
        name: 'DNA Replication Lab',
        description: 'Match complementary bases and build a new DNA strand step by step.',
        subject: 'biology',
        difficulty: 'beginner',
        duration: 20,
        completed: false,
        badge: 'Genetics',
        theory: 'DNA replication is semi-conservative: each original strand guides the construction of a new complementary strand.',
        objective: 'Correctly pair every base, then explain how the copied strand preserves genetic information.',
        prediction: 'A pairs with T, while C pairs with G. Accurate pairing produces a stable daughter molecule.',
        variables: [],
      },
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

const dnaTemplate = ['A', 'T', 'G', 'C', 'C', 'A', 'T', 'G'];
const dnaPairs: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };

function DnaReplicationLab({ onComplete }: { onComplete?: (score: number) => void }) {
  const [answers, setAnswers] = useState<Array<string | null>>(() => dnaTemplate.map(() => null));
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Choose a base for each open position on the daughter strand.');
  const [playing, setPlaying] = useState(false);

  const answeredCount = answers.filter(Boolean).length;
  const correctCount = answers.filter((answer, index) => answer === dnaPairs[dnaTemplate[index]]).length;
  const complete = answeredCount === dnaTemplate.length;

  useEffect(() => {
    if (complete && correctCount === dnaTemplate.length) onComplete?.(100);
  }, [complete, correctCount, onComplete]);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= 3) {
          setPlaying(false);
          return 3;
        }
        return current + 1;
      });
    }, 900);

    return () => window.clearInterval(timer);
  }, [playing]);

  const chooseBase = (index: number, base: string) => {
    if (step < 2) {
      setFeedback('Run the replication steps first: unzip the helix, expose the template, then add bases.');
      return;
    }

    const next = [...answers];
    next[index] = base;
    setAnswers(next);
    setFeedback(base === dnaPairs[dnaTemplate[index]] ? 'Correct base pair.' : 'Not quite. Check the base-pairing rule and try again.');
    setScore(next.filter((answer, pairIndex) => answer === dnaPairs[dnaTemplate[pairIndex]]).length);
  };

  const reset = () => {
    setAnswers(dnaTemplate.map(() => null));
    setStep(0);
    setScore(0);
    setPlaying(false);
    setFeedback('Choose a base for each open position on the daughter strand.');
  };

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">DNA replication sequence</p>
            <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100">Step {step + 1} of 4: {['Prepare', 'Unzip', 'Add complementary bases', 'Proofread'][step]}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPlaying((value) => !value)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500">
              {playing ? 'Pause animation' : 'Play animation'}
            </button>
            <button type="button" onClick={reset} className="rounded-xl border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:text-emerald-200">
              Reset
            </button>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-900/60">
          <div className="h-full rounded-full bg-emerald-600 transition-all duration-700" style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white dark:border-slate-700">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Interactive DNA ladder</p>
            <p className="mt-1 text-sm text-slate-300">Select the complementary base in every open circle.</p>
          </div>
          <div className="text-right text-sm"><span className="font-semibold text-emerald-300">{score}/{dnaTemplate.length}</span><span className="block text-xs text-slate-400">correct</span></div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="mx-auto min-w-[520px] max-w-2xl space-y-2">
            {dnaTemplate.map((base, index) => (
              <div key={`${base}-${index}`} className="flex items-center justify-center gap-2 sm:gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/40 bg-blue-500/20 font-bold text-blue-100">{base}</span>
                <span className={`h-1 w-10 transition-all duration-500 ${step >= 1 ? 'bg-slate-400' : 'bg-slate-700'}`} />
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl border font-bold transition-all duration-500 ${step >= 2 ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100' : 'border-slate-600 bg-slate-800 text-slate-500'}`}>
                  {answers[index] || '?'}
                </span>
                <div className="flex gap-1">
                  {['A', 'T', 'C', 'G'].map((option) => (
                    <button key={option} type="button" onClick={() => chooseBase(index, option)} disabled={step < 2} className="h-8 w-8 rounded-lg border border-slate-600 bg-slate-800 text-xs font-semibold text-slate-200 transition hover:border-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40">
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 text-sm ${complete && correctCount === dnaTemplate.length ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100' : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}>
        <p className="font-semibold">Student feedback</p>
        <p className="mt-1">{complete && correctCount === dnaTemplate.length ? 'Excellent. You built a correct complementary DNA strand and completed the replication check.' : feedback}</p>
        <p className="mt-3 text-xs font-medium opacity-80">Rule: A ↔ T and C ↔ G. Proofreading begins after all positions are filled.</p>
      </div>
    </div>
  );
}

function ThreeDModelVisual({ lab, subject }: { lab: Lab; subject: Subject }) {
  const subjectLabels: Record<Subject, string> = {
    biology: 'Molecular structure',
    chemistry: 'Molecule + reaction vessel',
    physics: 'Force and motion model',
    mathematics: 'Spatial function model',
    environment: 'Ecosystem system model',
    engineering: 'Applied system model',
  };

  return (
    <div className="relative min-h-48 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-inner lg:border-white/10">
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.12)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative z-10 flex min-h-40 items-center justify-center [perspective:900px]">
        <div className="relative h-32 w-52 [transform:rotateX(58deg)_rotateZ(-12deg)] [transform-style:preserve-3d] transition-transform duration-700 hover:[transform:rotateX(48deg)_rotateZ(-4deg)_scale(1.05)]">
          <div className="absolute inset-0 rounded-[28px] border border-cyan-300/50 bg-gradient-to-br from-cyan-400/25 via-blue-500/15 to-violet-500/25 shadow-[0_0_50px_rgba(56,189,248,.2)] [transform:translateZ(22px)]" />
          <div className="absolute inset-3 rounded-[20px] border border-white/20 bg-white/5 [transform:translateZ(44px)]" />
          <div className="absolute -inset-3 rounded-[34px] border border-emerald-300/20 [transform:translateZ(-16px)]" />
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-300/60 to-blue-500/20 blur-[1px] [transform:translateZ(58px)]" />
          <div className="absolute left-1/2 top-1/2 h-2 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/80 [transform:translateZ(70px)_rotateZ(22deg)]" />
        </div>
      </div>
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">
        <span>{subjectLabels[subject]}</span>
        <span className="truncate text-right normal-case tracking-normal text-slate-500">{lab.name}</span>
      </div>
    </div>
  );
}

function InteractiveExperimentLab({
  lab,
  getValue,
  updateValue,
  teachingMode,
  onComplete,
}: {
  lab: Lab;
  getValue: (key: string, fallback: number) => number;
  updateValue: (key: string, value: number) => void;
  teachingMode: TeachingMode;
  onComplete?: (score: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [feedback, setFeedback] = useState('Set the controls, run the experiment, and compare the result with the prediction.');

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= 3) {
          setRunning(false);
          setHasRun(true);
          setFeedback('Experiment complete. Explain which variable changed the outcome most and why.');
          onComplete?.(Math.min(100, 55 + lab.variables.length * 10 + 15));
          return 3;
        }
        return current + 1;
      });
    }, 850);

    return () => window.clearInterval(timer);
  }, [running]);

  const runExperiment = () => {
    setStep(0);
    setHasRun(false);
    setFeedback('Experiment started. Observe each stage before changing another variable.');
    setRunning(true);
  };

  const reset = () => {
    setStep(0);
    setRunning(false);
    setHasRun(false);
    setFeedback('Set the controls, run the experiment, and compare the result with the prediction.');
  };

  const score = hasRun ? Math.min(100, 55 + lab.variables.length * 10 + (step === 3 ? 15 : 0)) : 0;
  const stages = ['Set a question', 'Adjust variables', 'Observe the model', 'Explain the evidence'];
  const primaryValue = lab.variables[0] ? getValue(lab.variables[0].key, lab.variables[0].value) : 0;

  const simulationVisual = lab.id === 'dna-replication' ? (
    <div className="relative flex min-h-44 items-center justify-center overflow-hidden rounded-2xl bg-[#080b12] p-5">
      <div className="absolute inset-x-8 top-1/2 h-px bg-emerald-400/30" />
      <div className="grid grid-cols-2 gap-x-10 gap-y-2">
        {['A', 'T', 'G', 'C', 'C', 'A', 'T', 'G'].map((base, index) => (
          <div key={`${base}-${index}`} className="relative flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-300/40 bg-blue-500/20 text-xs font-bold text-blue-100">{base}</span>
            <span className="h-1 w-7 rounded-full bg-emerald-400/60" />
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-300/40 bg-emerald-500/20 text-xs font-bold text-emerald-100">{dnaPairs[base]}</span>
          </div>
        ))}
      </div>
      <span className="absolute bottom-3 left-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">Base-pair structure</span>
    </div>
  ) : lab.subject === 'physics' ? (
    <div className="relative min-h-44 overflow-hidden rounded-2xl bg-[#080b12] p-5">
      <div className="absolute bottom-8 left-5 right-5 h-px bg-slate-600" />
      <div className="absolute bottom-9 left-8 h-28 w-1 origin-bottom bg-violet-400" style={{ transform: `rotate(${-Math.min(65, Math.max(15, primaryValue))}deg)` }} />
      <div className="absolute bottom-9 left-8 h-3 w-3 rounded-full bg-violet-300 shadow-[0_0_22px_rgba(167,139,250,.8)]" />
      <div className="absolute bottom-9 left-[45%] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_22px_rgba(103,232,249,.8)]" />
      <p className="absolute left-4 top-4 text-xs font-semibold text-slate-300">Motion model</p>
      <p className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">Adjust angle and velocity</p>
    </div>
  ) : lab.subject === 'mathematics' ? (
    <div className="relative min-h-44 overflow-hidden rounded-2xl bg-[#080b12] p-5">
      <div className="absolute inset-5 bg-[linear-gradient(rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.12)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <svg viewBox="0 0 300 150" className="relative z-10 h-full min-h-36 w-full" role="img" aria-label="Live mathematics graph">
        <path d="M10 125 C60 115 70 30 145 62 S220 120 290 25" fill="none" stroke="#fbbf24" strokeWidth="4" />
        <line x1="145" y1="62" x2="210" y2="22" stroke="#38bdf8" strokeWidth="3" />
        <circle cx="145" cy="62" r="6" fill="#fff" />
      </svg>
      <p className="absolute left-4 top-4 text-xs font-semibold text-slate-300">f(x) and tangent slope</p>
      <p className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">Live graph</p>
    </div>
  ) : <ThreeDModelVisual lab={lab} subject={lab.subject} />;

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">Interactive experiment</p>
            <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">Step {step + 1} of 4: {stages[step]}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={runExperiment} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">
              <Play className="h-3.5 w-3.5" />
              {running ? 'Running...' : 'Run experiment'}
            </button>
            <button type="button" onClick={reset} className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-800 dark:border-blue-800 dark:text-blue-200">Reset</button>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/60">
          <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:border-white/10 lg:bg-[#171717]">
        <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Experiment controls</h4>
        <div className="mt-4 space-y-4">
          {lab.variables.map((variable) => {
            const value = getValue(variable.key, variable.value);

            return (
              <div key={variable.key}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                  <span>{variable.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{value.toFixed(variable.step < 1 ? 2 : 0)} {variable.unit}</span>
                </div>
                <input
                  type="range"
                  min={variable.min}
                  max={variable.max}
                  step={variable.step}
                  value={value}
                  onChange={(event) => updateValue(variable.key, Number(event.target.value))}
                  className="h-2 w-full cursor-pointer accent-blue-600"
                />
              </div>
            );
          })}
        </div>
      </div>

      {simulationVisual}

      {teachingMode === 'facilitator' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 lg:border-amber-400/20 lg:bg-amber-400/10 lg:text-amber-100">
          <p className="font-semibold">Facilitator prompt</p>
          <p className="mt-1">Pause after each stage and ask students to predict the next change before moving the controls.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white dark:border-slate-700">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Model output</p>
          <div className="mt-4 flex h-28 items-end gap-2">
            {lab.variables.map((variable) => {
              const value = getValue(variable.key, variable.value);
              const height = `${Math.max(12, ((value - variable.min) / Math.max(1, variable.max - variable.min)) * 88)}%`;
              return <div key={variable.key} title={`${variable.label}: ${value} ${variable.unit}`} className="flex-1 rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-300 transition-all duration-500" style={{ height }} />;
            })}
          </div>
          <p className="mt-3 text-xs text-slate-400">Change one control at a time and observe how the model responds.</p>
        </div>

        <div className={`rounded-2xl border p-4 ${hasRun ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Student score</p>
            <span className="text-2xl font-bold text-emerald-600">{score}%</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{feedback}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">Feedback target: connect the measured pattern to the theory and explain your evidence.</p>
        </div>
      </div>
    </div>
  );
}

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
  const [teachingMode, setTeachingMode] = useState<TeachingMode>('learner');
  const [presentationMode, setPresentationMode] = useState(false);
  const [learningProgress, setLearningProgress] = useState<LearningProgress>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LEARNING_PROGRESS_KEY) || 'null');
      return {
        completedLabs: Array.isArray(stored?.completedLabs) ? stored.completedLabs : [],
        scores: stored?.scores && typeof stored.scores === 'object' ? stored.scores : {},
        lastLabId: stored?.lastLabId,
      };
    } catch {
      return { completedLabs: [], scores: {} };
    }
  });

  useEffect(() => {
    localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(learningProgress));
  }, [learningProgress]);

  const isLabCompleted = (lab: Lab) => lab.completed || learningProgress.completedLabs.includes(lab.id);

  const recordLabResult = (labId: string, score: number) => {
    setLearningProgress((current) => ({
      completedLabs: current.completedLabs.includes(labId) ? current.completedLabs : [...current.completedLabs, labId],
      scores: { ...current.scores, [labId]: Math.max(current.scores[labId] || 0, score) },
      lastLabId: labId,
    }));
  };

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

  const totalCompleted = subjectCards.reduce((sum, subject) => sum + subject.labs.filter(isLabCompleted).length, 0);
  const totalLabs = subjectCards.reduce((sum, subject) => sum + subject.labs.length, 0);
  const progress = Math.round((totalCompleted / totalLabs) * 100);

  return (
    <div className="min-h-screen bg-white text-slate-950 lg:bg-[#050505] lg:text-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-lg lg:border-white/10 lg:bg-[#111]/95">
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
                <p className="mt-2 max-w-3xl text-sm text-slate-600 lg:text-slate-400 sm:text-base">
                Learn theory by experimenting with real scientific and mathematical systems. Each lab connects concept, practice, and measurable outcomes for college and university students.
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:border-white/10 lg:bg-white/[0.05]">
              <div>
                <div className="text-3xl font-bold text-blue-600">{progress}%</div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Completed</div>
              </div>
              <div className="h-12 w-px bg-slate-200 lg:bg-white/10" />
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
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lg:border-white/10 lg:bg-[#1a1a1a] lg:text-white"
              />
            </div>
            <select
              value={filterDifficulty}
              onChange={(event) => setFilterDifficulty(event.target.value as 'all' | Difficulty)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lg:border-white/10 lg:bg-[#1a1a1a] lg:text-white"
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
                const completed = subject.labs.filter(isLabCompleted).length;

                return (
                  <button
                    key={subject.id}
                    onClick={() => {
                      setSelectedSubject(subject.id);
                      setSelectedLabId(subject.labs[0]?.id ?? null);
                    }}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl lg:border-white/10 lg:bg-[#111]"
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

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 lg:border-white/10 lg:bg-[#111] lg:text-slate-300">
                <BookOpen className="h-3.5 w-3.5" />
                {selectedSubjectData?.name}
                </div>
                <button
                  type="button"
                  onClick={() => setTeachingMode((mode) => mode === 'learner' ? 'facilitator' : 'learner')}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${teachingMode === 'facilitator' ? 'border-amber-400 bg-amber-50 text-amber-800 lg:border-amber-400/40 lg:bg-amber-400/10 lg:text-amber-100' : 'border-slate-200 bg-white text-slate-600 lg:border-white/10 lg:bg-[#111] lg:text-slate-300'}`}
                >
                  {teachingMode === 'facilitator' ? 'Facilitator mode' : 'Learner mode'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(selectedSubjectData?.labs.map((lab) => lab.topic || lab.badge) || [])).map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSearchTerm(topic)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 lg:border-white/10 lg:bg-[#111] lg:text-slate-300"
                >
                  {topic}
                </button>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:border-white/10 lg:bg-[#111]">
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
                      {isLabCompleted(lab) && <CheckCircle className="h-5 w-5 text-emerald-500" />}
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
                <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:border-white/10 lg:bg-[#111] ${presentationMode ? 'fixed inset-4 z-40 overflow-y-auto lg:inset-10' : ''}`}>
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        <Atom className="h-3.5 w-3.5" />
                        {activeLab.badge}
                      </div>
                      <h3 className="text-2xl font-bold">{activeLab.name}</h3>
                    </div>
                    <button onClick={() => setPresentationMode((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">
                      <Play className="h-4 w-4" />
                      {presentationMode ? 'Exit presentation' : teachingMode === 'facilitator' ? 'Present to class' : 'Launch experiment'}
                    </button>
                  </div>

                  {activeLab.id === 'dna-replication' ? (
                    <DnaReplicationLab onComplete={(score) => recordLabResult(activeLab.id, score)} />
                  ) : (
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

                      <InteractiveExperimentLab
                        lab={activeLab}
                        getValue={(key, fallback) => getLabValue(activeLab.id, key, fallback)}
                        updateValue={(key, value) => updateVariable(activeLab.id, key, value)}
                        teachingMode={teachingMode}
                        onComplete={(score) => recordLabResult(activeLab.id, score)}
                      />
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
                  )}
                </div>
              ) : null}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
