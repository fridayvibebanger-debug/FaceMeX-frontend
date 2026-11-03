import { Link } from 'react-router-dom';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXUsageSettings({ plan }: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Usage and limits" description="Review your current FaceMeX plan and choose an option that fits your needs.">
      {plan && (
        <div className="rounded-xl border border-[#dedede] bg-white p-4 dark:border-[#333] dark:bg-[#171717]">
          <p className="text-xs text-[#777] dark:text-[#aaa]">Current plan</p>
          <p className="mt-1 text-sm font-semibold capitalize">{plan}</p>
        </div>
      )}
      <p className="text-sm text-[#6b6b6b] dark:text-[#aaa]">Your plan determines which FaceMeX features are available to you.</p>
      <Link to="/facemex-plus" className="flex min-h-10 items-center rounded-lg border border-[#d6d6d6] bg-white px-4 text-sm font-medium transition hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777] dark:border-[#444] dark:bg-[#202020] dark:hover:bg-[#282828] dark:focus-visible:outline-[#ccc]">
        View FaceMeX plans
      </Link>
    </FaceMeXSettingsLayout>
  );
}
