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
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#030712] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#030712_0%,#06101d_48%,#020617_100%)]" />

        <motion.div
          className="absolute left-1/2 top-[-130px] h-[330px] w-[330px] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.45, 0.8, 0.45],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute bottom-[-160px] right-[-140px] h-[360px] w-[360px] rounded-full bg-blue-600/12 blur-3xl"
          animate={{
            x: [0, -16, 0],
            y: [0, -12, 0],
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute left-1/2 top-[86px] h-[130px] w-[130px] -translate-x-1/2 rounded-full border border-white/10"
          animate={{
            rotate: 360,
            opacity: [0.16, 0.32, 0.16],
          }}
          transition={{
            rotate: {
              duration: 18,
              repeat: Infinity,
              ease: 'linear',
            },
            opacity: {
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        />

        <motion.div
          className="absolute left-1/2 top-[103px] h-[96px] w-[96px] -translate-x-1/2 rounded-full border border-cyan-200/10"
          animate={{
            rotate: -360,
            opacity: [0.12, 0.26, 0.12],
          }}
          transition={{
            rotate: {
              duration: 14,
              repeat: Infinity,
              ease: 'linear',
            },
            opacity: {
              duration: 4.5,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_50%_95%,rgba(34,211,238,0.08),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <main className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-[360px] flex-col px-5 pb-4 pt-5">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="shrink-0 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10.5px] font-medium text-white/55 shadow-[0_14px_45px_rgba(0,0,0,0.38)] backdrop-blur-xl"
          >
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.85)]"
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.22, 1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            Private Beta
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, letterSpacing: '-0.12em' }}
            animate={{ opacity: 1, letterSpacing: '-0.075em' }}
            transition={{ delay: 0.12, duration: 0.5, ease: 'easeOut' }}
            className="mt-4 text-[40px] font-semibold leading-none text-white"
          >
            FaceMeX
          </motion.h1>

          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 78, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5, ease: 'easeOut' }}
            className="mx-auto mt-3 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent"
          />

          <p className="mx-auto mt-2 max-w-[270px] text-[12px] leading-relaxed text-white/40">
            Messaging. AI tools. Careers. Business identity.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.42, ease: 'easeOut' }}
          className="mt-5 shrink-0 rounded-full border border-white/10 bg-white/[0.045] p-1 shadow-[0_18px_55px_rgba(0,0,0,0.34)] backdrop-blur-xl"
        >
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`relative h-9 overflow-hidden rounded-full text-[12.5px] font-semibold transition-all duration-300 ${
                isLogin
                  ? 'text-slate-950'
                  : 'text-white/40 hover:bg-white/[0.055] hover:text-white/80'
              }`}
            >
              {isLogin && (
                <motion.span
                  layoutId="auth-active-pill"
                  className="absolute inset-0 rounded-full bg-white shadow-[0_10px_28px_rgba(255,255,255,0.12)]"
                  transition={{ type: 'spring', stiffness: 430, damping: 35 }}
                />
              )}
              <span className="relative z-10">Sign in</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`relative h-9 overflow-hidden rounded-full text-[12.5px] font-semibold transition-all duration-300 ${
                !isLogin
                  ? 'text-slate-950'
                  : 'text-white/40 hover:bg-white/[0.055] hover:text-white/80'
              }`}
            >
              {!isLogin && (
                <motion.span
                  layoutId="auth-active-pill"
                  className="absolute inset-0 rounded-full bg-white shadow-[0_10px_28px_rgba(255,255,255,0.12)]"
                  transition={{ type: 'spring', stiffness: 430, damping: 35 }}
                />
              )}
              <span className="relative z-10">Create</span>
            </button>
          </div>
        </motion.section>

        <section className="mt-4 min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              className="mx-auto w-full origin-top"
            >
              <div className="max-h-[calc(100dvh-190px)] overflow-hidden rounded-[30px]">
                {isLogin ? <LoginForm /> : <RegisterForm />}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
