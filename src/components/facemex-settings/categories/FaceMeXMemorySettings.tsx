import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXMemorySettings({ settings, onSave, saving }: FaceMeXSettingsCategoryProps) {
  return (
    <FaceMeXSettingsLayout title="Memory" description="Manage your FaceMeX memory preference.">
      <label className="flex min-h-[68px] items-center gap-4 rounded-2xl border border-[#e7e7e7] bg-[#f1f1f1] px-4 py-3 dark:border-[#343434] dark:bg-[#1d1d1d]">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Memory preference</span>
          <span className="mt-1 block text-xs text-[#777] dark:text-[#aaa]">
            Save whether you want memory enabled when FaceMeX memory becomes available.
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
          aria-label="Enable memory preference"
          className="h-5 w-5 accent-black dark:accent-white"
        />
      </label>
      <p className="rounded-xl bg-[#f1f1f1] p-4 text-sm text-[#666] dark:bg-[#1d1d1d] dark:text-[#aaa]">
        FaceMeX does not currently provide an AI memory store. This preference is saved to your account, but it does not change how the AI responds or create saved memories.
      </p>
    </FaceMeXSettingsLayout>
  );
}
