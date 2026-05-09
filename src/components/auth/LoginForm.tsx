import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setError('No user returned.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('faceme_user_id', data.user.id);
      localStorage.setItem(
        'faceme_user_name',
        data.user.email?.split('@')[0] || 'User'
      );

      window.location.href = '/feed';
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl p-5 sm:p-6">
      <div className="space-y-1">
        <div className="text-xl sm:text-2xl font-semibold text-white">Welcome back</div>
        <div className="text-sm text-white/80">Connect with friends &amp; family</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mt-5">
        {error && <p className="text-sm text-red-200">{error}</p>}

        <div className="space-y-1.5">
          <Label className="text-white/90">Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="h-11 rounded-2xl bg-white/10 border-white/15 text-white"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/90">Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="h-11 rounded-2xl bg-white/10 border-white/15 text-white"
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-2xl bg-white text-slate-900">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Signing in…' : 'Login'}
        </Button>
      </form>
    </div>
  );
}
