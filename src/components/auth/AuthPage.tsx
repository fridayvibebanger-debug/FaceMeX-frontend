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
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#05070f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(29,78,216,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_35%)]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-6 pt-8">
        <section className="shrink-0 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-medium text-white/55 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            Private Beta
          </div>

          <h1 className="mt-6 text-5xl font-semibold tracking-[-0.07em] text-white">
            FaceMeX
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-white/45">
            Messaging. AI tools. Careers. Business identity.
          </p>
        </section>

        <section className="mt-7 shrink-0 rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`h-12 rounded-full text-sm font-semibold transition ${
                isLogin
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-white/45 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`h-12 rounded-full text-sm font-semibold transition ${
                !isLogin
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-white/45 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              Create account
            </button>
          </div>
        </section>

        <section className="mt-5 min-h-0 flex-1">
          <div className="mx-auto w-full">
            {isLogin ? <LoginForm /> : <RegisterForm />}
          </div>
        </section>

        <section className="shrink-0 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-white/45 transition hover:text-white"
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
