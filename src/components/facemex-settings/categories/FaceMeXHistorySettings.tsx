import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import FaceMeXSettingsCategoryLink from './FaceMeXSettingsCategoryLink';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXHistorySettings(_: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="History and data" description="Your conversations and project data remain in the existing FaceMeX workspace.">
      <p className="text-sm text-[#707070] dark:text-[#aaa]">
        History actions are available in the workspace. This settings page does not delete or move conversation data.
      </p>
      <FaceMeXSettingsCategoryLink to="/ai/job-assistant" label="Open workspace history" />
    </FaceMeXSettingsLayout>
  );
}
