import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXAccountSettings({ user, onSignOut }: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Account" description="Manage your FaceMeX account.">
      <div className="rounded-2xl border border-[#e6e6e6] bg-[#f1f1f1] p-4 dark:border-[#393939] dark:bg-[#1d1d1d]">
        {user?.name && <p className="text-sm font-semibold">{user.name}</p>}
        {user?.email && <p className="mt-1 text-sm text-[#777] dark:text-[#aaa]">{user.email}</p>}
        {!user?.name && !user?.email && <p className="text-sm text-[#777] dark:text-[#aaa]">Your profile details are unavailable.</p>}
      </div>
      <Link to="/profile" className="flex min-h-12 items-center justify-between rounded-xl border border-[#e6e6e6] bg-white px-4 text-sm font-medium dark:border-[#393939] dark:bg-[#202020]">
        View profile
      </Link>
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
