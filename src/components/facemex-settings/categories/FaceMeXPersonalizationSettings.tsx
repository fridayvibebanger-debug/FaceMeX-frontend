import { useEffect, useState } from 'react';
import { Check, Save } from 'lucide-react';
import FaceMeXSettingsLayout from '../FaceMeXSettingsLayout';
import type { FaceMeXSettingsCategoryProps } from '../FaceMeXSettingsCategoryProps';

export default function FaceMeXPersonalizationSettings({ settings, onSave, saving, saved }: FaceMeXSettingsCategoryProps) {
  const [draft, setDraft] = useState(settings.personalization);
  const [dirty, setDirty] = useState(false);
  useEffect(() => setDraft(settings.personalization), [settings.personalization]);
  const update = (field: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };
  const saveDraft = async () => {
    const didSave = await onSave({ ...settings, personalization: draft });
    if (didSave) setDirty(false);
  };

  return (
    <FaceMeXSettingsLayout title="Personalization" description="Give FaceMeX useful context about your goals and response preferences.">
      <label className="block space-y-2 text-sm font-medium">
        I’m setting up FaceMeX for
        <select
          value={draft.audience}
          onChange={(event) => update('audience', event.target.value)}
          disabled={saving}
          className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3 text-sm font-normal disabled:opacity-50 dark:border-[#414141] dark:bg-[#202020]"
        >
          <option value="individual">Myself</option>
          <option value="organization">Company / team</option>
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium">
        {draft.audience === 'organization' ? 'Company or team name' : 'What should FaceMeX call you?'}
        <input
          value={draft.name}
          onChange={(event) => update('name', event.target.value)}
          disabled={saving}
          placeholder={draft.audience === 'organization' ? 'Company or team' : 'Your name'}
          className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3 text-sm font-normal disabled:opacity-50 dark:border-[#414141] dark:bg-[#202020]"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        Work, study, or role
        <input
          value={draft.role}
          onChange={(event) => update('role', event.target.value)}
          disabled={saving}
          placeholder="e.g. Student, designer"
          className="h-11 w-full rounded-xl border border-[#dedede] bg-white px-3 text-sm font-normal disabled:opacity-50 dark:border-[#414141] dark:bg-[#202020]"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        What are you working toward?
        <textarea
          value={draft.goals}
          onChange={(event) => update('goals', event.target.value)}
          disabled={saving}
          rows={3}
          placeholder="Goals, projects, or challenges"
          className="w-full resize-y rounded-xl border border-[#dedede] bg-white px-3 py-2.5 text-sm font-normal disabled:opacity-50 dark:border-[#414141] dark:bg-[#202020]"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        How should FaceMeX respond?
        <textarea
          value={draft.preferences}
          onChange={(event) => update('preferences', event.target.value)}
          disabled={saving}
          rows={3}
          placeholder="Tone, level of detail, format, or other preferences"
          className="w-full resize-y rounded-xl border border-[#dedede] bg-white px-3 py-2.5 text-sm font-normal disabled:opacity-50 dark:border-[#414141] dark:bg-[#202020]"
        />
      </label>
      <button
        type="button"
        onClick={() => void saveDraft()}
        disabled={saving}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d6d6d6] bg-white px-4 text-sm font-medium disabled:opacity-50 dark:border-[#414141] dark:bg-[#202020]"
      >
        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saving ? 'Saving…' : saved && !dirty ? 'Saved' : 'Save personalization'}
      </button>
    </FaceMeXSettingsLayout>
  );
}
