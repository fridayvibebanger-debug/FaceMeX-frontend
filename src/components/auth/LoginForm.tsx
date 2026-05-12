import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

await login(cleanEmail, password);

const { error: supabaseError } = await supabase.auth.signInWithPassword({
  email: cleanEmail,
  password,
});

if (supabaseError) {
  setError(`Supabase login failed: ${supabaseError.message}`);
  setIsLoading(false);
  return;
}

window.location.assign('/feed');
    } catch (error) {
      const code = (error as Error).message;
      if (code === 'supabase_not_configured') {
        setError('Login is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.');
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
  <div className="w-full max-w-[380px] mx-auto rounded-[2rem] border border-white/10 bg-white/[0.08] backdrop-blur-2xl shadow-[0_0_60px_rgba(88,28,135,0.25)] p-6 sm:p-7 overflow-hidden">
    <div className="space-y-1">
      <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
        Welcome back
      </div>
      <div className="text-sm sm:text-base text-white/60 leading-relaxed">
        Private access to your FaceMeX account.
      </div>
    </div>

    <form onSubmit={handleSubmit} className="space-y-4 mt-5">
      {error && <p className="text-sm text-red-200">{error}</p>}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-white/90">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="w-full h-11 rounded-2xl bg-white/10 border border-white/15 text-white placeholder:text-white/50 px-4 overflow-hidden"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-white/90">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className="w-full h-11 rounded-2xl bg-white/10 border border-white/15 text-white placeholder:text-white/50 px-4 overflow-hidden"
        />
      </div>

      <Button
        type="submit"
        className="w-full h-11 rounded-2xl bg-white text-slate-900 hover:bg-white/90"
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  </div>
);
}
