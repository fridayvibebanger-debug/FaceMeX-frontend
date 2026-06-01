import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BriefcaseBusiness,
  MessageCircle,
  Orbit,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
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

  const headline = useMemo(() => {
    return isLogin ? 'Welcome back' : 'Create your identity';
  }, [isLogin]);

  const subline = useMemo(() => {
    return isLogin
      ? 'Step into your private FaceMeX space.'
      : 'Join the private beta and start building your digital presence.';
  }, [isLogin]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#030712] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(125,211,252,0.18),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#040816_0%,#06111f_48%,#020617_100%)]" />

        <motion.div
          className="absolute left-1/2 top-[72px] h-[210px] w-[210px] -translate-x-1/2 rounded-full border border-white/10"
          animate={{ rotate: 360, opacity: [0.18, 0.34, 0.18] }}
          transition={{
            rotate: { duration: 26, repeat: Infinity, ease: 'linear' },
            opacity: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          }}
        />

        <motion.div
          className="absolute left-1/2 top-[104px] h-[145px] w-[145px] -translate-x-1/2 rounded-full border border-cyan-200/10"
          animate={{ rotate: -360, opacity: [0.12, 0.3, 0.12] }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
            opacity: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
          }}
        />

        <motion.div
          className="absolute left-1/2 top-[38px] h-[310px] w-[310px] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.82, 0.45] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute bottom-[-145px] right-[-145px] h-[360px] w-[360px] rounded-full bg-blue-600/12 blur-3xl"
          animate={{ x: [0, -18, 0], y: [0, -10, 0], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:46px_46px] opacity-[0.17]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/35 to-transparent" />
      </div>

      <main className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-[370px] flex-col px-5 pb-4 pt-4">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="shrink-0 text-center"
        >
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10.5px] font-medium text-white/55 shadow-[0_16px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]"
              animate={{ scale: [1, 1.25, 1], opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            Private Beta Access
          </div>

          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
            className="mx-auto mt-4 flex h-[68px] w-[68px] items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.065] shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl"
          >
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Orbit className="h-8 w-8 text-white" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, letterSpacing: '-0.13em' }}
            animate={{ opacity: 1, letterSpacing: '-0.078em' }}
            transition={{ delay: 0.13, duration: 0.5, ease: 'easeOut' }}
            className="mt-4 text-[41px] font-semibold leading-none text-white"
          >
            FaceMeX
          </motion.h1>

          <p className="mx-auto mt-2 max-w-[280px] text-[12px] leading-relaxed text-white/43">
            Social identity. AI tools. Careers. Business growth.
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.42, ease: 'easeOut' }}
          className="mt-4 shrink-0 rounded-full border border-white/10 bg-black/18 p-1 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"
        >
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`relative h-9 overflow-hidden rounded-full text-[12.5px] font-semibold transition-all duration-300 ${
                isLogin ? 'text-slate-950' : 'text-white/42 hover:bg-white/[0.055] hover:text-white/85'
              }`}
            >
              {isLogin && (
                <motion.span
                  layoutId="facemex-auth-tab"
                  className="absolute inset-0 rounded-full bg-white shadow-[0_10px_28px_rgba(255,255,255,0.13)]"
                  transition={{ type: 'spring', stiffness: 430, damping: 36 }}
                />
              )}
              <span className="relative z-10">Sign in</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`relative h-9 overflow-hidden rounded-full text-[12.5px] font-semibold transition-all duration-300 ${
                !isLogin ? 'text-slate-950' : 'text-white/42 hover:bg-white/[0.055] hover:text-white/85'
              }`}
            >
              {!isLogin && (
                <motion.span
                  layoutId="facemex-auth-tab"
                  className="absolute inset-0 rounded-full bg-white shadow-[0_10px_28px_rgba(255,255,255,0.13)]"
                  transition={{ type: 'spring', stiffness: 430, damping: 36 }}
                />
              )}
              <span className="relative z-10">Create</span>
            </button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.45, ease: 'easeOut' }}
          className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.065] p-[1px] shadow-[0_26px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
        >
          <div className="relative flex h-full flex-col overflow-hidden rounded-[31px] bg-[#0a1020]/72">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.07] to-transparent" />

            <div className="relative shrink-0 px-5 pb-3 pt-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.28em] text-white/35">
                  Account
                </div>

                <motion.div
                  animate={{ y: [0, -2, 0], opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.055]"
                >
                  {isLogin ? (
                    <ShieldCheck className="h-4 w-4 text-cyan-100/70" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-cyan-100/70" />
                  )}
                </motion.div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isLogin ? 'welcome-back-copy' : 'create-copy'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <h2 className="text-[27px] font-semibold leading-tight tracking-[-0.055em] text-white">
                    {headline}
                  </h2>

                  <p className="mt-1.5 text-[12px] leading-relaxed text-white/43">
                    {subline}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div
              className="
                relative min-h-0 flex-1 overflow-hidden px-4 pb-4
                [&_form]:space-y-3
                [&_label]:text-[12px]
                [&_label]:font-semibold
                [&_label]:text-white/72
                [&_input]:h-11
                [&_input]:rounded-2xl
                [&_input]:border-white/10
                [&_input]:bg-white/[0.085]
                [&_input]:px-4
                [&_input]:text-[14px]
                [&_input]:text-white
                [&_input]:shadow-inner
                [&_input]:placeholder:text-white/30
                [&_input]:focus-visible:ring-1
                [&_input]:focus-visible:ring-cyan-200/30
                [&_input]:focus-visible:ring-offset-0
                [&_button[type='submit']]:mt-2
                [&_button[type='submit']]:h-11
                [&_button[type='submit']]:rounded-2xl
                [&_button[type='submit']]:bg-white
                [&_button[type='submit']]:text-[14px]
                [&_button[type='submit']]:font-semibold
                [&_button[type='submit']]:text-slate-950
                [&_button[type='submit']]:shadow-[0_16px_40px_rgba(255,255,255,0.10)]
                [&_button[type='submit']]:transition
                [&_button[type='submit']]:hover:bg-cyan-50
                [&_.bg-card]:border-0
                [&_.bg-card]:bg-transparent
                [&_.bg-card]:shadow-none
                [&_.rounded-3xl]:rounded-none
                [&_h1]:hidden
                [&_h2]:hidden
                [&_p]:text-white/42
              "
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isLogin ? 'login-form' : 'register-form'}
                  initial={{ opacity: 0, x: isLogin ? -14 : 14, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: isLogin ? 14 : -14, scale: 0.985 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="h-full"
                >
                  {isLogin ? <LoginForm /> : <RegisterForm />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48, duration: 0.4 }}
          className="mt-3 grid shrink-0 grid-cols-3 gap-2"
        >
          <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.035] px-2 py-2 text-[10px] text-white/38 backdrop-blur-xl">
            <MessageCircle className="h-3.5 w-3.5" />
            Chat
          </div>

          <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.035] px-2 py-2 text-[10px] text-white/38 backdrop-blur-xl">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            Careers
          </div>

          <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.035] px-2 py-2 text-[10px] text-white/38 backdrop-blur-xl">
            <ArrowRight className="h-3.5 w-3.5" />
            Grow
          </div>
        </motion.footer>
      </main>
    </div>
  );
}
