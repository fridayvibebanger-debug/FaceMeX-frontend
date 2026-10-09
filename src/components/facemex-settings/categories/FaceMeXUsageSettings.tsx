import { Link } from 'react-router-dom';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXUsageSettings({ plan }: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Usage and limits" description="Review your current FaceMeX plan and its available features.">
      {plan && (
        <div className="rounded-2xl border border-[#e6e6e6] bg-[#f1f1f1] p-4 dark:border-[#393939] dark:bg-[#1d1d1d]">
          <p className="text-xs text-[#777] dark:text-[#aaa]">Current plan</p>
          <p className="mt-1 text-sm font-semibold capitalize">{plan}</p>
        </div>
      )}
      <p className="text-sm text-[#707070] dark:text-[#aaa]">A live usage breakdown is not currently available for this account.</p>
      <Link to="/facemex-plus" className="flex min-h-12 items-center rounded-xl border border-[#e6e6e6] bg-white px-4 text-sm font-medium dark:border-[#393939] dark:bg-[#202020]">
        View FaceMeX plans
      </Link>
    </FaceMeXSettingsLayout>
  );
}
