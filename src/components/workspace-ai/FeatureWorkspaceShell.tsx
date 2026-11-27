import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type FeatureWorkspaceShellProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  desktopLabel?: string;
};

export default function FeatureWorkspaceShell({
  title,
  icon,
  children,
  desktopLabel,
}: FeatureWorkspaceShellProps) {
  const navigate = useNavigate();

  return (
    <main className="fixed inset-0 z-50 flex h-[100dvh] w-screen min-w-0 overflow-hidden bg-[#0d0d0d] text-white">
      <header className="absolute inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#111111]/95 px-3 backdrop-blur-xl sm:px-5">
        <button
          type="button"
          onClick={() => navigate('/ai/job-assistant')}
          aria-label="Back to FaceMeX workspace"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-white/90">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {desktopLabel && <p className="hidden text-[11px] text-white/45 sm:block">{desktopLabel}</p>}
        </div>
      </header>
      <div className="h-full w-full min-w-0 pt-14">
        {children}
      </div>
    </main>
  );
}
