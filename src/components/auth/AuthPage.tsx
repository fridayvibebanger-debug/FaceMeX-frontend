import { useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/feed', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#050711] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.16),transparent_32%),radial-gradient(circle_at_85%_90%,rgba(6,182,212,0.10),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_38%,rgba(255,255,255,0.015))]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[390px] flex-col px-5 pb-5 pt-7">
        <section className="shrink-0 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3.5 py-1.5 text-[11px] font-medium text-white/55 shadow-[0_10px_35px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.75)]" />
            Private Beta
          </div>

          <h1 className="mt-5 text-[46px] font-semibold leading-none tracking-[-0.075em] text-white">
            FaceMeX
          </h1>

          <p className="mx-auto mt-3 max-w-xs text-[13px] leading-relaxed text-white/42">
            Messaging. AI tools. Careers. Business identity.
          </p>
        </section>

        <section className="mt-6 shrink-0 rounded-full border border-white/10 bg-white/[0.045] p-1 shadow-[0_18px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`h-10 rounded-full text-[13px] font-semibold transition-all duration-200 ${
                isLogin
                  ? 'bg-white text-slate-950 shadow-[0_8px_25px_rgba(255,255,255,0.10)]'
                  : 'text-white/42 hover:bg-white/[0.06] hover:text-white/80'
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`h-10 rounded-full text-[13px] font-semibold transition-all duration-200 ${
                !isLogin
                  ? 'bg-white text-slate-950 shadow-[0_8px_25px_rgba(255,255,255,0.10)]'
                  : 'text-white/42 hover:bg-white/[0.06] hover:text-white/80'
              }`}
            >
              Create
            </button>
          </div>
        </section>

        <section className="mt-4 min-h-0 flex-1">
          <div className="mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isLogin ? <LoginForm /> : <RegisterForm />}
          </div>
        </section>

        <section className="shrink-0 pb-1 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[13px] font-medium text-white/42 transition hover:text-white/85"
          >
            {isLogin
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </button>
        </section>
      </main>
    </div>
  );
}
