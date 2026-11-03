import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import FaceMeXSettingsCategoryLink from './FaceMeXSettingsCategoryLink';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXStorageSettings(_: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Storage" description="Find your saved files in the projects and conversations where you added them.">
      <FaceMeXSettingsCategoryLink to="/ai/job-assistant" label="Open workspace files" />
    </FaceMeXSettingsLayout>
  );
}
