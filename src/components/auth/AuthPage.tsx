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
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#020205] text-white">
      <style>
        {`
          .facemex-auth-card [data-provider="google"],
          .facemex-auth-card button[data-provider="google"],
          .facemex-auth-card button[aria-label*="google" i],
          .facemex-auth-card a[href*="google" i],
          .facemex-auth-card button:has(img[alt*="google" i]),
          .facemex-auth-card button:has(svg[aria-label*="google" i]) {
            display: none !important;
          }
        `}
      </style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.10),transparent_24%),linear-gradient(180deg,#020205_0%,#050507_44%,#020205_100%)]" />

        <motion.div
          className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/[0.055] blur-[90px]"
          animate={{
            opacity: [0.28, 0.55, 0.28],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute left-[58%] top-[-60px] h-[520px] w-[150px] -rotate-[28deg] bg-white/[0.08] blur-[42px]"
          animate={{
            opacity: [0.14, 0.32, 0.14],
            x: [0, 16, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute right-[-170px] top-[32%] h-[420px] w-[420px] rounded-full bg-slate-500/[0.055] blur-[90px]"
          animate={{
            opacity: [0.12, 0.28, 0.12],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.34)_52%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center px-5 py-8">
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="facemex-auth-card relative w-full max-w-[410px]"
        >
          <div className="absolute -inset-px rounded-[38px] bg-gradient-to-b from-white/18 via-white/[0.035] to-white/[0.02]" />

          <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-white/[0.075] px-6 pb-6 pt-7 shadow-[0_30px_100px_rgba(0,0,0,0.72)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 rounded-[38px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

            <div className="relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.35 }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_42px_rgba(0,0,0,0.45)]"
              >
                <span className="text-[22px] font-black leading-none tracking-[-0.12em] text-white">
                  FX
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.38 }}
                className="mt-4 text-[28px] font-semibold leading-none tracking-[-0.045em] text-white"
              >
                FaceMeX
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="mt-2 text-[12px] leading-relaxed text-white/45"
              >
                {isLogin
                  ? 'Please enter your details to sign in.'
                  : 'Create your account and join FaceMeX.'}
              </motion.p>
            </div>

            <div className="relative z-10 mt-6">
              <div className="mb-4 grid grid-cols-2 rounded-full border border-white/10 bg-black/20 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`relative h-9 overflow-hidden rounded-full text-[12.5px] font-semibold transition-all ${
                    isLogin ? 'text-black' : 'text-white/42 hover:text-white/85'
                  }`}
                >
                  {isLogin && (
                    <motion.span
                      layoutId="facemex-auth-tab"
                      className="absolute inset-0 rounded-full bg-white shadow-[0_10px_28px_rgba(255,255,255,0.12)]"
                      transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">Sign in</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`relative h-9 overflow-hidden rounded-full text-[12.5px] font-semibold transition-all ${
                    !isLogin ? 'text-black' : 'text-white/42 hover:text-white/85'
                  }`}
                >
                  {!isLogin && (
                    <motion.span
                      layoutId="facemex-auth-tab"
                      className="absolute inset-0 rounded-full bg-white shadow-[0_10px_28px_rgba(255,255,255,0.12)]"
                      transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">Sign up</span>
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isLogin ? 'login' : 'register'}
                  initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  {isLogin ? <LoginForm /> : <RegisterForm />}
                </motion.div>
              </AnimatePresence>

              <div className="mt-5 text-center text-[12px] text-white/42">
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(false)}
                      className="font-semibold text-white hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(true)}
                      className="font-semibold text-white hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
