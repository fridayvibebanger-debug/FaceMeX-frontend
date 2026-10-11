import { Sparkles } from 'lucide-react';

export default function MEXAUpgrade() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-violet-600">
          <Sparkles className="h-6 w-6" />
          <div className="text-xl font-semibold">MEXA Upgrade</div>
        </div>
        <h1 className="mt-4 text-3xl font-black">Premium experience coming soon</h1>
        <p className="mt-3 text-slate-600">This route is temporarily stubbed so the app can continue to load while the premium experience is finalized.</p>
      </div>
    </div>
  );
}
