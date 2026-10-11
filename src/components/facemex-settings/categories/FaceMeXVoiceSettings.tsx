import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXVoiceSettings(_: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Voice" description="FaceMeX does not currently offer account-level voice preferences.">
      <p className="rounded-xl bg-[#f1f1f1] p-4 text-sm text-[#666] dark:bg-[#1d1d1d] dark:text-[#aaa]">
        Voice input and speech features depend on the specific FaceMeX tool and browser support. Microphone access is controlled by your browser and should only be requested when you activate a voice feature. There is no FaceMeX voice selection or playback-speed setting at this time.
      </p>
    </FaceMeXSettingsLayout>
  );
}
