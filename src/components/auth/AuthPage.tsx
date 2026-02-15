import { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
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
    <div className="relative min-h-[100svh] bg-slate-950 text-white flex items-start sm:items-center justify-center px-4 py-10 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_40%)]" />
      </div>

      <div className="relative w-full max-w-md space-y-4">
        <div className="text-center space-y-2 mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/80">
            FaceMeX
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Welcome</h1>
          <p className="text-white/70 text-sm sm:text-base">
            {isLogin ? 'Sign in to continue.' : 'Create your account to get started.'}
          </p>
        </div>

        {isLogin ? <LoginForm /> : <RegisterForm />}

        <div className="text-center">
          <Button
            variant="link"
            className="text-white/80 hover:text-white"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </Button>
        </div>
      </div>
    </div>
  );
}

