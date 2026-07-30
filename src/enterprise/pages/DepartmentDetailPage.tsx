import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Sparkles } from 'lucide-react';
import { getDepartmentViewModel } from '@/enterprise/hooks/useEnterpriseDepartments';
import { VoiceCommandPanel } from '@/enterprise/voice/VoiceCommandPanel';

export default function DepartmentDetailPage() {
  const { departmentKey } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState<any>(null);

  useEffect(() => {
    if (!departmentKey) return;
    void getDepartmentViewModel(departmentKey).then(setDepartment);
  }, [departmentKey]);

  const coWorkers = useMemo(() => department?.coWorkers || [], [department]);

  if (!department) {
    return <div className="min-h-screen bg-slate-50 p-6">Loading department…</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.16),_transparent_55%),linear-gradient(135deg,_#f8f7ff_0%,_#f4f8ff_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <button onClick={() => navigate('/enterprise')} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Enterprise
          </button>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
                <Sparkles className="h-4 w-4" />
                {department.title}
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight">{department.title} Department</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{department.blurb}</p>
            </div>
            <div className="rounded-[24px] border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-800">
              <div className="font-semibold">Status</div>
              <div className="mt-1 text-xl font-black">{department.status === 'unlocked' ? 'Unlocked' : 'Locked'}</div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-sky-600 text-white">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Co-workers</div>
                <div className="text-xl font-black text-slate-900">Specialists ready</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {coWorkers.map((worker: string) => (
                <div key={worker} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-sm font-semibold text-slate-800">{worker}</div>
                  <div className="mt-2 text-sm text-slate-500">AI task specialist for {department.title}</div>
                </div>
              ))}
            </div>
          </div>

          <VoiceCommandPanel departmentTitle={department.title} />
        </section>
      </div>
    </div>
  );
}
