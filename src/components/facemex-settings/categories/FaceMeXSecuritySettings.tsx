import { useState } from 'react';
import { LogOut } from 'lucide-react';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export default function FaceMeXSecuritySettings({ user, onSignOut }: FaceMeXSettingsCategoryProps) {
  const [sendingReset, setSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [error, setError] = useState('');

  const sendPasswordReset = async () => {
    if (!user?.email) {
      setError('Add an email address to your account before requesting a password reset.');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Password reset is temporarily unavailable. Please try again later.');
      return;
    }
    setSendingReset(true);
    setError('');
    setResetMessage('');
    try {
      const redirectTo = new URL(`${import.meta.env.BASE_URL}reset-password`, window.location.origin).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });
      if (resetError) throw new Error(resetError.message);
      setResetMessage('If the address is registered, a password reset link will be sent.');
    } catch (cause) {
      console.error('Password reset request failed.', cause);
      setError('Could not send a password reset link. Please try again.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <FaceMeXSettingsLayout title="Security and login" description="Manage access through your existing FaceMeX sign-in.">
      {user?.email && (
        <div className="rounded-xl border border-[#dedede] bg-white p-4 dark:border-[#333] dark:bg-[#171717]">
          <p className="text-xs text-[#777] dark:text-[#aaa]">Signed in as</p>
          <p className="mt-1 text-sm font-medium">{user.email}</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => void sendPasswordReset()}
        disabled={sendingReset || !user?.email}
        className="flex min-h-10 w-full items-center rounded-lg border border-[#d6d6d6] bg-white px-4 text-left text-sm font-medium transition hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777] disabled:opacity-50 dark:border-[#444] dark:bg-[#202020] dark:hover:bg-[#282828] dark:focus-visible:outline-[#ccc]"
      >
        {sendingReset ? 'Sending reset link…' : 'Email me a password reset link'}
      </button>
      {resetMessage && <p role="status" className="text-sm text-green-700 dark:text-green-300">{resetMessage}</p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <button
        type="button"
        onClick={onSignOut}
        className="flex min-h-10 w-full items-center gap-3 rounded-lg border border-[#e1b4b1] bg-white px-4 text-left text-sm font-medium text-[#b42318] transition hover:bg-[#fff5f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777] dark:border-[#663b3b] dark:bg-[#202020] dark:text-[#fca5a5] dark:hover:bg-[#292020] dark:focus-visible:outline-[#ccc]"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </FaceMeXSettingsLayout>
  );
}
