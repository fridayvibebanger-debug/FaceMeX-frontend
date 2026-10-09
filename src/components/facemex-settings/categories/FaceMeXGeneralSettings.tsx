import { Check, Moon, Sun } from 'lucide-react';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

const languages = [
  ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'],
  ['pt', 'Portuguese'], ['ar', 'Arabic'], ['hi', 'Hindi'], ['sw', 'Swahili'], ['zu', 'Zulu'],
];

export default function FaceMeXGeneralSettings({ settings, onSave, saving }: FaceMeXSettingsCategoryProps) {
  const update = (general: typeof settings.general) => onSave({ ...settings, general });
  return (
    <FaceMeXSettingsLayout title="General" description="Adjust how FaceMeX looks and the language used by AI Translator.">
      <section>
        <h3 className="mb-3 text-sm font-medium">Appearance</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['light', 'dark'] as const).map((mode) => {
            const selected = settings.general.appearance === mode;
            const Icon = mode === 'light' ? Sun : Moon;
            return (
              <button
                key={mode}
                type="button"
                disabled={saving}
                aria-pressed={selected}
                onClick={() => void update({ ...settings.general, appearance: mode })}
                className={`flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left transition disabled:opacity-50 ${selected
                  ? 'border-[#d6d6d6] bg-[#f1f1f1] dark:border-[#414141] dark:bg-[#292929]'
                  : 'border-[#e8e8e8] bg-white hover:bg-[#f5f5f5] dark:border-[#414141] dark:bg-[#1d1d1d]'}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{mode === 'light' ? 'Light' : 'Dark'}</span>
                {selected && <Check className="ml-auto h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </section>
      <label className="block max-w-sm space-y-2 text-sm font-medium">
        Primary language for AI Translator
        <select
          value={settings.general.primaryLanguage}
          disabled={saving}
          onChange={(event) => void update({ ...settings.general, primaryLanguage: event.target.value })}
          className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3 text-sm font-normal disabled:opacity-50 dark:border-[#414141] dark:bg-[#202020]"
        >
          {languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </FaceMeXSettingsLayout>
  );
}
