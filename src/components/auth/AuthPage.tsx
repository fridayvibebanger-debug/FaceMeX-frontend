import { useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { Button } from '@/components/ui/button';
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
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#030712] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(14,165,233,0.10),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_28%,rgba(255,255,255,0.02))]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:py-10">
        <section className="flex flex-1 flex-col justify-center py-8 text-center lg:text-left">
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/55 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.8)]" />
              Private Beta
            </div>

            <h1 className="text-5xl font-semibold tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">
              FaceMeX
            </h1>

            <p className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg">
              Messaging. AI tools. Careers. Business identity.
            </p>

            <div className="mt-10 hidden grid-cols-3 gap-3 lg:grid">
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                <p className="text-sm font-semibold text-white">Career AI</p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  Ask for jobs, CV help, interviews, and applications.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                <p className="text-sm font-semibold text-white">Social feed</p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  Post, reply, connect, and build your identity.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                <p className="text-sm font-semibold text-white">Business</p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  Promote your work and grow opportunities.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex w-full items-center justify-center pb-8 lg:pb-0">
          <div className="w-full max-w-md">
            <div className="mb-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
              <div className="grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`h-11 rounded-[1.45rem] text-sm font-semibold transition-all ${
                    isLogin
                      ? 'bg-white text-slate-950 hover:bg-white'
                      : 'bg-transparent text-white/55 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  Sign in
                </Button>

                <Button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`h-11 rounded-[1.45rem] text-sm font-semibold transition-all ${
                    !isLogin
                      ? 'bg-white text-slate-950 hover:bg-white'
                      : 'bg-transparent text-white/55 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  Create account
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-6">
              <div
                key={isLogin ? 'welcome-back' : 'welcome'}
                className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/35">
                  {isLogin ? 'Account access' : 'New identity'}
                </p>

                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                  {isLogin ? 'Welcome back' : 'Welcome'}
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-white/45">
                  {isLogin
                    ? 'Sign in to continue to your FaceMeX account.'
                    : 'Create your FaceMeX identity and start exploring.'}
                </p>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {isLogin ? <LoginForm /> : <RegisterForm />}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="mx-auto mt-5 block text-center text-sm text-white/45 transition hover:text-white"
            >
              {isLogin
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </button>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-white/28">
              By continuing, you agree to use FaceMeX responsibly during Private Beta.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
