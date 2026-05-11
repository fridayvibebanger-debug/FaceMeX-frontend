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

   <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_30%)]" />

   <div className="absolute top-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

    <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

    <div className="relative z-10 grid w-full max-w-6xl gap-10 lg:grid-cols-2 items-center">

      <div className="hidden lg:block">

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-none">
          FaceMeX
        </h1>

        <p className="mt-5 max-w-xl text-base sm:text-lg text-white/65 leading-relaxed">
          A smarter social experience for people, work, and real connection.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/55">

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            Messaging
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            AI
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            Business
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            Careers
          </div>

        </div>
      </div>

      <div className="flex justify-center">
        {isLogin ? <LoginForm /> : <RegisterForm />}
      </div>

 </div>
    </div>
   );
 }
