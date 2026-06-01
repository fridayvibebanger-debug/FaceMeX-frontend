import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
    <div className="relative min-h-[100svh] w-full overflow-x-hidden bg-[#03050d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute bottom-[-120px] right-[-100px] h-72 w-72 rounded-full bg-blue-600/10 blur-3xl"
          animate={{ x: [0, -18, 0], y: [0, -12, 0], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.075),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_42%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[372px] flex-col justify-center px-5 py-5">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-medium text-white/55 shadow-[0_14px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-cyan-300"
              animate={{ opacity: [0.45, 1, 0.45], scale: [1, 1.25, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
            Private Beta
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, letterSpacing: '-0.12em' }}
            animate={{ opacity: 1, letterSpacing: '-0.075em' }}
            transition={{ delay: 0.12, duration: 0.5, ease: 'easeOut' }}
            className="mt-5 text-[44px] font-semibold leading-none text-white"
          >
            FaceMeX
          </motion.h1>

          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 86, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5, ease: 'easeOut' }}
            className="mx-auto mt-3 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent"
          />

          <p className="mx-auto mt-3 max-w-[285px] text-[12.5px] leading-relaxed text-white/42">
            Messaging. AI tools. Careers. Business identity.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45, ease: 'easeOut' }}
          className="mt-6 rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-[0_18px_55px_rgba(0,0,0,0.34)] backdrop-blur-xl"
        >
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`relative h-10 overflow-hidden rounded-full text-[13px] font-semibold transition-all duration-300 ${
                isLogin
                  ? 'text-slate-950'
                  : 'text-white/42 hover:bg-white/[0.055] hover:text-white/80'
              }`}
            >
              {isLogin && (
                <motion.span
                  layoutId="auth-pill"
                  className="absolute inset-0 rounded-full bg-white shadow-[0_10px_28px_rgba(255,255,255,0.12)]"
                  transition={{ type: 'spring', stiffness: 430, damping: 35 }}
                />
              )}
              <span className="relative z-10">Sign in</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`relative h-10 overflow-hidden rounded-full text-[13px] font-semibold transition-all duration-300 ${
                !isLogin
                  ? 'text-slate-950'
                  : 'text-white/42 hover:bg-white/[0.055] hover:text-white/80'
              }`}
            >
              {!isLogin && (
                <motion.span
                  layoutId="auth-pill"
                  className="absolute inset-0 rounded-full bg-white shadow-[0_10px_28px_rgba(255,255,255,0.12)]"
                  transition={{ type: 'spring', stiffness: 430, damping: 35 }}
                />
              )}
              <span className="relative z-10">Create</span>
            </button>
          </div>
        </motion.section>

        <section className="mt-4 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.985 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="mx-auto w-full"
            >
              {isLogin ? <LoginForm /> : <RegisterForm />}
            </motion.div>
          </AnimatePresence>
        </section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.35 }}
          className="pt-4 text-center"
        >
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[12.5px] font-medium text-white/38 transition hover:text-white/85"
          >
            {isLogin
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </button>
        </motion.section>
      </main>
    </div>
  );
}
