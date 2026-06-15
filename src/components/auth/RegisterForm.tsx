import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();

    const parts = trimmedName.split(/\s+/).filter(Boolean);

    if (parts.length < 2) {
      setError('Please enter your full name with at least two words, for example Lucky Mawasha.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      setIsLoading(true);

      await register(trimmedName, cleanEmail, password);

      navigate('/career-ai');
    } catch (error) {
      const code = (error as Error)?.message || '';

      if (code === 'supabase_not_configured') {
        setError(
          'Signup is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.'
        );
      } else if (code === 'email_in_use') {
        setError('That email is already in use. Try logging in instead.');
      } else if (code.startsWith('register_failed:')) {
        const msg = code.slice('register_failed:'.length).trim();
        setError(msg || 'Signup failed. Please try again.');
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-[0_0_60px_rgba(88,28,135,0.25)] backdrop-blur-2xl sm:p-7">
      <div className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Create account
        </div>

        <div className="text-sm leading-relaxed text-white/60 sm:text-base">
          Start your FaceMeX identity.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {error && (
          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-100">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-white/90">
            Full Name
          </Label>

          <Input
            id="name"
            type="text"
            placeholder="Lucky Mawasha"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="name"
            className="h-11 w-full overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/50"
          />
        </div>

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
            disabled={isLoading}
            autoComplete="email"
            className="h-11 w-full overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/90">
            Password
          </Label>

          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="new-password"
            className="h-11 w-full overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/50"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full overflow-hidden rounded-2xl bg-white text-slate-900 hover:bg-white/90 disabled:opacity-70"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </div>
  );
}
