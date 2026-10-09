import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import FaceMeXSettingsCategoryLink from './FaceMeXSettingsCategoryLink';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXPrivacySettings(_: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Privacy center" description="Review how FaceMeX handles account and personal information.">
      <FaceMeXSettingsCategoryLink to="/privacy" label="Read the FaceMeX Privacy Policy" />
      <FaceMeXSettingsCategoryLink to="/profile" label="Review profile information" />
    </FaceMeXSettingsLayout>
  );
}
