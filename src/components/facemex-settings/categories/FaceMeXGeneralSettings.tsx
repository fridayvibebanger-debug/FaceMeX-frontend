import { Check } from 'lucide-react';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

const languages = [
  ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'],
  ['pt', 'Portuguese'], ['ar', 'Arabic'], ['hi', 'Hindi'], ['sw', 'Swahili'], ['zu', 'Zulu'],
];

export default function FaceMeXGeneralSettings({ settings, onSave, saving }: FaceMeXSettingsCategoryProps) {
  const update = (general: typeof settings.general) => onSave({ ...settings, general });
  const accentOptions = [
    { color: 'blue', label: 'Blue', value: '221 83% 53%' },
    { color: 'violet', label: 'Violet', value: '262 83% 58%' },
    { color: 'green', label: 'Green', value: '142 71% 45%' },
    { color: 'amber', label: 'Amber', value: '38 92% 50%' },
  ] as const;

  return (
    <FaceMeXSettingsLayout title="General" description="Choose an accent color and the language used by AI Translator.">
      <section>
        <h3 className="mb-3 text-sm font-medium">Accent color</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {accentOptions.map(({ color, label, value }) => {
            const selected = settings.general.accentColor === color;
            return (
              <button
                key={color}
                type="button"
                disabled={saving}
                aria-pressed={selected}
                onClick={() => void update({ ...settings.general, accentColor: color })}
                className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777] disabled:opacity-50 dark:focus-visible:outline-[#ccc] ${selected
                  ? 'border-[#999] bg-[#f1f1f1] dark:border-[#666] dark:bg-[#292929]'
                  : 'border-[#e8e8e8] bg-white hover:bg-[#f5f5f5] dark:border-[#414141] dark:bg-[#1d1d1d]'}`}
              >
                <span aria-hidden="true" className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${value})` }} />
                {label}
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
