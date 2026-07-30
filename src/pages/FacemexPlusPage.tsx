import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';

export default function FacemexPlusPage() {
  const navigate = useNavigate();

 const subscribe = async (plan: "pro" | "creator") => {
    try {
      const token = localStorage.getItem("access_token");
  
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/payments/initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tier: plan,
          }),
        }
      );
  
      const data = await response.json();
  
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert(data.message || "Unable to start payment.");
      }
    } catch (err) {
      console.error(err);
      alert("Payment failed.");
    }
  };
  
  return (
    <div className="min-h-screen bg-white text-slate-950 flex items-center justify-center px-4 py-10 lg:bg-[#050505] lg:text-white">
      <div className="w-full max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 lg:text-white">Upgrade your plan</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_25px_70px_rgba(15,23,42,0.12)] lg:border-white/10 lg:bg-slate-900/95 lg:shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 lg:text-slate-400">Plus</p>
                <div className="mt-5 flex items-start gap-2 text-5xl font-semibold tracking-tight text-slate-950 lg:text-white">
                  <span>R</span>
                  <span className="text-[4.5rem] leading-none">99</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 lg:text-slate-500">/ month</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white lg:border-white/10 lg:bg-white/5 lg:text-slate-200">
                Most popular
              </div>
            </div>

            <p className="mt-8 text-sm text-slate-600 lg:text-slate-400">Unlimited AI, uploads, and faster access for smarter work.</p>

            <button
              type="button"
              onClick={() => subscribe("plus")}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-900 bg-slate-950 px-5 py-3 text-sm font-semibold tracking-[0.14em] text-white transition hover:bg-slate-800 lg:border-white/10 lg:bg-white/10 lg:text-white/85 lg:hover:bg-white/15"
            >
              <Plus className="h-4 w-4 text-white/85" />
              Get Plus
            </button>

            <div className="mt-8 space-y-4 text-sm text-slate-700 lg:text-slate-300">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                Unlimited image uploads
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                50 documents per month
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                No scheduling
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                Unlimited AI
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                No model change
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                Adzuna for jobs
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_25px_70px_rgba(15,23,42,0.12)] lg:border-white/10 lg:bg-slate-900/95 lg:shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 lg:text-slate-400">Pro</p>
                <div className="mt-5 flex items-start gap-2 text-5xl font-semibold tracking-tight text-slate-950 lg:text-white">
                  <span>R</span>
                  <span className="text-[4.5rem] leading-none">250</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 lg:text-slate-500">/ month</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white lg:border-white/10 lg:bg-white/5 lg:text-slate-200">
                Unlimited everything
              </div>
            </div>

            <p className="mt-8 text-sm text-slate-600 lg:text-slate-400">Everything in Plus, plus scheduling, Google jobs, and unlimited uploads.</p>

            <button
              type="button"
              onClick={() => subscribe("pro")}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-900 bg-slate-950 px-5 py-3 text-sm font-semibold tracking-[0.14em] text-white transition hover:bg-slate-800 lg:border-white/10 lg:bg-white/10 lg:text-white/85 lg:hover:bg-white/15"
            >
              <Sparkles className="h-4 w-4 text-white/85" />
              Get Pro
            </button>

            <div className="mt-8 space-y-4 text-sm text-slate-700 lg:text-slate-300">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                Everything in Plus
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                Scheduling
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                Google jobs
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                Unlimited image uploads & documents
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white lg:bg-white/10 lg:text-white">✓</span>
                Unlimited everything
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
