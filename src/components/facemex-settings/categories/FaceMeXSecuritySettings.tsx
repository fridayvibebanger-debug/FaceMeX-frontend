import { LogOut } from 'lucide-react';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import FaceMeXSettingsCategoryLink from './FaceMeXSettingsCategoryLink';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXSecuritySettings({ user, onSignOut }: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Security and login" description="Manage access through your existing FaceMeX sign-in.">
      {user?.email && (
        <div className="rounded-2xl border border-[#e6e6e6] bg-[#f1f1f1] p-4 dark:border-[#393939] dark:bg-[#1d1d1d]">
          <p className="text-xs text-[#777] dark:text-[#aaa]">Signed in as</p>
          <p className="mt-1 text-sm font-medium">{user.email}</p>
        </div>
      )}
      <FaceMeXSettingsCategoryLink to="/trust" label="Review account trust and device information" />
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
