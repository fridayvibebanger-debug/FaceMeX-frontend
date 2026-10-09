import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import FaceMeXSettingsCategoryLink from './FaceMeXSettingsCategoryLink';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXStorageSettings(_: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Storage" description="FaceMeX files are kept with their existing projects and conversations.">
      <p className="text-sm text-[#707070] dark:text-[#aaa]">
        A separate storage quota or usage breakdown is not available here.
      </p>
      <FaceMeXSettingsCategoryLink to="/ai/job-assistant" label="Open workspace files" />
    </FaceMeXSettingsLayout>
  );
}
