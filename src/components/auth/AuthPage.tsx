import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, MailCheck } from 'lucide-react';

import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { getAuthenticatedReturnTo } from '@/lib/authReturnTo';

type AuthMode = 'login' | 'register';

const AUTH_WELCOME_MESSAGES = [
  'Welcome back to FaceMeX.',
  'Good to see you again.',
  'Ready for your next move?',
  "Let's make today count.",
];

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function AuthPage() {
  const { pathname, search, hash } = useLocation();
  const [mode, setMode] = useState<AuthMode>(() => pathname === '/signup' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [welcomeIndex, setWelcomeIndex] = useState(0);

  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  const navigate = useNavigate();
  const { isAuthenticated, login, register } = useAuthStore();
  const prefersReducedMotion = useReducedMotion();

  const isLogin = mode === 'login';

  const title = useMemo(() => (isLogin ? 'Welcome back' : 'Create your account'), [isLogin]);

  const subtitle = useMemo(
    () =>
      isLogin
        ? 'Sign in to continue to your FaceMeX workspace.'
        : 'Join FaceMeX and make your next move.',
    [isLogin]
  );

  useEffect(() => {
    if (!isLogin) return;

    const timer = window.setInterval(() => {
      setWelcomeIndex((index) => (index + 1) % AUTH_WELCOME_MESSAGES.length);
    }, 11200);

    return () => window.clearInterval(timer);
  }, [isLogin]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getAuthenticatedReturnTo(search, `${pathname}${search}${hash}`), { replace: true });
    }
  }, [hash, isAuthenticated, navigate, pathname, search]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setWelcomeIndex(0);
    setErrorText('');
    setSuccessText('');
    setShowPassword(false);
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    setErrorText('');
    setSuccessText('');

    if (!cleanEmail) {
      setErrorText('Please enter your email address first.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorText('Please enter a valid email address first.');
      return;
    }

    try {
      setResettingPassword(true);

      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccessText('Password reset link sent. Please check your email inbox.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';

      setErrorText(message || 'Could not send password reset link. Please try again.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    setErrorText('');
    setSuccessText('');

    if (!cleanEmail || !cleanPassword) {
      setErrorText('Please enter your email and password.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorText('Please enter a valid email address.');
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

      /*
        Do not navigate here.
        The useEffect above already redirects when isAuthenticated becomes true.
        This avoids double navigation and makes login feel faster.
      */
    } catch (error) {
      setErrorText(getFriendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100svh] w-full overflow-x-hidden bg-[#070708] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.075),transparent_42%),linear-gradient(180deg,#0b0b0c_0%,#070708_55%,#050506_100%)]" />
        <div className="absolute left-1/2 top-[-260px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/[0.035] blur-[90px]" />
      </div>

      <main className="relative z-10 flex min-h-[100svh] w-full items-center justify-center px-4 py-8 sm:px-6">
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-[420px]"
        >
          <div className="absolute -inset-px rounded-[30px] bg-gradient-to-b from-white/[0.16] via-white/[0.035] to-white/[0.02]" />

          <div className="relative overflow-hidden rounded-[30px] border border-white/[0.15] bg-[#111112]/95 px-6 pb-7 pt-7 shadow-[0_24px_80px_rgba(0,0,0,0.62)] backdrop-blur-xl sm:px-8 sm:pb-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.075),transparent_38%)]" />

            <div className="relative z-10 text-center">
              <motion.img
                src="/facemex-logo.png"
                alt="FaceMeX"
                width="36"
                height="36"
                style={{ filter: 'brightness(0) invert(1)' }}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 3 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : 0.03, duration: prefersReducedMotion ? 0 : 0.16 }}
                className="mx-auto h-9 w-9 object-contain"
              />

              <motion.h1
                key={title}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.12 }}
                className="mx-auto mt-5 flex min-h-[68px] max-w-[330px] items-center justify-center text-center text-[27px] font-semibold leading-tight tracking-[-0.035em] text-white sm:min-h-[72px] sm:text-[29px]"
              >
                {isLogin ? (
                  <span key={welcomeIndex} className="fm-welcome-message">
                    {AUTH_WELCOME_MESSAGES[welcomeIndex]}
                  </span>
                ) : (
                  title
                )}
              </motion.h1>

              <motion.p
                key={subtitle}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.12 }}
                className="mx-auto mt-2 max-w-[320px] text-sm leading-relaxed text-white/55"
              >
                {subtitle}
              </motion.p>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10 mt-6 space-y-5">
              <AnimatePresence mode="wait" initial={false}>
                {!isLogin && (
                  <motion.div
                    key="name-field"
                    initial={prefersReducedMotion ? false : { opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0, y: -4 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.12, ease: 'easeOut' }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label htmlFor="auth-name" className="block text-[13px] font-medium text-white/75">
                      Full name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter your full name"
                      className="h-12 w-full rounded-xl border border-white/[0.14] bg-white/[0.055] px-4 text-sm font-medium text-white outline-none transition-colors duration-200 placeholder:text-white/45 hover:border-white/[0.24] focus:border-white/35 focus:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-white/10"
                      autoComplete="name"
                      required
                      disabled={submitting || resettingPassword}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label htmlFor="auth-email" className="block text-[13px] font-medium text-white/75">
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="h-12 w-full rounded-xl border border-white/[0.14] bg-white/[0.055] px-4 text-sm font-medium text-white outline-none transition-colors duration-200 placeholder:text-white/45 hover:border-white/[0.24] focus:border-white/35 focus:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-white/10"
                  autoComplete="email"
                  required
                  disabled={submitting || resettingPassword}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="auth-password" className="block text-[13px] font-medium text-white/75">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-white/[0.14] bg-white/[0.055] px-4 pr-12 text-sm font-medium text-white outline-none transition-colors duration-200 placeholder:text-white/45 hover:border-white/[0.24] focus:border-white/35 focus:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-white/10"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                    disabled={submitting || resettingPassword}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={submitting || resettingPassword}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 disabled:opacity-50"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={submitting || resettingPassword}
                    className="rounded-md px-1.5 py-1 text-[13px] font-medium text-white/60 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resettingPassword ? 'Sending reset link...' : 'Forgot Password?'}
                  </button>
                </div>
              )}

              <AnimatePresence>
                {successText && (
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -3, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -3, height: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.12 }}
                    className="overflow-hidden"
                  >
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-center text-sm font-medium text-emerald-100"
                    >
                      <MailCheck className="h-4 w-4 shrink-0" />
                      <span>{successText}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {errorText && (
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -3, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -3, height: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.12 }}
                    className="overflow-hidden"
                  >
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-center text-sm font-medium text-red-100"
                    >
                      {errorText}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={submitting || resettingPassword}
                className="mt-1 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black shadow-[0_8px_24px_rgba(255,255,255,0.08)] transition-colors duration-200 hover:bg-white/90 active:bg-white/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>{isLogin ? 'Signing in…' : 'Creating account…'}</span>
                  </>
                ) : isLogin ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <div className="relative z-10 mt-6 border-t border-white/[0.1] pt-5 text-center text-[13px] text-white/60">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="rounded-sm font-semibold text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
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
                    className="rounded-sm font-semibold text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
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