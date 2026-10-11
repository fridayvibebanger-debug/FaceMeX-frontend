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
      setError('There is no email address available for this account.');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Password reset is unavailable because the account service is not configured.');
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
      setError(cause instanceof Error ? cause.message : 'Could not request a password reset. Please try again.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <FaceMeXSettingsLayout title="Security and login" description="Manage access through your existing FaceMeX sign-in.">
      {user?.email && (
        <div className="rounded-2xl border border-[#e6e6e6] bg-[#f1f1f1] p-4 dark:border-[#393939] dark:bg-[#1d1d1d]">
          <p className="text-xs text-[#777] dark:text-[#aaa]">Signed in as</p>
          <p className="mt-1 text-sm font-medium">{user.email}</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => void sendPasswordReset()}
        disabled={sendingReset || !user?.email}
        className="flex min-h-12 w-full items-center rounded-xl border border-[#e6e6e6] bg-white px-4 text-left text-sm font-medium disabled:opacity-50 dark:border-[#393939] dark:bg-[#202020]"
      >
        {sendingReset ? 'Sending reset link…' : 'Email me a password reset link'}
      </button>
      {resetMessage && <p role="status" className="text-sm text-green-700 dark:text-green-300">{resetMessage}</p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <p className="text-sm text-[#707070] dark:text-[#aaa]">
        Multi-factor authentication, active-session listings, and sign-out-all-devices are not currently available in this settings interface.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white px-4 text-left text-sm font-medium text-[#a33] dark:border-[#393939] dark:bg-[#202020] dark:text-[#ff9d9d]"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </FaceMeXSettingsLayout>
  );
}
