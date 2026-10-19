import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXMemorySettings({ settings, onSave, saving }: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Memory" description="Choose whether FaceMeX may use the goals you saved in Personalization to tailor AI responses.">
      <label className="flex min-h-[68px] items-center gap-4 rounded-2xl border border-[#e7e7e7] bg-[#f1f1f1] px-4 py-3 dark:border-[#343434] dark:bg-[#1d1d1d]">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Use saved goals in AI conversations</span>
          <span className="mt-1 block text-xs text-[#777] dark:text-[#aaa]">
            Your goals remain in your account settings. Turning this off stops adding them to AI request context.
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
      <p className="rounded-xl bg-[#f1f1f1] p-4 text-sm text-[#666] dark:bg-[#1d1d1d] dark:text-[#aaa]">
        FaceMeX does not automatically save conversation details. Review, update, or remove your goals in Personalization settings. Only goals you save there are included when this preference is on.
      </p>
    </FaceMeXSettingsLayout>
  );
}
