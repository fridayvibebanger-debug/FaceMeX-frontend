import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      setError('Please enter your full name with at least two words (e.g. "Lucky Mawasha").');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await register(trimmedName, email.trim(), password);
      navigate('/feed');
    } catch (error) {
      const code = (error as Error).message;
      if (code === 'supabase_not_configured') {
        setError('Signup is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.');
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
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl p-5 sm:p-6">
      <div className="space-y-1">
        <div className="text-xl sm:text-2xl font-semibold text-white">Create an account</div>
        <div className="text-sm text-white/80">Sign up with your email</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mt-5">
        {error && <p className="text-sm text-red-200">{error}</p>}

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-white/90">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
            className="h-11 rounded-2xl bg-white/10 border-white/15 text-white placeholder:text-white/50"
          />
        </div>

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
            className="h-11 rounded-2xl bg-white/10 border-white/15 text-white placeholder:text-white/50"
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
            className="h-11 rounded-2xl bg-white/10 border-white/15 text-white placeholder:text-white/50"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-11 rounded-2xl bg-white text-slate-900 hover:bg-white/90"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </div>
  );
}