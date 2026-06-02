import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

type AuthMode = 'login' | 'register';

function getFriendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (message.includes('invalid_credentials')) {
    return 'Incorrect email or password.';
  }

  if (message.includes('account_not_found')) {
    return 'Account not found. Please sign up first.';
  }

  if (message.includes('email_in_use')) {
    return 'This email is already registered. Please sign in.';
  }

  if (message.includes('supabase_not_configured')) {
    return 'Authentication is not configured yet.';
  }

  if (message.includes('register_failed')) {
    return 'Could not create your account. Please try again.';
  }

  if (message.includes('login_failed')) {
    return 'Could not sign you in. Please try again.';
  }

  return 'Something went wrong. Please try again.';
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  const navigate = useNavigate();
  const { isAuthenticated, login, register } = useAuthStore();

  const isLogin = mode === 'login';

  const title = useMemo(() => (isLogin ? 'Sign In' : 'Sign Up'), [isLogin]);

  const subtitle = useMemo(
    () =>
      isLogin
        ? 'Please enter your details to sign in.'
        : 'Create your account to start using FaceMeX.',
    [isLogin]
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/feed', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorText('');
    setShowPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    setErrorText('');

    if (!cleanEmail || !cleanPassword) {
      setErrorText('Please enter your email and password.');
      return;
    }

    if (!isLogin && !cleanName) {
      setErrorText('Please enter your name.');
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorText('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);

      if (isLogin) {
        await login(cleanEmail, cleanPassword);
      } else {
        await register(cleanName, cleanEmail, cleanPassword);
      }

      navigate('/feed', { replace: true });
    } catch (error) {
      setErrorText(getFriendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#020204] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_27%,rgba(255,255,255,0.105),transparent_24%),linear-gradient(180deg,#020204_0%,#07070a_48%,#020204_100%)]" />

        <motion.div
          className="absolute left-1/2 top-[-170px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/[0.055] blur-[95px]"
          animate={{
            opacity: [0.22, 0.55, 0.22],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute left-[58%] top-[-80px] h-[560px] w-[145px] -rotate-[28deg] rounded-full bg-white/[0.075] blur-[46px]"
          animate={{
            opacity: [0.14, 0.32, 0.14],
            x: [0, 14, 0],
            y: [0, 10, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute bottom-[-210px] right-[-180px] h-[460px] w-[460px] rounded-full bg-slate-400/[0.045] blur-[95px]"
          animate={{
            opacity: [0.12, 0.28, 0.12],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.22)_48%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-0 opacity-[0.075] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:58px_58px]" />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center px-5 py-8">
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.52, ease: 'easeOut' }}
          className="relative w-full max-w-[390px]"
        >
          <div className="absolute -inset-px rounded-[36px] bg-gradient-to-b from-white/20 via-white/[0.04] to-white/[0.025]" />

          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.078] px-6 pb-6 pt-7 shadow-[0_32px_110px_rgba(0,0,0,0.76)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

            <div className="relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.35 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_18px_44px_rgba(0,0,0,0.48)]"
              >
                <span className="text-[18px] font-black tracking-[-0.08em] text-white">
                  FaceMeX
                </span>
              </motion.div>

              <motion.h1
                key={title}
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.32 }}
                className="mt-5 text-[25px] font-semibold leading-none tracking-[-0.035em] text-white"
              >
                {title}
              </motion.h1>

              <motion.p
                key={subtitle}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.3 }}
                className="mx-auto mt-2 max-w-[270px] text-[12px] leading-relaxed text-white/45"
              >
                {subtitle}
              </motion.p>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10 mt-7 space-y-4">
              <AnimatePresence mode="wait" initial={false}>
                {!isLogin && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter your full name"
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.105] px-4 text-[13px] font-medium text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] placeholder:text-white/30 focus:border-white/22 focus:bg-white/[0.13]"
                      autoComplete="name"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.105] px-4 text-[13px] font-medium text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] placeholder:text-white/30 focus:border-white/22 focus:bg-white/[0.13]"
                autoComplete="email"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.105] px-4 pr-12 text-[13px] font-medium text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] placeholder:text-white/30 focus:border-white/22 focus:bg-white/[0.13]"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/38 hover:bg-white/10 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => alert('Password reset screen is not connected yet.')}
                    className="text-[11.5px] font-medium text-white/42 hover:text-white"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <AnimatePresence>
                {errorText && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-center text-[12px] font-medium text-red-100">
                      {errorText}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 flex h-12 w-full items-center justify-center rounded-2xl bg-white text-[13px] font-bold text-black shadow-[0_18px_44px_rgba(255,255,255,0.12)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLogin ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <div className="relative z-10 mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] font-medium text-white/28">OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="relative z-10 mt-5 text-center text-[12px] text-white/42">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
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
                    onClick={() => switchMode('login')}
                    className="font-semibold text-white hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
