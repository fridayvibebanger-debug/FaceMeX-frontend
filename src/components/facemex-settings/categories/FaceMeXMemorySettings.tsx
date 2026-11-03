import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXMemorySettings({ settings, onSave, saving }: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Memory" description="Choose whether FaceMeX may use the goals you saved in Personalization to tailor AI responses.">
      <label className="flex min-h-[68px] items-center gap-4 rounded-xl border border-[#dedede] bg-white px-4 py-3 dark:border-[#333] dark:bg-[#171717]">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Use saved goals in AI conversations</span>
          <span className="mt-1 block text-xs text-[#777] dark:text-[#aaa]">
            Your goals remain saved in Personalization. Turning this off stops FaceMeX from using them to tailor replies.
          </span>
        </span>
        <input
          type="checkbox"
          checked={settings.memory.enabled}
          disabled={saving}
          onChange={(event) => void onSave({
            ...settings,
            memory: { enabled: event.target.checked },
          })}
          aria-label="Use saved goals in AI conversations"
          className="h-5 w-5 accent-black dark:accent-white"
        />
      </label>
      <p className="rounded-xl border border-[#dedede] bg-white p-4 text-sm text-[#666] dark:border-[#333] dark:bg-[#171717] dark:text-[#aaa]">
        FaceMeX does not automatically save conversation details. Review, update, or remove your goals in Personalization. Only goals you save there are used when this preference is on.
      </p>
    </FaceMeXSettingsLayout>
  );
}
