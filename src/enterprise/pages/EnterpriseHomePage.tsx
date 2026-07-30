import { useMemo, useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEnterpriseDepartments } from '@/enterprise/hooks/useEnterpriseDepartments';
import { DepartmentCard } from '@/enterprise/components/DepartmentCard';
import { unlockDepartment, paymentCallback, checkSubscription } from '@/enterprise/services/enterpriseService';
import { type DepartmentConfig } from '@/enterprise/models/department';

export default function EnterpriseHomePage() {
  const navigate = useNavigate();
  const { departments, loading, refresh } = useEnterpriseDepartments();
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const unlockedCount = useMemo(() => departments.filter((item) => item.status === 'unlocked').length, [departments]);

  const handleUnlock = async (department: DepartmentConfig) => {
    setSelectedDepartment(department);
    setModalOpen(true);
  };

  const confirmUnlock = async () => {
    if (!selectedDepartment) return;

    setUnlocking(true);
    try {
      await checkSubscription();
      await paymentCallback(selectedDepartment.key);
      await unlockDepartment(selectedDepartment.key);
      await refresh();
      setModalOpen(false);
      setSelectedDepartment(null);
    } finally {
      setUnlocking(false);
    }
  };

  const openDepartment = (department: DepartmentConfig) => {
    navigate(`/enterprise/${department.key}`);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f7f4ee_0%,#f1eee7_48%,#ebe8df_100%)] px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 text-stone-900 sm:px-4 lg:px-6 lg:pt-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-[-180px] h-[580px] w-[580px] -translate-x-1/2 rounded-full bg-stone-300/25 blur-[180px]" />
        <div className="absolute right-[-120px] top-[80px] h-[280px] w-[280px] rounded-full bg-neutral-300/20 blur-[160px]" />
        <div className="absolute left-[-120px] bottom-[60px] h-[260px] w-[260px] rounded-full bg-white/55 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.74),transparent_58%)]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-3 lg:gap-4">
        <header className="rounded-[30px] border border-stone-300/65 bg-white/55 px-4 py-3 shadow-[0_10px_35px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5 sm:py-4 lg:px-6 lg:py-5">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <h1 className="text-[28px] font-black tracking-[0.24em] text-stone-900 leading-none sm:text-[30px]">MEXA</h1>
                <span className="text-lg text-cyan-500">✦</span>
              </div>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-stone-600">Enterprise AI Workforce</p>
            </div>
          </div>
        </header>

        <main className="rounded-[32px] border border-stone-300/65 bg-white/45 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-4 lg:p-5">
          <section className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(245,244,239,0.52)_45%,rgba(223,235,243,0.52))] p-4 shadow-[0_15px_45px_rgba(15,23,42,0.08)] sm:p-5 lg:p-5">
            <div className="absolute left-[-70px] top-[-70px] h-44 w-44 rounded-full bg-cyan-200/30 blur-[70px]" />
            <div className="absolute right-[-50px] bottom-[-50px] h-40 w-40 rounded-full bg-sky-200/30 blur-[70px]" />
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-stone-400/50 to-transparent" />

            <div className="relative flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/75 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Enterprise AI Workforce
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-stone-900 sm:text-[2rem] lg:text-[2.15rem]">Hire AI co-workers for every department.</h2>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-stone-700 sm:text-[15px]">
                  Calm, premium AI talent for operations, sales, support, finance and more.
                </p>
              </div>
              <div className="rounded-[22px] border border-stone-300/70 bg-white/65 px-4 py-3 text-sm text-stone-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:min-w-[220px]">
                <div className="font-semibold text-stone-900">Unlocked departments</div>
                <div className="mt-1 text-2xl font-black text-stone-900">{unlockedCount} / {departments.length}</div>
              </div>
            </div>
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-slate-300 sm:col-span-2 xl:col-span-4">
                Loading enterprise departments…
              </div>
            ) : (
              departments.map((department) => (
                <DepartmentCard
                  key={department.key}
                  department={department}
                  onUnlock={handleUnlock}
                  onOpen={openDepartment}
                />
              ))
            )}
          </section>
        </main>
      </div>

      {modalOpen && selectedDepartment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/60 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Unlock Department</div>
                <h2 className="mt-2 text-xl font-black text-slate-900">{selectedDepartment.title}</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Lock className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Department</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{selectedDepartment.title}</div>
              <div className="mt-4 text-sm text-slate-500">Price</div>
              <div className="mt-1 text-3xl font-black text-slate-900">R{selectedDepartment.price.toLocaleString()}</div>
            </div>

            <button
              onClick={confirmUnlock}
              disabled={unlocking}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {unlocking ? 'Processing…' : 'Pay Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
