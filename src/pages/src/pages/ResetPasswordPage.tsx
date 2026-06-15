import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const prepareResetSession = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          toast({
            title: 'Reset link expired',
            description: 'Please request a new password reset link.',
            variant: 'destructive',
          });

          navigate('/signin');
          return;
        }
      } catch (error: any) {
        toast({
          title: 'Invalid reset link',
          description: error?.message || 'Please request a new password reset link.',
          variant: 'destructive',
        });

        navigate('/signin');
      } finally {
        setCheckingSession(false);
      }
    };

    prepareResetSession();
  }, [navigate]);

  const handleUpdatePassword = async () => {
    const newPassword = password.trim();
    const confirm = confirmPassword.trim();

    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Your password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirm) {
      toast({
        title: 'Passwords do not match',
        description: 'Please type the same password again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setBusy(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
      });

      await supabase.auth.signOut();
      navigate('/signin');
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not update password. Try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Checking reset link...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-black">
          <Lock className="h-7 w-7" />
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 text-sm text-white/60">
            Enter your new password below.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="h-14 rounded-2xl border-white/10 bg-white/10 pr-12 text-white placeholder:text-white/40"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70"
              aria-label="Show password"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <Input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="h-14 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/40"
          />

          <Button
            onClick={handleUpdatePassword}
            disabled={busy}
            className="h-14 w-full rounded-2xl bg-white text-base font-semibold text-black hover:bg-white/90"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="w-full text-center text-sm font-semibold text-white/70 hover:text-white"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
