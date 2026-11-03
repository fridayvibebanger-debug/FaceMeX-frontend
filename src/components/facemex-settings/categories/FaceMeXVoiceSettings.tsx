import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXVoiceSettings(_: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Voice" description="Use voice input and speech features in the FaceMeX workspace.">
      <p className="rounded-xl border border-[#dedede] bg-white p-4 text-sm text-[#666] dark:border-[#333] dark:bg-[#171717] dark:text-[#aaa]">
        Microphone access is managed in your browser. FaceMeX asks for access when you choose to use a voice feature.
      </p>
    </FaceMeXSettingsLayout>
  );
}
