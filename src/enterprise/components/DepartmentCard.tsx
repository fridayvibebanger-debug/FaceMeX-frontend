import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import type { DepartmentConfig, DepartmentStatus } from '@/enterprise/models/department';

interface DepartmentCardProps {
  department: DepartmentConfig & { status: DepartmentStatus };
  onUnlock: (department: DepartmentConfig) => void;
  onOpen: (department: DepartmentConfig) => void;
}

export function DepartmentCard({ department, onUnlock, onOpen }: DepartmentCardProps) {
  const locked = department.status === 'locked';

  return (
    <div className="rounded-[24px] border border-stone-300/65 bg-white/60 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className={`inline-flex rounded-full border border-stone-300/70 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700`}>
        {department.key.replace(/-/g, ' ')}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-stone-900">{department.title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-700">{department.blurb}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            {locked ? 'Locked' : 'Unlocked'}
          </div>
          <div className="mt-1 text-sm font-semibold text-stone-800">
            {locked ? `Unlock for R${department.price.toLocaleString()}` : '✓ Active'}
          </div>
        </div>

        {locked ? (
          <button
            onClick={() => onUnlock(department)}
            className="inline-flex items-center gap-2 rounded-full border border-stone-300/70 bg-white/70 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-white"
          >
            <Lock className="h-4 w-4" />
            Unlock
          </button>
        ) : (
          <button
            onClick={() => onOpen(department)}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/45 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-400/15"
          >
            <Sparkles className="h-4 w-4" />
            Open
          </button>
        )}
      </div>
    </div>
  );
}
