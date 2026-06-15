import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, MailCheck } from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getCleanEmail = () => email.trim().toLowerCase();

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);

    const cleanEmail = getCleanEmail();

    if (!validateEmail(cleanEmail)) {
      setError('Please enter your email address first, then tap Forgot Password.');
      return;
    }

    try {
      setResetLoading(true);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess('Password reset link sent. Please check your email inbox.');
    } catch (error) {
      const err = error as any;

      console.error('Password reset error:', err);

      const message =
        err?.message ||
        err?.error_description ||
        err?.details ||
        'Could not send password reset link. Please try again.';

      setError(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = getCleanEmail();

    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);

      await login(cleanEmail, password);

      const { error: supabaseError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (supabaseError) {
        setError(`Supabase login failed: ${supabaseError.message}`);
        return;
      }

      window.location.assign('/career-ai');
    } catch (error) {
      const code = (error as Error)?.message || '';

      if (code === 'supabase_not_configured') {
        setError(
          'Login is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.'
        );
      } else if (code === 'account_not_found') {
        setError('Account not found. Please check your email or sign up.');
      } else if (code === 'invalid_credentials') {
        setError('Incorrect password. Please try again.');
      } else if (code.startsWith('login_failed:')) {
        const msg = code.slice('login_failed:'.length).trim();
        setError(msg || 'Login failed. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-[0_0_60px_rgba(88,28,135,0.25)] backdrop-blur-2xl sm:p-7">
      <div className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Welcome back
        </div>

        <div className="text-sm leading-relaxed text-white/60 sm:text-base">
          Private access to your FaceMeX account.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {error && (
          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="flex gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-100">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/90">
            Email
          </Label>

          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading || resetLoading}
            autoComplete="email"
            className="h-11 w-full overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/45 focus-visible:ring-white/20"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/90">
            Password
          </Label>

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading || resetLoading}
              autoComplete="current-password"
              className="h-11 w-full overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-4 pr-12 text-white placeholder:text-white/45 focus-visible:ring-white/20"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading || resetLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 transition hover:text-white disabled:opacity-50"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isLoading || resetLoading}
            className="text-sm font-semibold text-white/80 transition hover:text-white disabled:opacity-60"
          >
            {resetLoading ? 'Sending reset link…' : 'Forgot Password?'}
          </button>
        </div>

        <Button
          type="submit"
          disabled={isLoading || resetLoading}
          className="h-11 w-full overflow-hidden rounded-2xl bg-white font-semibold text-slate-900 hover:bg-white/90 disabled:opacity-70"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-semibold text-white/50">OR</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="mt-5 text-center text-sm text-white/70">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="font-semibold text-white transition hover:text-white/80"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
