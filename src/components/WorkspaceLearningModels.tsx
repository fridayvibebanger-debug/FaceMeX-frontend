import { useRef, useState } from 'react';
import type {
  Dispatch,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
} from 'react';
import {
  CUBE_EDGES,
  CUBE_VERTICES,
  WATER_MOLECULE_ATOMS,
  getWaterMoleculeBondAngleDegrees,
  getWaterMoleculeBondLengthAngstroms,
  rotatePoint3D,
} from '@/lib/workspaceLearningModels.js';

type Rotation = { yaw: number; pitch: number };
type ModelId = 'water' | 'cube' | 'newton' | 'photosynthesis';

type WorkspaceLearningModelsProps = {
  onExplain: (prompt: string) => void;
};

const MODEL_OPTIONS: Array<{ id: ModelId; label: string; subject: string; prompt: string }> = [
  {
    id: 'water',
    label: 'Water molecule (Chemistry)',
    subject: 'Chemistry',
    prompt: 'Teach me how a water molecule is structured. Explain that H₂O contains exactly two hydrogen atoms and one oxygen atom, describe the two covalent O–H bonds and the bent 104.5° bond angle, and clarify what this interactive model represents. Keep the atom count and chemistry accurate.',
  },
  {
    id: 'cube',
    label: 'Cube (Mathematics)',
    subject: 'Mathematics',
    prompt: 'Teach me the geometry of a cube using its 3D model. Explain its 6 faces, 12 edges and 8 vertices, define these terms, and include a short check using Euler’s polyhedron formula V − E + F = 2.',
  },
  {
    id: 'newton',
    label: 'Newton’s second law (Physics)',
    subject: 'Physics',
    prompt: 'Explain Newton’s second law using this example and visual: a 1,200 kg car accelerates at 4 m/s². State F = ma, substitute the values with units, calculate the net force accurately in newtons, explain what net force means, and relate the arrow to the acceleration direction.',
  },
  {
    id: 'photosynthesis',
    label: 'Photosynthesis (Biology)',
    subject: 'Biology',
    prompt: 'Explain photosynthesis using its accurate overall equation, 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂. Identify where it occurs in a plant cell, distinguish reactants from products, and explain how light energy is stored in glucose.',
  },
];

function projectPoint(point: [number, number, number], rotation: Rotation, scale: number) {
  const rotated = rotatePoint3D(point, rotation.yaw, rotation.pitch);
  return {
    x: 210 + rotated.x * scale,
    y: 145 - rotated.y * scale,
    z: rotated.z,
  };
}

function InteractiveModel({
  model,
  rotation,
  onRotationChange,
}: {
  model: 'water' | 'cube';
  rotation: Rotation;
  onRotationChange: Dispatch<SetStateAction<Rotation>>;
}) {
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const isMolecule = model === 'water';
  const scale = isMolecule ? 86 : 68;
  const projectedAtoms = WATER_MOLECULE_ATOMS.map((atom) => ({
    ...atom,
    ...projectPoint(atom.position, rotation, scale),
  }));
  const projectedVertices = CUBE_VERTICES.map((vertex) => projectPoint(vertex, rotation, scale));

  const startRotation = (event: ReactPointerEvent<SVGSVGElement>) => {
    lastPointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const updateRotation = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!lastPointer.current) return;
    const deltaX = event.clientX - lastPointer.current.x;
    const deltaY = event.clientY - lastPointer.current.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    onRotationChange((previous) => ({
      yaw: previous.yaw + deltaX * 0.009,
      pitch: Math.max(-1.35, Math.min(1.35, previous.pitch + deltaY * 0.009)),
    }));
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b]">
      <svg
        viewBox="0 0 420 290"
        role="img"
        aria-label={isMolecule
          ? 'Interactive 3D water molecule model with one oxygen atom bonded to two hydrogen atoms'
          : 'Interactive 3D cube model with six faces, twelve edges and eight vertices'}
        className="block h-auto max-h-[290px] w-full touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={startRotation}
        onPointerMove={updateRotation}
        onPointerUp={() => { lastPointer.current = null; }}
        onPointerCancel={() => { lastPointer.current = null; }}
      >
        <defs>
          <radialGradient id="oxygen-sphere" cx="32%" cy="28%">
            <stop offset="0%" stopColor="#ffb5a8" />
            <stop offset="100%" stopColor="#a83c36" />
          </radialGradient>
          <radialGradient id="hydrogen-sphere" cx="32%" cy="28%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#9cb1d2" />
          </radialGradient>
          <marker id="model-axis-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        {isMolecule ? (
          <>
            {projectedAtoms.slice(1).map((atom) => (
              <line key={`bond-${atom.id}`} x1={projectedAtoms[0].x} y1={projectedAtoms[0].y} x2={atom.x} y2={atom.y} stroke="#b7c1d3" strokeWidth="13" strokeLinecap="round" />
            ))}
            {[...projectedAtoms].sort((a, b) => a.z - b.z).map((atom) => {
              const isOxygen = atom.element === 'Oxygen';
              const radius = isOxygen ? 27 : 20;
              return (
                <g key={atom.id}>
                  <circle cx={atom.x} cy={atom.y} r={radius} fill={isOxygen ? 'url(#oxygen-sphere)' : 'url(#hydrogen-sphere)'} stroke="rgba(255,255,255,.55)" strokeWidth="1.5">
                    <title>{`${atom.element} atom (${atom.label})`}</title>
                  </circle>
                  <text x={atom.x} y={atom.y + 5} textAnchor="middle" fill={isOxygen ? 'white' : '#101522'} fontSize="16" fontWeight="700">{atom.label}</text>
                </g>
              );
            })}
          </>
        ) : (
          <>
            {[
              [0, 1, 2, 3],
              [4, 5, 6, 7],
              [0, 1, 5, 4],
            ].map((face, index) => (
              <polygon
                key={`face-${index}`}
                points={face.map((vertex) => `${projectedVertices[vertex].x},${projectedVertices[vertex].y}`).join(' ')}
                fill={['rgba(111,151,213,.12)', 'rgba(111,151,213,.2)', 'rgba(111,151,213,.08)'][index]}
                stroke="none"
              />
            ))}
            {CUBE_EDGES.map(([from, to], index) => (
              <line
                key={`edge-${index}`}
                x1={projectedVertices[from].x}
                y1={projectedVertices[from].y}
                x2={projectedVertices[to].x}
                y2={projectedVertices[to].y}
                stroke="#a9c5f3"
                strokeWidth="2.5"
              />
            ))}
            {[
              { label: 'x', point: [1.45, 0, 0] as [number, number, number], color: '#f0a3a3' },
              { label: 'y', point: [0, 1.45, 0] as [number, number, number], color: '#8dd8b2' },
              { label: 'z', point: [0, 0, 1.45] as [number, number, number], color: '#9bb9ff' },
            ].map((axis) => {
              const end = projectPoint(axis.point, rotation, scale);
              const origin = projectPoint([0, 0, 0], rotation, scale);
              return (
                <g key={axis.label}>
                  <line x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} stroke={axis.color} strokeWidth="2" markerEnd="url(#model-axis-arrow)" />
                  <text x={end.x + 7} y={end.y - 5} fill={axis.color} fontSize="14" fontWeight="700">{axis.label}</text>
                </g>
              );
            })}
          </>
        )}
      </svg>
      <p className="px-3 pb-3 text-center text-xs text-white/55">Drag the model to rotate it.</p>
    </div>
  );
}

function NewtonSecondLawDiagram() {
  return (
    <svg viewBox="0 0 520 190" role="img" aria-label="A car accelerating to the right with a 4,800 newton net-force arrow" className="mt-3 block h-auto w-full rounded-xl border border-white/10 bg-[#0b0b0b]">
      <defs>
        <marker id="net-force-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#9bb9ff" />
        </marker>
      </defs>
      <line x1="52" y1="142" x2="468" y2="142" stroke="rgba(255,255,255,.45)" strokeWidth="2" />
      <rect x="83" y="82" width="145" height="48" rx="12" fill="#293448" stroke="#9bb9ff" strokeWidth="2" />
      <path d="M 112 82 L 140 58 L 192 58 L 213 82 Z" fill="#35445c" stroke="#9bb9ff" strokeWidth="2" />
      <circle cx="121" cy="137" r="13" fill="#101010" stroke="#d7e4ff" strokeWidth="3" />
      <circle cx="194" cy="137" r="13" fill="#101010" stroke="#d7e4ff" strokeWidth="3" />
      <text x="155" y="107" textAnchor="middle" fill="white" fontSize="14">m = 1,200 kg</text>
      <line x1="247" y1="77" x2="421" y2="77" stroke="#9bb9ff" strokeWidth="5" markerEnd="url(#net-force-arrow)" />
      <text x="335" y="61" textAnchor="middle" fill="#c6d8ff" fontSize="15">Fnet = 4,800 N</text>
      <text x="335" y="105" textAnchor="middle" fill="#a9d8bd" fontSize="14">a = 4 m/s² →</text>
      <text x="260" y="174" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="11">Simplified horizontal net-force view; vertical forces are omitted.</text>
    </svg>
  );
}

function PhotosynthesisDiagram() {
  return (
    <svg viewBox="0 0 560 200" role="img" aria-label="Photosynthesis: carbon dioxide, water and light energy enter a plant; glucose and oxygen are produced" className="mt-3 block h-auto w-full rounded-xl border border-white/10 bg-[#0b0b0b]">
      <defs>
        <marker id="photosynthesis-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#9bb9ff" />
        </marker>
      </defs>
      <text x="91" y="56" textAnchor="middle" fill="#d9e3f3" fontSize="14">6CO₂ + 6H₂O</text>
      <text x="91" y="79" textAnchor="middle" fill="#f3d37b" fontSize="13">light energy ↓</text>
      <line x1="150" y1="100" x2="224" y2="100" stroke="#9bb9ff" strokeWidth="3" markerEnd="url(#photosynthesis-arrow)" />
      <path d="M 267 127 C 230 105 239 70 282 66 C 301 88 298 111 267 127 Z" fill="#466d53" stroke="#9ed7a7" strokeWidth="2" />
      <path d="M 267 126 L 284 76 M 267 126 L 250 91" stroke="#c1e0a9" strokeWidth="2" />
      <text x="269" y="151" textAnchor="middle" fill="#d9e3f3" fontSize="12">leaf cells</text>
      <line x1="315" y1="100" x2="384" y2="100" stroke="#9bb9ff" strokeWidth="3" markerEnd="url(#photosynthesis-arrow)" />
      <text x="462" y="89" textAnchor="middle" fill="#d9e3f3" fontSize="14">C₆H₁₂O₆ + 6O₂</text>
      <text x="280" y="181" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="11">Overall summary equation; the detailed process occurs in stages.</text>
    </svg>
  );
}

export default function WorkspaceLearningModels({ onExplain }: WorkspaceLearningModelsProps) {
  const [modelId, setModelId] = useState<ModelId>('water');
  const [rotation, setRotation] = useState<Rotation>({ yaw: -0.45, pitch: 0.3 });
  const selectedModel = MODEL_OPTIONS.find((model) => model.id === modelId) || MODEL_OPTIONS[0];
  const bondAngle = getWaterMoleculeBondAngleDegrees();
  const bondLength = getWaterMoleculeBondLengthAngstroms();

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <h3 className="text-sm font-medium text-white">Explore a subject visual</h3>
      <p className="mt-1 text-xs text-white/55">Choose a model or diagram, then ask FaceMeX to teach the concept in this chat.</p>
      <label htmlFor="smartboard-subject-model" className="sr-only">Choose a subject visual</label>
      <select
        id="smartboard-subject-model"
        value={modelId}
        onChange={(event) => {
          const nextModel = MODEL_OPTIONS.find((model) => model.id === event.target.value);
          if (!nextModel) return;
          setModelId(nextModel.id);
          setRotation({ yaw: -0.45, pitch: 0.3 });
        }}
        className="mt-3 min-h-11 w-full rounded-lg border border-white/10 bg-[#171717] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        {MODEL_OPTIONS.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
      </select>

      {modelId === 'water' && (
        <>
          <InteractiveModel model="water" rotation={rotation} onRotationChange={setRotation} />
          <p className="mt-2 text-xs text-white/65">
            H₂O · 1 oxygen + 2 hydrogen atoms · O–H bond length ≈ {bondLength.toFixed(2)} Å · H–O–H angle {bondAngle.toFixed(1)}°.
          </p>
        </>
      )}
      {modelId === 'cube' && (
        <>
          <InteractiveModel model="cube" rotation={rotation} onRotationChange={setRotation} />
          <p className="mt-2 text-xs text-white/65">A cube has 6 square faces, 12 edges and 8 vertices.</p>
        </>
      )}
      {modelId === 'newton' && (
        <>
          <NewtonSecondLawDiagram />
          <p className="mt-2 text-xs text-white/65">Fnet = ma = (1,200 kg)(4 m/s²) = 4,800 N.</p>
        </>
      )}
      {modelId === 'photosynthesis' && (
        <>
          <PhotosynthesisDiagram />
          <p className="mt-2 text-xs text-white/65">Carbon dioxide, water and light energy are used to make glucose and oxygen.</p>
        </>
      )}
      <button
        type="button"
        onClick={() => onExplain(selectedModel.prompt)}
        className="mt-3 min-h-10 rounded-xl bg-[#252525] px-4 text-sm font-medium text-white transition hover:bg-[#333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        Explain {selectedModel.subject} in chat
      </button>
    </section>
  );
}
