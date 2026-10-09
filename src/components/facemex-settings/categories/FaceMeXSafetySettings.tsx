import { Link } from 'react-router-dom';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import FaceMeXSettingsCategoryLink from './FaceMeXSettingsCategoryLink';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXSafetySettings(_: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Safety" description="Access FaceMeX safety resources and account trust information.">
      <FaceMeXSettingsCategoryLink to="/safety" label="Open Safety Center" />
      <FaceMeXSettingsCategoryLink to="/trust" label="Open Trust Dashboard" />
      <Link to="/community-rules" className="flex min-h-12 items-center rounded-xl border border-[#e6e6e6] bg-white px-4 text-sm font-medium dark:border-[#393939] dark:bg-[#202020]">
        Read Community Rules
      </Link>
    </FaceMeXSettingsLayout>
  );
}
