import { useState, useEffect } from 'react';
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
  <div className="min-h-screen bg-[#020617] relative overflow-hidden flex items-center justify-center px-4 py-8">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.14),transparent_30%)]" />
    <div className="absolute top-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/15 blur-3xl" />

    <div className="relative z-10 grid w-full max-w-6xl gap-10 lg:grid-cols-2 items-center">
      <div className="text-center lg:text-left">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/55 backdrop-blur-xl">
          Private Beta
        </div>

        <h1 className="mt-6 text-6xl sm:text-7xl font-black tracking-[-0.05em] text-white leading-none">
          FaceMeX
        </h1>

        <p className="mt-4 text-sm text-white/45">
          Messaging • AI tools • Careers • Business identity
        </p>
      </div>

      <div className="flex flex-col items-center">
        {isLogin ? <LoginForm /> : <RegisterForm />}

        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="mt-5 text-sm text-white/60 hover:text-white transition"
        >
          {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  </div>
);
}
